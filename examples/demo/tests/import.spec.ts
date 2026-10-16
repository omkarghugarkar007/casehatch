import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const csv = "name,email\nAlex,alex@example.test\nSam,sam@example.test\n";
const headers = (tenant: string, key = randomUUID()) => ({
  "x-tenant": tenant,
  "idempotency-key": key,
  "content-type": "text/csv",
});
// This pre-existing happy path passes in both fixed and deliberately buggy modes.
test("existing import happy path", async ({ request }) => {
  const response = await request.post("/imports", {
    headers: headers(randomUUID()),
    data: csv,
  });
  expect(response.status()).toBe(201);
});
test(
  "valid import creates the expected rows",
  { tag: "@casehatch:CH-CSV-001" },
  async ({ request }) => {
    const tenant = randomUUID();
    const response = await request.post("/imports", {
      headers: headers(tenant),
      data: csv,
    });
    await test.step("casehatch:CH-CSV-001:rows", async () => {
      expect(response.status()).toBe(201);
      expect((await response.json()).id).toEqual(expect.any(String));
      expect(
        await (
          await request.get("/customers", { headers: headers(tenant) })
        ).json(),
      ).toEqual({
        jobs: 1,
        rows: [
          { name: "Alex", email: "alex@example.test" },
          { name: "Sam", email: "sam@example.test" },
        ],
      });
    });
  },
);
test(
  "new-key duplicate content returns the original job",
  { tag: "@casehatch:CH-CSV-002" },
  async ({ request }) => {
    const tenant = randomUUID();
    const first = await request.post("/imports", {
      headers: headers(tenant),
      data: csv,
    });
    const duplicate = await request.post("/imports", {
      headers: headers(tenant),
      data: csv,
    });
    await test.step("casehatch:CH-CSV-002:identity", async () => {
      expect(first.status()).toBe(201);
      expect(duplicate.status()).toBe(409);
      expect((await duplicate.json()).id).toBe((await first.json()).id);
      expect(
        (
          await (
            await request.get("/customers", { headers: headers(tenant) })
          ).json()
        ).jobs,
      ).toBe(1);
    });
  },
);
test(
  "same-key retry reuses the existing import after a lost response",
  { tag: "@casehatch:CH-CSV-003" },
  async ({ request }) => {
    const tenant = randomUUID();
    const h = headers(tenant);
    // The client disregards the initial response, modeling an uncertain/lost response.
    const initial = await request.post("/imports", { headers: h, data: csv });
    const retry = await request.post("/imports", { headers: h, data: csv });
    await test.step("casehatch:CH-CSV-003:identity", async () => {
      expect(initial.status()).toBe(201);
      expect(retry.status()).toBe(200);
      expect((await retry.json()).id).toBe((await initial.json()).id);
      const state = await (
        await request.get("/customers", { headers: headers(tenant) })
      ).json();
      expect(state.jobs).toBe(1);
      expect(state.rows).toHaveLength(2);
    });
  },
);
test(
  "invalid row rejects the entire batch",
  { tag: "@casehatch:CH-CSV-004" },
  async ({ request }) => {
    const tenant = randomUUID();
    const response = await request.post("/imports", {
      headers: headers(tenant),
      data: csv + "Broken,no-email\n",
    });
    await test.step("casehatch:CH-CSV-004:atomic", async () => {
      expect(response.status()).toBe(422);
      expect((await response.json()).errors).toEqual([
        { row: 4, error: "invalid name/email" },
      ]);
      expect(
        await (
          await request.get("/customers", { headers: headers(tenant) })
        ).json(),
      ).toEqual({ jobs: 0, rows: [] });
    });
  },
);
test(
  "another tenant cannot read a job",
  { tag: "@casehatch:CH-CSV-005" },
  async ({ request }) => {
    const tenant = randomUUID();
    const outsider = randomUUID();
    const response = await request.post("/imports", {
      headers: headers(tenant),
      data: csv,
    });
    const id = (await response.json()).id;
    await test.step("casehatch:CH-CSV-005:isolation", async () => {
      expect(response.status()).toBe(201);
      expect(
        (
          await request.get("/jobs/" + id, { headers: headers(outsider) })
        ).status(),
      ).toBe(404);
      expect(
        await (
          await request.get("/customers", { headers: headers(outsider) })
        ).json(),
      ).toEqual({ jobs: 0, rows: [] });
      expect(
        (
          await request.get("/jobs/" + id, { headers: headers(tenant) })
        ).status(),
      ).toBe(200);
    });
  },
);
for (const [id, extra, status] of [
  ["CH-CSV-006", 1, 413],
  ["CH-CSV-007", 0, 201],
] as const) {
  test(
    `file boundary ${id}`,
    { tag: "@casehatch:" + id },
    async ({ request }) => {
      const tenant = randomUUID();
      const size = 10 * 1024 * 1024 + extra;
      const content = csv + "\n".repeat(size - Buffer.byteLength(csv));
      const response = await request.post("/imports", {
        headers: headers(tenant),
        data: content,
      });
      await test.step(`casehatch:${id}:boundary`, async () => {
        expect(Buffer.byteLength(content)).toBe(size);
        expect(response.status()).toBe(status);
        const state = await (
          await request.get("/customers", { headers: headers(tenant) })
        ).json();
        expect(state.jobs).toBe(extra ? 0 : 1);
        expect(state.rows).toHaveLength(extra ? 0 : 2);
      });
    },
  );
}

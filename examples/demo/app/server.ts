import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
type Job = {
  id: string;
  tenant: string;
  contentHash: string;
  key: string;
  rows: { name: string; email: string }[];
};
const jobs: Job[] = [];
const LIMIT = 10 * 1024 * 1024;
const bug = process.env.CASEHATCH_DEMO_BUG === "1";
const server = createServer(async (req, res) => {
  const reply = (status: number, value: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  };
  if (req.url === "/health") return reply(200, { ok: true, synthetic: true });
  const tenant = req.headers["x-tenant"];
  if (typeof tenant !== "string" || !tenant)
    return reply(401, { error: "tenant required" });
  if (req.method === "GET" && req.url === "/customers")
    return reply(200, {
      rows: jobs.filter((j) => j.tenant === tenant).flatMap((j) => j.rows),
      jobs: jobs.filter((j) => j.tenant === tenant).length,
    });
  if (req.method === "GET" && req.url?.startsWith("/jobs/")) {
    const job = jobs.find(
      (j) => j.id === req.url?.slice(6) && j.tenant === tenant,
    );
    return job
      ? reply(200, { id: job.id, rows: job.rows })
      : reply(404, { error: "not found" });
  }
  if (req.method !== "POST" || req.url !== "/imports")
    return reply(404, { error: "not found" });
  const key = req.headers["idempotency-key"];
  if (typeof key !== "string" || !key)
    return reply(400, { error: "idempotency-key required" });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= LIMIT) chunks.push(Buffer.from(chunk));
  }
  if (size > LIMIT) return reply(413, { error: "max 10 MiB" });
  const content = Buffer.concat(chunks).toString("utf8");
  const contentHash = createHash("sha256").update(content).digest("hex");
  const existing = jobs.find((j) => j.tenant === tenant && j.key === key);
  // Intentional opt-in defect: a lost-response retry bypasses both identity guards.
  // The fixed default is identical except that same-key requests reuse their job.
  if (existing && !bug)
    return existing.contentHash === contentHash
      ? reply(200, { id: existing.id })
      : reply(409, { id: existing.id, error: "key reused" });
  const duplicate = jobs.find(
    (j) => j.tenant === tenant && j.contentHash === contentHash,
  );
  if (duplicate && !(bug && existing))
    return reply(409, { id: duplicate.id, error: "duplicate content" });
  const lines = content.split(/\r?\n/).filter((x) => x.trim().length);
  if (lines.shift() !== "name,email")
    return reply(422, {
      errors: [{ row: 1, error: "name,email header required" }],
    });
  const rows = lines.map((line) => {
    const [name, email, ...extra] = line.split(",");
    return { name: name ?? "", email: email ?? "", extra };
  });
  const errors = rows.flatMap((r, i) =>
    !r.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || r.extra.length
      ? [{ row: i + 2, error: "invalid name/email" }]
      : [],
  );
  if (!rows.length || errors.length)
    return reply(422, {
      errors: errors.length
        ? errors
        : [{ row: 2, error: "at least one row required" }],
    });
  const job: Job = {
    id: randomUUID(),
    tenant,
    key,
    contentHash,
    rows: rows.map(({ name, email }) => ({ name, email })),
  };
  jobs.push(job);
  return reply(201, { id: job.id });
});
server.listen(Number(process.env.PORT ?? 4179), "127.0.0.1");
process.on("SIGTERM", () => server.close(() => process.exit(0)));

import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { configSchema, planSchema, sourceSchema } from "../dist/contracts.js";
mkdirSync(new URL("../schemas/", import.meta.url), { recursive: true });
for (const [name, schema] of Object.entries({
  config: configSchema,
  plan: planSchema,
  source: sourceSchema,
})) {
  const json = z.toJSONSchema(schema, { unrepresentable: "any" });
  writeFileSync(
    new URL(`../schemas/${name}.schema.json`, import.meta.url),
    JSON.stringify(json, null, 2) + "\n",
  );
}

import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/sync-supabase-types.mjs <input-json> <output-ts>");
}

const raw = await readFile(inputPath, "utf8");
const parsed = JSON.parse(raw);
if (!parsed || typeof parsed.types !== "string" || !parsed.types.startsWith("export type Json")) {
  throw new Error("Generated Supabase type payload is missing or invalid");
}

await writeFile(outputPath, `${parsed.types.trimEnd()}\n`, "utf8");

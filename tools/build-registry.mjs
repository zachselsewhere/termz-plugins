#!/usr/bin/env node
// Regenerate registry.json from the plugins/ directory.
//
//   node tools/build-registry.mjs           # write registry.json
//   node tools/build-registry.mjs --check   # CI: fail if registry.json is stale
//
// One entry per plugins/<id>/ that has a manifest.json. `official` reflects
// whether a manifest.json.sig is present (its validity is enforced by
// verify-signatures.sh / the app at install time). No dependencies.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "plugins");

const plugins = [];
for (const id of readdirSync(pluginsDir).sort()) {
  const dir = join(pluginsDir, id);
  if (!statSync(dir).isDirectory()) continue;
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) continue;
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (m.id !== id) throw new Error(`plugins/${id}: manifest id "${m.id}" != directory name`);
  plugins.push({
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    version: m.version,
    official: existsSync(join(dir, "manifest.json.sig")),
    manifest: `plugins/${id}/manifest.json`,
  });
}

const out = JSON.stringify({ version: 1, plugins }, null, 2) + "\n";
const target = join(root, "registry.json");

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== out) {
    console.error("registry.json is out of date — run: node tools/build-registry.mjs");
    process.exit(1);
  }
  console.log(`registry.json is up to date (${plugins.length} plugins).`);
} else {
  writeFileSync(target, out);
  console.log(`wrote registry.json (${plugins.length} plugins)`);
}

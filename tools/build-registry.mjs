#!/usr/bin/env node
// Regenerate registry.json from the plugins/ directory + community.json.
//
//   node tools/build-registry.mjs           # write registry.json
//   node tools/build-registry.mjs --check   # CI: fail if registry.json is stale
//
// Hybrid model:
//   * Official plugins live under plugins/<id>/ in this repo and are signed
//     (manifest.json.sig present). Their code is reviewed and served from here.
//   * Community plugins are listed in community.json and point at the author's
//     OWN repo (an absolute manifest URL). They are unsigned and install behind
//     the app's trust warning.
//
// `official` reflects whether a manifest.json.sig is present (its validity is
// enforced by verify-signatures.sh / the app at install time). No dependencies.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "plugins");

// Build one index entry, copying display + compat metadata from a manifest.
// `manifest` is the location the app installs from (repo-relative for official,
// an absolute URL for community).
function entry(m, { official, manifest }) {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    version: m.version ?? null,
    official,
    author: m.author ?? null,
    min_app_version: m.min_app_version ?? null,
    manifest_version: m.manifest_version ?? null,
    manifest,
  };
}

const plugins = [];

// --- Official: reviewed + signed bundles hosted in this repo ---------------
for (const id of readdirSync(pluginsDir).sort()) {
  const dir = join(pluginsDir, id);
  if (!statSync(dir).isDirectory()) continue;
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) continue;
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (m.id !== id) throw new Error(`plugins/${id}: manifest id "${m.id}" != directory name`);
  plugins.push(
    entry(m, {
      official: existsSync(join(dir, "manifest.json.sig")),
      manifest: `plugins/${id}/manifest.json`,
    }),
  );
}

// --- Community: external, unsigned, pointing at the author's own repo -------
// community.json: { "plugins": [ { id, name, author, description, version,
//   min_app_version?, manifest_version?, manifest: "https://…/manifest.json" } ] }
const communityPath = join(root, "community.json");
if (existsSync(communityPath)) {
  const community = JSON.parse(readFileSync(communityPath, "utf8"));
  for (const c of community.plugins ?? []) {
    if (!c.id || !c.manifest) throw new Error(`community.json: entry needs id + manifest`);
    if (!/^https?:\/\//.test(c.manifest))
      throw new Error(`community.json: ${c.id} manifest must be an absolute URL`);
    if (plugins.some((p) => p.id === c.id))
      throw new Error(`community.json: ${c.id} collides with an official plugin id`);
    plugins.push(entry(c, { official: false, manifest: c.manifest }));
  }
}

plugins.sort((a, b) => a.id.localeCompare(b.id));

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

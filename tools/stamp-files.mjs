#!/usr/bin/env node
// Inject a `files` list into a plugin's manifest.json — one { path, sha256 }
// per bundle file (everything except manifest.json, its .sig, and dotfiles).
//
//   node tools/stamp-files.mjs plugins/<id>
//
// Remote (network) installs REQUIRE this: the app fetches exactly the listed
// files and verifies each hash, so nothing unexpected is pulled. Run this
// BEFORE signing — it rewrites manifest.json, and the signature must cover the
// final bytes (sign-plugin.sh does this for you). No dependencies.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: stamp-files.mjs <plugins/ID>");
  process.exit(1);
}

const EXCLUDE = new Set(["manifest.json", "manifest.json.sig"]);

function walk(base, rel = "") {
  const out = [];
  for (const name of readdirSync(join(base, rel)).sort()) {
    if (name.startsWith(".")) continue; // skip dotfiles (.DS_Store etc.)
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(join(base, r)).isDirectory()) out.push(...walk(base, r));
    else if (!EXCLUDE.has(r)) out.push(r);
  }
  return out;
}

const manifestPath = join(dir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.files = walk(dir).map((path) => ({
  path,
  sha256: createHash("sha256").update(readFileSync(join(dir, path))).digest("hex"),
}));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.error(`stamped ${manifest.files.length} file(s) into ${manifestPath}:`);
for (const f of manifest.files) console.error(`  ${f.path}  ${f.sha256.slice(0, 12)}…`);

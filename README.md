# TermZ plugin registry

The curated plugin store for [TermZ](https://termz.app). This repo is the
**source**; the app does not fetch from here directly. On push to `main`, CI
publishes the store to the distribution host (Cloudflare R2), which is what the
app's `DEFAULT_REGISTRY_URL` points at:

```
https://dl.termz.app/plugins/registry.json
```

So this repo can be private — only the published bundles + index are public on
the dist host. See **[Publishing to the dist host](#publishing-to-the-dist-host)**.

## Hybrid model (two tiers)

Like Obsidian, this repo is a public, PR-reviewed catalog. Approval = a merged
PR. There are two tiers, distinguished in the store:

| Tier | Hosting | Signed | Badge |
|---|---|---|---|
| **Official** | bundle lives in `plugins/<id>/` in this repo | yes (`manifest.json.sig`) | `official` |
| **Community** | author's **own** repo (an absolute manifest URL in `community.json`) | no | `community` |

Official code is reviewed *and* served from here, so every byte the app installs
is exactly what was reviewed. Community plugins point at the author's repo and
install behind the app's trust warning — the catalog listing is the review gate,
not the code hosting.

## Layout

```
registry.json              generated index the app reads (do not hand-edit)
community.json             curated list of external (community) plugins
plugins/<id>/manifest.json the official plugin manifest
plugins/<id>/index.html    the official plugin entry (+ any other bundle files)
plugins/<id>/manifest.json.sig   official signature (present ⇒ "official")
keys/termz-official.pub    public key used to verify official signatures
tools/build-registry.mjs   regenerates registry.json from plugins/ + community.json
tools/sign-plugin.sh       maintainer-only: sign a bundle (needs private key)
tools/verify-signatures.sh verifies every present signature (used by CI)
```

## Add an official plugin (hosted here)

1. Add/modify `plugins/<id>/` (the `id` must match the manifest's `id`).
2. Regenerate the index: `node tools/build-registry.mjs`.
3. Commit both the plugin files and `registry.json`, open a PR. CI checks that
   the index is in sync and that any signatures verify.

## Add a community plugin (hosted in your own repo)

1. Publish your plugin in your own repo with a reachable `manifest.json`
   (raw URL or release asset).
2. Add an entry to `community.json` pointing at it:

   ```json
   {
     "plugins": [
       {
         "id": "my-plugin",
         "name": "My Plugin",
         "author": "you",
         "description": "What it does.",
         "version": "1.0.0",
         "min_app_version": "0.1.0",
         "manifest": "https://raw.githubusercontent.com/<you>/<repo>/main/manifest.json"
       }
     ]
   }
   ```

3. Regenerate the index (`node tools/build-registry.mjs`) and open a PR. The
   entry lists with a **community** badge and installs behind a trust warning;
   it is never signed by the project.

The `author` and `min_app_version` fields are surfaced in the store (author line
+ a compatibility check against the user's TermZ version).

## Publishing to the dist host

`.github/workflows/publish-r2.yml` runs on every push to `main`. It re-checks
the index + signatures, then syncs to Cloudflare R2:

```
registry.json            → s3://$R2_BUCKET/plugins/registry.json   → dl.termz.app/plugins/registry.json
plugins/<id>/…           → s3://$R2_BUCKET/plugins/plugins/<id>/…  → dl.termz.app/plugins/plugins/<id>/…
```

The doubled `plugins/` is intentional: the app resolves a manifest field like
`plugins/<id>/manifest.json` relative to the registry URL's directory
(`dl.termz.app/plugins/`), so the bundles must sit one level under it. It's
never user-visible.

Required repo secrets (the same R2 token used by the app repo's
`publish-dist.yml`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Without them the workflow is a no-op, so the
repo works before R2 exists. Full R2 setup: the app repo's `docs/DISTRIBUTION.md`.

Community plugins live in their authors' own repos, so only their `registry.json`
entry is published here — not their code.

## Official signing (maintainer only)

Only bundles signed with the project private key are "official." The private
key is held by the maintainer and never committed.

```
SIGNING_KEY=/path/to/termz-signing-key.pem tools/sign-plugin.sh plugins/<id>
node tools/build-registry.mjs
```

The matching public key (`keys/termz-official.pub`) is committed here and
embedded in the app, so the signature is verified at install and on every
scan. Editing a signed manifest invalidates its signature until re-signed.

## Trust model

The signature secures the manifest; the manifest's `files[]` hashes secure the
bundle. Verifying the signature against the embedded key is what makes a plugin
"official" — provenance, not extra privileges. What a plugin can *do* is gated
separately by the capability grants the user approves in the app.

Brand/name usage is governed by TermZ's trademark policy. Forks welcome; the
**TermZ** name is reserved. Questions: admin@termz.app

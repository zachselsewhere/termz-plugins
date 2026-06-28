# TermZ plugin registry

The curated plugin store for [TermZ](https://termz.app). TermZ fetches
`registry.json` from this repo and shows it in the in-app store. Point the app's
`DEFAULT_REGISTRY_URL` at the raw URL of `registry.json` on the `main` branch:

```
https://raw.githubusercontent.com/zachselsewhere/termz-plugins/main/registry.json
```

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

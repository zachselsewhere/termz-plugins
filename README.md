# TermZ plugin registry

The curated plugin store for [TermZ](https://termz.app). TermZ fetches
`registry.json` from this repo and installs plugins from the `plugins/`
directory. Point the app's `DEFAULT_REGISTRY_URL` at the raw URL of
`registry.json` on the `main` branch:

```
https://raw.githubusercontent.com/zachselsewhere/termz-plugins/main/registry.json
```

## Layout

```
registry.json              generated index the app reads (do not hand-edit)
plugins/<id>/manifest.json the plugin manifest
plugins/<id>/index.html    the plugin entry (+ any other bundle files)
plugins/<id>/manifest.json.sig   official signature (present ⇒ "official")
keys/termz-official.pub    public key used to verify official signatures
tools/build-registry.mjs   regenerates registry.json from plugins/
tools/sign-plugin.sh       maintainer-only: sign a bundle (needs private key)
tools/verify-signatures.sh verifies every present signature (used by CI)
```

## Add or update a plugin

1. Add/modify `plugins/<id>/` (the `id` must match the manifest's `id`).
2. Regenerate the index: `node tools/build-registry.mjs`.
3. Commit both the plugin files and `registry.json`, open a PR. CI checks that
   the index is in sync and that any signatures verify.

Community plugins (unsigned) are welcome — they install in the app behind a
trust warning. They simply don't get the **official** badge.

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

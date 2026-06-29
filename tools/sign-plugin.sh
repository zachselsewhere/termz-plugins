#!/usr/bin/env bash
# Sign a plugin bundle's manifest.json with the project Ed25519 private key,
# producing manifest.json.sig (hex of the raw 64-byte signature). Only the
# maintainer (key holder) can produce an "official" signature.
#
#   SIGNING_KEY=/path/to/termz-signing-key.pem tools/sign-plugin.sh plugins/<id>
#
# The matching PUBLIC key is committed at keys/termz-official.pub and embedded
# in the app (plugins::OFFICIAL_PUBKEY_HEX). The PRIVATE key is never committed.
set -euo pipefail
KEY="${SIGNING_KEY:-keys/termz-signing-key.pem}"
DIR="${1:?usage: sign-plugin.sh <plugins/ID>}"
[ -f "$KEY" ] || { echo "signing key not found: $KEY (set SIGNING_KEY)"; exit 1; }
# Stamp the integrity list FIRST so the signature covers it — remote installs
# require manifest.files[] (path + sha256). Then sign the final manifest bytes.
node "$(dirname "$0")/stamp-files.mjs" "$DIR"
openssl pkeyutl -sign -inkey "$KEY" -rawin -in "$DIR/manifest.json" \
  | xxd -p -c 256 | tr -d '\n' > "$DIR/manifest.json.sig"
echo "signed $DIR/manifest.json -> $DIR/manifest.json.sig"
echo "Re-run: node tools/build-registry.mjs   (to refresh registry.json)"

#!/usr/bin/env bash
# Verify every official plugin's manifest.json.sig against the project public
# key. Plugins without a .sig are community/unsigned (allowed; just not
# "official"). Exits non-zero if any present signature fails to verify.
set -euo pipefail
PUB="keys/termz-official.pub"
fail=0
shopt -s nullglob
for sig in plugins/*/manifest.json.sig; do
  dir=$(dirname "$sig")
  bin=$(mktemp)
  python3 -c "import sys;open('$bin','wb').write(bytes.fromhex(open('$sig').read().strip()))"
  if openssl pkeyutl -verify -pubin -inkey "$PUB" -rawin \
       -in "$dir/manifest.json" -sigfile "$bin" >/dev/null 2>&1; then
    echo "ok (official): $dir"
  else
    echo "BAD SIGNATURE: $dir"
    fail=1
  fi
  rm -f "$bin"
done
exit "$fail"

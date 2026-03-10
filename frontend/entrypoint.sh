#!/usr/bin/env sh
set -e

LOCALE=${LOCALE:-ka}
ROOT="/app/dist/frontend"

find_entry() {
  find "$ROOT" -name server.mjs 2>/dev/null | grep "/${LOCALE}/" | head -n 1
}

ENTRY=$(find_entry)

if [ -z "$ENTRY" ]; then
  ENTRY=$(find "$ROOT" -name server.mjs 2>/dev/null | head -n 1)
fi

if [ -z "$ENTRY" ]; then
  echo "Could not find server.mjs under $ROOT"
  find "$ROOT" -maxdepth 4 -type f 2>/dev/null || true
  exit 1
fi

echo "Starting SSR server: $ENTRY"
exec node "$ENTRY"

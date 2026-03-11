#!/bin/sh
set -e

echo "Running local secret hygiene checks..."

# Check for hardcoded admin credentials (ignore safe placeholders and local env files)
# Only inspect tracked env documents; skip scripts like bootstrap which set env values at runtime.
TARGETS=$(git ls-files '*.env' '*.env.example' '*.md' || true)
echo "checking files: $TARGETS"
for FIELD in SUPER_ADMIN_PASSWORD JWT_SECRET REFRESH_SECRET TWO_FACTOR_ENCRYPTION_KEY GOOGLE_CLIENT_SECRET; do
  if [ -z "$TARGETS" ]; then
    continue
  fi
  git grep -n -E "${FIELD}=.+$" -- $TARGETS 2>/dev/null | grep -v 'replace-with' && {
    echo "ERROR: ${FIELD} hardcoded value found in tracked config files"
    exit 1
  }
done

# Optional: detect-secrets invocation if available
if command -v detect-secrets >/dev/null 2>&1; then
  echo "Running detect-secrets scan..."
  detect-secrets scan --baseline .secrets-baseline
else
  echo "detect-secrets not installed; skipping that step. Run 'pip install detect-secrets' to enable."
fi

echo "Secret hygiene checks passed (or baseline check skipped)."
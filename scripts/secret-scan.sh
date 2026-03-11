#!/bin/sh
set -e

echo "Running local secret hygiene checks..."

# Check for hardcoded admin credentials (ignore safe placeholders and local env files)
# Only inspect .env.example to avoid local .env values.
echo "checking .env.example only"
for FIELD in SUPER_ADMIN_PASSWORD JWT_SECRET REFRESH_SECRET TWO_FACTOR_ENCRYPTION_KEY GOOGLE_CLIENT_SECRET; do
  matches=$(git grep -n -E "${FIELD}=.+$" -- '*.env' '*.env.example' 2>/dev/null | grep -v 'replace-with' | grep -v 'your-google-client-secret' || true)
  if [ -n "$matches" ]; then
    echo "ERROR: ${FIELD} hardcoded value found in tracked config files"
    echo "$matches"
    exit 1
  fi
done

# Optional: detect-secrets invocation if available
if command -v detect-secrets >/dev/null 2>&1; then
  echo "Running detect-secrets scan..."
  detect-secrets scan --baseline .secrets-baseline
else
  echo "detect-secrets not installed; skipping that step. Run 'pip install detect-secrets' to enable."
fi

echo "Secret hygiene checks passed (or baseline check skipped)."
#!/bin/sh
set -e

echo "Running local secret hygiene checks..."

# Check for hardcoded admin credentials (ignore safe placeholders and local env files)
# Only inspect .env-like files and docs; skip scripts like bootstrap which set env variables at runtime.
TARGETS=$(find . -type f \( -name '.env' -o -name '*.env' -o -name '*.env.example' -o -name '*.md' \))
echo "checking files: $TARGETS"
for FIELD in SUPER_ADMIN_PASSWORD JWT_SECRET REFRESH_SECRET TWO_FACTOR_ENCRYPTION_KEY GOOGLE_CLIENT_SECRET; do
  for F in $TARGETS; do
    if grep -n -E "${FIELD}=.+$" "$F" | grep -v 'replace-with'; then
      echo "ERROR: ${FIELD} hardcoded value found in file $F"
      exit 1
    fi
  done
done

# Optional: detect-secrets invocation if available
if command -v detect-secrets >/dev/null 2>&1; then
  echo "Running detect-secrets scan..."
  detect-secrets scan --baseline .secrets-baseline
else
  echo "detect-secrets not installed; skipping that step. Run 'pip install detect-secrets' to enable."
fi

echo "Secret hygiene checks passed (or baseline check skipped)."
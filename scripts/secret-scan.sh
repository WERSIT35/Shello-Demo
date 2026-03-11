#!/bin/sh
set -e

echo "Running local secret hygiene checks..."

# Check for hardcoded admin credentials (ignore safe placeholders and local env files)
EXCLUDE="--exclude-dir=.git --exclude='.env' --exclude='*.env' --exclude='*.env.*' --exclude='*example*' --exclude='*.md'"
if grep -R --line-number $EXCLUDE -E 'SUPER_ADMIN_PASSWORD=.+$' . | grep -v 'replace-with'; then
  echo "ERROR: SUPER_ADMIN_PASSWORD hardcoded value found in repository files"
  exit 1
fi

if grep -R --line-number $EXCLUDE -E 'JWT_SECRET=.+$' . | grep -v 'replace-with'; then
  echo "ERROR: JWT_SECRET hardcoded value found in repository files"
  exit 1
fi

if grep -R --line-number $EXCLUDE -E 'GOOGLE_CLIENT_SECRET=.+$' . | grep -v 'replace-with'; then
  echo "ERROR: GOOGLE_CLIENT_SECRET hardcoded value found in repository files"
  exit 1
fi

# Optional: detect-secrets invocation if available
if command -v detect-secrets >/dev/null 2>&1; then
  echo "Running detect-secrets scan..."
  detect-secrets scan --baseline .secrets-baseline
else
  echo "detect-secrets not installed; skipping that step. Run 'pip install detect-secrets' to enable."
fi

echo "Secret hygiene checks passed (or baseline check skipped)."
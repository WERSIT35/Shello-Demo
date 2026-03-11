#!/bin/sh
set -e

echo "Running local secret hygiene checks..."

# Check for hardcoded admin credentials
if grep -R --line-number --exclude-dir=.git "SUPER_ADMIN_PASSWORD=.*[^\n]" .; then
  echo "ERROR: SUPER_ADMIN_PASSWORD found in repository files"
  exit 1
fi

if grep -R --line-number --exclude-dir=.git "JWT_SECRET=.*[^\n]" .; then
  echo "ERROR: JWT_SECRET found in repository files"
  exit 1
fi

if grep -R --line-number --exclude-dir=.git "GOOGLE_CLIENT_SECRET=.*[^\n]" .; then
  echo "ERROR: GOOGLE_CLIENT_SECRET found in repository files"
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
#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${1:-shellotech.eu.org}
ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  echo ".env already exists. Skipping bootstrap."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate secrets. Please install it and re-run."
  exit 1
fi

gen_hex() {
  openssl rand -hex 32
}

MONGO_USER="admin"
MONGO_PASS="$(openssl rand -hex 16)"
MONGO_DB="shello_db"

JWT_SECRET="$(gen_hex)"
REFRESH_SECRET="$(gen_hex)"
REFRESH_TOKEN_HMAC_KEY="$(gen_hex)"
TWO_FACTOR_ENCRYPTION_KEY="$(openssl rand -hex 16)"

cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=4000
FRONTEND_URL=http://${DOMAIN}
TRUST_PROXY=1

MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASS}
MONGO_DB=${MONGO_DB}
MONGO_URI=mongodb://${MONGO_USER}:${MONGO_PASS}@mongo:27017/${MONGO_DB}?authSource=admin

JWT_SECRET=${JWT_SECRET}
REFRESH_SECRET=${REFRESH_SECRET}
REFRESH_TOKEN_HMAC_KEY=${REFRESH_TOKEN_HMAC_KEY}
TWO_FACTOR_ENCRYPTION_KEY=${TWO_FACTOR_ENCRYPTION_KEY}

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

echo "Created .env for http://${DOMAIN}."

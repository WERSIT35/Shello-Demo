# Shello Docker Setup

This repo ships a Docker Compose setup that runs MongoDB, the Express API, the Angular SSR frontend,
and an Nginx reverse proxy. The goal is a clean one or two command startup on Linux.

---

# 1. Project Structure

```
Shello-Demo/
├── Backend/
│   └── server/
│       └── Dockerfile
├── frontend/
│   └── Dockerfile
├── infra/
│   └── nginx.conf
├── scripts/
│   └── bootstrap.sh
├── docker-compose.yml
└── .env
```

---

# 2. Quick Start (Linux)

```
bash scripts/bootstrap.sh shellotech.eu.org
docker compose up -d --build
```

This will:
- generate a .env with secure secrets and Mongo credentials
- build backend/frontend images
- start MongoDB + API + SSR frontend + Nginx

---

# 3. Domain and Ports

- Point your domain (A record) to this machine's public IP.
- Open port 80 in your firewall/router.
- Nginx proxies:
  - /api and /uploads -> backend
  - / -> frontend (SSR)

---

# 4. Environment Variables

The backend reads its config from .env at the repo root. Adjust as needed:

- FRONTEND_URL=http://your-domain
- MONGO_URI=mongodb://user:pass@mongo:27017/db?authSource=admin
- JWT_SECRET, REFRESH_SECRET, REFRESH_TOKEN_HMAC_KEY

Optional admin bootstrap:
- SUPER_ADMIN_EMAIL
- SUPER_ADMIN_PASSWORD
- SUPER_ADMIN_PIN_CODE

---

# 5. Notes

- MongoDB is not exposed publicly.
- If you want HTTPS, terminate TLS in Nginx and add certs (Lets Encrypt).

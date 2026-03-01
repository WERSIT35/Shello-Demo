# Shello Production Docker Setup

---

# 1. Project Structure

```
shello/
├── client/
├── server/
├── docker-compose.yml
└── .env
```

---

# 2. Backend Dockerfile

```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

---

# 3. Frontend Dockerfile

```
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

---

# 4. Docker Compose (Production Example)

```
version: '3.8'

services:
  server:
    build: ./server
    restart: always
    env_file:
      - .env
    networks:
      - backend

  mongo:
    image: mongo
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: strongpassword
    networks:
      - backend

  client:
    build: ./client
    restart: always
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - backend

networks:
  backend:
```

---

Security Rules:

* Do not expose MongoDB port
* Use .env for secrets
* Use firewall on VPS

Production-ready Docker configuration.

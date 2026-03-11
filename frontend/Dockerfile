FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Browser builds (localized)
RUN npm run build -- --configuration ka --output-path dist/ka/browser --base-href /ka/
RUN npm run build -- --configuration en --output-path dist/en/browser --base-href /en/
# Server builds (SSR)
RUN npm run --silent ng run frontend:server:ka -- --output-path dist/ka/server
RUN npm run --silent ng run frontend:server:en -- --output-path dist/en/server

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200
ENV LOCALE=ka
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY entrypoint.sh /app/entrypoint.sh
COPY static-server.mjs /app/static-server.mjs
RUN sed -i 's/\r$//' /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 4200
CMD ["sh", "/app/entrypoint.sh"]

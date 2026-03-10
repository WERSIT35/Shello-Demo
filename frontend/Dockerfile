FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration ka --output-path dist/ka --base-href /ka/
RUN npm run build -- --configuration en --output-path dist/en --base-href /en/

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200
ENV LOCALE=ka
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 4200
CMD ["/app/entrypoint.sh"]

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production --localize

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200
ENV LOCALE=ka
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4200
CMD ["sh", "-c", "node dist/frontend/${LOCALE}/server/server.mjs"]

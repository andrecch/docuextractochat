FROM node:24.20.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-retries=3 --fetch-timeout=120000
COPY apps/web ./apps/web
COPY apps/api ./apps/api
RUN npm run build

FROM node:24.20.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund --fetch-retries=3 --fetch-timeout=120000

FROM node:24.20.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/package.json ./package.json
COPY --from=dependencies --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=dependencies --chown=node:node /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=node:node /app/apps/api/dist/src ./apps/api/dist/src
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
RUN mkdir -p /data/documents && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]

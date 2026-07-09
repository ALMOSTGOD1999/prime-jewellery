FROM node:lts-bookworm-slim AS base

FROM base AS deps
ENV NODE_ENV=development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ENV NODE_ENV=development
WORKDIR /app
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --production

COPY docker-entrypoint.js ./

EXPOSE 3333
CMD ["node", "docker-entrypoint.js"]

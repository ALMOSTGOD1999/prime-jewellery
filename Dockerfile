FROM node:lts-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-*.yaml ./
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY --from=deps /app/pnpm-workspace.yaml ./
RUN pnpm prune --prod

COPY docker-entrypoint.js ./

EXPOSE 3333
CMD ["node", "docker-entrypoint.js"]

# syntax=docker/dockerfile:1

# node:22-slim (Debian/glibc) statt Alpine/musl: argon2 (native) und die
# Prisma-Engine laufen ohne Sonderbehandlung. openssl wird von Prisma benötigt.
FROM node:22-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /workspace

FROM base AS build
# Build-Werkzeuge nur im Build-Stage (argon2 kompiliert ggf. nativ).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @schichtbuch/shared build
RUN pnpm --filter @schichtbuch/api exec prisma generate
RUN pnpm --filter @schichtbuch/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
WORKDIR /workspace/apps/api
EXPOSE 3000
ENTRYPOINT ["/workspace/apps/api/docker-entrypoint.sh"]

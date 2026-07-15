# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS build
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
CMD ["node", "dist/main.js"]

# TurboHesap — single-image build. The frontend compiles into backend/static
# and the NestJS server serves it, so the whole app is one process (see
# Makefile's `build`/`run-prod` targets, which this mirrors).
#
# Only the shared/frontend/backend workspaces are installed — `mobile` is an
# Expo app with native-build postinstall steps that don't apply to a server
# image, so it's excluded via pnpm --filter.

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate
WORKDIR /app

FROM base AS deps
# Toolchain for any transitive native (node-gyp) dependency.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY mobile/package.json ./mobile/package.json
RUN pnpm install --frozen-lockfile \
  --filter "@turbohesap/backend..." \
  --filter "@turbohesap/frontend..."

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/backend
EXPOSE 5800
CMD ["node", "dist/main.js"]

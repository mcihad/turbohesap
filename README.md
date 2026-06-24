# TurboHesap

An ERP built as a **pnpm monorepo**: one NestJS API (local JWT auth + RBAC over
PostgreSQL) serves a React SPA, and a typed **`@turbohesap/shared`** package
carries the API contracts so the web and mobile clients talk to the backend the
same way.

**Backend:** NestJS · TypeScript · TypeORM (PostgreSQL) · JWT (access + refresh) ·
bcrypt · class-validator.
**Frontend:** React 19 · Vite · Tailwind v4 · shadcn/ui · TanStack Router + Query.
**Mobile:** Expo (React Native).
**Shared:** `@turbohesap/shared` — DTO models, service interfaces, and axios
client implementations consumed by the frontend and mobile.

## Workspaces

- **`shared/`** (`@turbohesap/shared`) — the typed contract layer (single source
  of truth for API shapes).
- **`backend/`** (`@turbohesap/backend`) — NestJS API; serves `backend/static/`
  (the built SPA) alongside `/api`, so the web app runs from one process.
- **`frontend/`** (`@turbohesap/frontend`) — the React SPA; compiles into
  `backend/static/`.
- **`mobile/`** (`@turbohesap/mobile`) — the Expo app, same `@turbohesap/shared`
  contracts.

## API convention

Every endpoint is **`/api/<module>/<resource>`**. Server-side modules live under
`backend/src/modules/<module>/`. Current modules:

| Module | Endpoints |
| ------ | --------- |
| `auth` | `POST /api/auth/login` · `POST /api/auth/refresh` · `POST /api/auth/logout` · `GET /api/auth/me` |
| `iam`  | `/api/iam/users` · `/api/iam/roles` · `/api/iam/permissions` (CRUD, permission-protected) |
| —      | `GET /api/health` |

## Auth & RBAC

- **Local users** in PostgreSQL with bcrypt-hashed passwords. Login returns a
  short-lived **access token** and a rotating, revocable **refresh token** (JWT).
- **RBAC:** users ↔ roles ↔ permissions. Permissions are keyed
  `<module>.<resource>.<action>` (e.g. `iam.users.write`) and seeded as a
  catalog. The access token carries the caller's roles + permissions; routes are
  guarded with `@RequirePermissions(...)`.
- Token lifetimes and secrets are configured in `.env` (`JWT_*`).

## Get started

```bash
# Requires Node 20+, pnpm, and a local PostgreSQL with a `turbohesap` database
# reachable as postgres/postgres (see DATABASE_URL in .env).
make env        # create .env from .env.example
make install    # install all workspace dependencies
make run        # build shared + frontend, run the NestJS backend → http://localhost:5800
```

On first boot the backend seeds the permission catalog, the `admin`/`user` roles,
and an **admin** user from `SEED_ADMIN_*` in `.env` (default **`admin` /
`Admin123!`**). Sign in at `http://localhost:5800/login`.

## Develop

```bash
make run            # full app on one port (rebuild to see frontend changes)
make build          # shared + frontend + backend

# Fast loops (separate terminals):
make dev-shared     # recompile @turbohesap/shared on change (watch)
make dev-frontend   # Vite dev server with HMR (:5173)
make dev-backend    # NestJS API in watch mode (:5800)

# Mobile:
pnpm --filter @turbohesap/mobile start   # Expo (set EXPO_PUBLIC_API_BASE_URL in mobile/.env)
```

## Configuration

All backend + frontend settings live in the root **`.env`** (copy from
`.env.example`). Key variables: `DATABASE_URL`, `DB_SYNCHRONIZE`,
`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`,
`SEED_ADMIN_*`, and `VITE_API_BASE_URL`. Mobile uses `EXPO_PUBLIC_*` in
`mobile/.env`. See [`AGENTS.md`](./AGENTS.md) for the full system guide and
[`docs/auth.md`](./docs/auth.md) for the auth flow.

> In development TypeORM auto-creates tables (`DB_SYNCHRONIZE=true`). For
> production set it to `false` and manage the schema with migrations.

## Add an endpoint / module

1. Add the DTO(s) and the service interface + axios client in `shared/src/`.
2. Create a NestJS module under `backend/src/modules/<module>/` with a controller
   at `@Controller('<module>/<resource>')`, wired into `app.module.ts`.
3. Consume it on the client via `api.<module>.<method>()` (`frontend/src/lib/api.ts`).

> The frontend design system (tokens, components, layout) is documented in
> [`DESIGN.md`](./DESIGN.md). Paths there are relative to `frontend/`.

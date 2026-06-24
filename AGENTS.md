# AGENTS.md — TurboHesap System Guide

This file is the entry point for any agent (or human) working in this repository.
It describes **what the system is, how it is wired together, and how to build,
run, and extend it.** For the frontend *design system* (tokens, components,
layout) the authoritative document is **`DESIGN.md`**; this file covers the
**whole system** — the shared contract layer + NestJS backend + frontend + mobile.

> Status: TurboHesap is an ERP under active development. The architecture below
> is the foundation; expect more feature modules (under `src/modules/<module>`
> in both `shared/` and `backend/`) to be added over time.

---

## 1. What this is

TurboHesap is a **pnpm monorepo** where one **NestJS** process serves a React
single-page application together with its JSON API, backed by **PostgreSQL**
(TypeORM). A typed **`@turbohesap/shared`** package carries the API contracts so
every client (web and mobile) and the server speak the same language.

- **`@turbohesap/shared`** — the **contract layer**. Per module it holds the
  **DTOs** (data transfer objects = the wire shapes) and the **service
  interfaces** (the contracts), plus their **axios client implementations**.
  Single source of truth for API shapes; the backend imports the same DTOs.
- **`@turbohesap/backend`** — NestJS API (local JWT auth + RBAC, TypeORM). Serves
  the built SPA (`backend/static/`) alongside `/api`.
- **`@turbohesap/frontend`** — Vite + React 19 SPA. Compiles into `backend/static/`.
- **`@turbohesap/mobile`** — Expo (React Native) app on the same contracts.

```
  shared (tsc → dist)  ──►  frontend (Vite build)  ──►  backend/static/  ──►  NestJS serves /api + SPA
        └────────────────►  mobile (Expo)  ── same contracts, absolute base URL ──┘
```

**The golden rule of separation:** a module exists in three mirrored places —
`shared/src/modules/<module>` (contracts), `backend/src/modules/<module>`
(implementation), and (for UI) `frontend/src/modules/<module>` (pages + nav).
Its endpoints are always `/api/<module>/<resource>`. Modules never reach into
each other's internals; they communicate only through `@turbohesap/shared`.

---

## 2. Repository layout

```
.
├── AGENTS.md · DESIGN.md · README.md · Makefile · package.json · pnpm-workspace.yaml
├── .env / .env.example     # backend + frontend config (mobile uses mobile/.env)
├── docs/                   # longer-form documentation
├── shared/                 # @turbohesap/shared — the contract layer
│   └── src/
│       ├── core/           # cross-cutting, module-agnostic building blocks
│       │   ├── http.ts         # createHttpClient (axios factory) + config
│       │   ├── app-modules.ts  # MODULES catalog (key/label) + MODULE_KEYS
│       │   ├── api.ts          # createTurbohesapApi() — wires every client
│       │   └── index.ts
│       ├── modules/        # ONE FOLDER PER MODULE — the contracts
│       │   ├── auth/           # auth.dto.ts · auth.service.ts · auth.client.ts
│       │   ├── iam/            # user/role/permission .dto · .service · .client
│       │   └── health/         # health.dto.ts · health.service.ts · health.client.ts
│       └── index.ts        # barrel: re-exports core + every module
├── frontend/               # @turbohesap/frontend — the React SPA
│   └── src/
│       ├── lib/api.ts          # the app's createTurbohesapApi() instance
│       └── modules/<module>/   # per-module UI: module.config.ts (nav) + pages/
├── backend/                # @turbohesap/backend — the NestJS service
│   ├── src/
│   │   ├── main.ts         # bootstrap: /api prefix, ValidationPipe, static + SPA fallback
│   │   ├── app.module.ts   # wires config, DB, global JwtAuthGuard, feature modules
│   │   ├── permissions.catalog.ts  # aggregated permission catalog (auto-seeded on boot)
│   │   ├── config/         # env-driven configuration
│   │   ├── database/       # TypeORM (global)
│   │   ├── common/         # guards + decorators + permission.types.ts
│   │   ├── health/         # GET /api/health
│   │   └── modules/        # FEATURE MODULES → /api/<module>/<resource>
│   │       ├── auth/       # local login, JWT access+refresh (rotation), /api/auth/*
│   │       └── iam/        # users, roles, permissions → /api/iam/<resource>; iam.permissions.ts + seeding
│   └── static/             # frontend build output, served by NestJS
│       └── index.html      # tracked placeholder (overwritten by the real build)
└── mobile/                 # @turbohesap/mobile — Expo app (src/lib/api.ts, tokens.ts)
```

The `@turbohesap/*` package names are the org scope and stay fixed.

---

## 3. How the pieces fit together

### API convention
**Every endpoint is `/api/<module>/<resource>`.** The global prefix `/api` is set
in `main.ts`; a controller `@Controller('iam/users')` is served at
`/api/iam/users`. Server-side modules live in `backend/src/modules/<module>/`.

### Build pipeline
1. `make build-shared` → builds `@turbohesap/shared` (dual: ESM for bundlers +
   CJS for Node, see §4). Rebuild it when you change a contract
   (`make dev-shared` watches).
2. `make build-frontend` → Vite builds the SPA into `backend/static/`
   (`vite.config.ts` `build.outDir`).
3. `make build-backend` → `nest build` → `backend/dist`.
4. `make run` builds shared + frontend and starts the NestJS server.

### Request flow at runtime
- `node backend/dist/main.js` boots NestJS with global prefix `/api`, CORS on,
  `trust proxy` on, and a global `ValidationPipe` (whitelist + transform).
- Two **global guards** run on every route, in order:
  1. **`JwtAuthGuard`** — authentication; routes opt out with `@Public()`
     (login/refresh/logout, health).
  2. **`PermissionsGuard`** — authorization; enforces `@RequirePermissions(...)`
     on **every** route automatically (no per-controller `@UseGuards`). A route
     with no `@RequirePermissions` just needs a valid token. It resolves the
     caller's **effective permissions from the DB** per request (`AccessService`),
     **not** from the token.
  So the API is the **real** access boundary — the same permission keys gate the
  frontend (sidebar/rail/pages) only for UX; the server enforces them regardless.
- Static assets in `backend/static/` are served by `useStaticAssets`; a final
  fallback returns `index.html` for non-`/api` `GET`/`HEAD` (SPA deep links).
  Unknown `/api/*` paths are genuine `404`s.

### Caching policy
- `index.html` / SPA fallback → `Cache-Control: no-cache`.
- Other assets → `public, max-age=<STATIC_CACHE_MAX_AGE>` (default 3600s).

---

## 4. The shared contract layer (`@turbohesap/shared`)

This package is the heart of "write the contract once, use it on the server, the
web and mobile." It is organized **by module, mirroring the backend**, so modules
stay cleanly separated as the ERP grows.

### What lives where

```
shared/src/
├── core/                       # module-agnostic
│   ├── http.ts                 # createHttpClient(config) → axios instance
│   ├── app-modules.ts          # MODULES (catalog) + MODULE_KEYS
│   └── api.ts                  # createTurbohesapApi(config) → { auth, users, ... , http }
└── modules/<module>/           # everything a module's API needs
    ├── <name>.dto.ts           # DTOs (data transfer objects) — the wire shapes
    ├── <name>.service.ts       # service INTERFACE (the contract, I<Name>Service)
    ├── <name>.client.ts        # axios implementation of that interface
    └── index.ts                # re-exports the module's contracts
```

Each module folder contains the **two things the user asked to keep here**:
**DTOs** and **service interfaces** (with their axios client implementations
alongside). Examples today:

| Module   | DTOs                                                         | Service interfaces |
| -------- | ---------------------------------------------------------- | ------------------ |
| `auth`   | `LoginRequest`, `AuthTokens`, `LoginResponse`, `Refresh/LogoutRequest` | `IAuthService` |
| `iam`    | `UserDto`, `CurrentUser`, `RoleDto`, `PermissionDto`, `Create/Update*Request` | `IUsersService`, `IRolesService`, `IPermissionsService` |
| `health` | `HealthStatus`                                             | `IHealthService` |

### Rules that keep separation clean

- **One entry point:** consumers import only from the barrel `@turbohesap/shared`
  (never deep paths). `createTurbohesapApi(config)` returns one typed object
  `{ auth, users, roles, permissions, health, http }`. Consumers depend on the
  **interfaces**, not the concrete axios classes.
- **DTOs are framework-agnostic types** — plain interfaces, no React, no Nest, no
  TypeORM. The backend imports the same DTOs and returns them from controllers,
  so the server and clients can never drift.
- **Cross-module references go through DTOs** (e.g. `auth`'s `LoginResponse`
  embeds `iam`'s `CurrentUser`). A module never imports another module's client
  or backend code.
- **Per-platform config** is all that differs between web and mobile: `baseUrl`
  (`/api` on web, absolute on mobile), `getAccessToken` (localStorage /
  AsyncStorage, may be async), optional `onUnauthorized`.
- **Dual build:** `tsc` emits ESM (`dist/esm`, for Vite/Metro — real named
  exports) and CJS (`dist/cjs`, for NestJS `require`). `package.json` `exports`
  routes `import`→esm and `require`→cjs. Don't collapse this back to a single
  build (dev would break on named exports).

### Adding a module end-to-end (the separation contract)

1. **Contracts** — `shared/src/modules/<module>/`: add `*.dto.ts`,
   `*.service.ts` (the `I<Name>Service` interface), `*.client.ts` (axios impl),
   and `index.ts`. Export the folder from `shared/src/index.ts`, and register the
   new client in `shared/src/core/api.ts` (add it to `TurbohesapApi` + the
   factory). If the module needs to appear in the rail / role dropdown, add it to
   `core/app-modules.ts`. Rebuild: `make build-shared`.
2. **Backend** — `backend/src/modules/<module>/`: entities, service(s), and a
   controller `@Controller('<module>/<resource>')` that returns the shared DTO
   types. Declare the module's permissions in `<module>.permissions.ts` and add
   that list to `src/permissions.catalog.ts` (they auto-seed on boot — see §5);
   protect routes with `@RequirePermissions('<module>.<resource>.<action>')`.
   Import the module in `app.module.ts`.
3. **Frontend** — `frontend/src/modules/<module>/module.config.ts` (icon + nav)
   registered in `src/modules/registry.ts`, with pages in `pages/` and thin route
   files under `src/routes/_authed/<module>/`. Call the API via
   `api.<resource>.<method>()`; gate UI with `useAuth().hasPermission(...)`.

---

## 5. Backend (NestJS) — auth, RBAC, modules

| Concern    | Choice                                                       |
| ---------- | ----------------------------------------------------------- |
| Framework  | NestJS 11 (platform-express)                                |
| Database   | PostgreSQL via TypeORM (`@nestjs/typeorm`, `pg`)            |
| Auth       | local username/password, JWT via `@nestjs/jwt`, bcryptjs    |
| Validation | `class-validator` + global `ValidationPipe`                 |
| Config     | `@nestjs/config` + `src/config/configuration.ts`           |

### Modules & conventions
- A feature module is `backend/src/modules/<module>/` with controllers at
  `@Controller('<module>/<resource>')`, returning DTO types from
  `@turbohesap/shared`. DTO classes used for request bodies (with
  `class-validator` decorators) live in the module's `dto/` and `implements` the
  shared request interface, so validation and contract stay aligned.
- **`auth`** (`/api/auth`): `login`, `refresh`, `logout`, `me`, `permissions`.
  Issues a short-lived access token that carries **roles only** (not permissions,
  so it stays small even with many of them) and a persisted, **rotating** refresh
  token (`refresh_tokens` table; each refresh revokes the old row and issues a new
  pair). Passwords are bcrypt-hashed. The client fetches its permission list
  **separately** via `GET /api/auth/permissions` (JWT-authenticated) after login.
- **`iam`** (`/api/iam`): `users`, `roles`, `permissions` (CRUD). RBAC model:
  `User` ↔ `Role` ↔ `Permission` (many-to-many); each `Role` belongs to a
  `module`. On startup `SeedService` upserts the permission catalog
  (`iam.constants.ts`, Turkish descriptions), the system roles (`admin`, `user`),
  and a default admin user from `SEED_ADMIN_*` — idempotent.

### Permissions (module-declared, auto-seeded)
Permissions are **declared per module and auto-created on startup** — no manual
DB work, no migration to add one.

- Each module owns a `<module>.permissions.ts` exporting a `PermissionDef[]`
  (key `<module>.<resource>.<action>`, Turkish description, group). Example:
  `backend/src/modules/iam/iam.permissions.ts` (`IAM_PERMISSIONS`).
- The central **`backend/src/permissions.catalog.ts`** aggregates every module's
  list into `PERMISSION_CATALOG` (and derives `ALL_PERMISSION_KEYS`, which grants
  the `admin` role everything). Add a module's list here as the ERP grows:
  ```ts
  export const PERMISSION_CATALOG = [ ...IAM_PERMISSIONS, ...INVENTORY_PERMISSIONS ]
  ```
- On boot `SeedService.seedPermissions()` **upserts** the catalog: existing rows
  are refreshed, **missing keys are inserted automatically** (it logs
  "N yeni izin veritabanına eklendi"). So a permission becomes usable simply by
  declaring it and restarting the backend. (Removal is not pruned — drop stale
  keys manually if needed.)
- **Verify the mechanism:** the catalog ships a smoke-test entry `test.test.test`
  (group `test`, used by no route). Delete it from the DB and reboot — it
  reappears. Safe to remove from the catalog once you've seen it work.

### Auth & authorization (enforced on the server)
- **Authentication:** the global `JwtAuthGuard` verifies the access token and
  stashes the principal (`@CurrentUser()`). Public routes use `@Public()`.
- **Authorization:** the global `PermissionsGuard` enforces
  `@RequirePermissions('<module>.<resource>.<action>')` on every route — the
  caller must hold **all** listed permission keys. **Just add the decorator**; no
  per-controller `@UseGuards(PermissionsGuard)` is needed (it's wired once in
  `app.module.ts`). Convention: read endpoints require `.read`, mutations require
  `.write`.
- **Permissions live in the DB, not the token.** The token carries only roles;
  `AccessService.permissionKeys(userId)` resolves a user's effective permissions
  from their roles in the DB. The guard calls it per protected request and the
  `GET /api/auth/permissions` endpoint returns the same list to the client. Upshot:
  the token stays small, and editing a role's permissions takes effect on the next
  request — no re-login needed.
- **Server is the source of truth.** Frontend permission checks
  (`useAuth().hasPermission`, `<Can>`, `<PermissionRequired>`, nav/rail filtering)
  are **UX only**; every protected endpoint re-checks the same key server-side, so
  a forged/altered client still gets `403`. Use the **same permission key** on
  both sides (e.g. `iam.users.write` on the button and on `POST /api/iam/users`).
- **camelCase JSON** everywhere; DTOs come from `@turbohesap/shared`.
- **Seed/data is Turkish** (permission/role descriptions, admin name) since the
  app is Turkish-facing.
- **DB:** TypeORM is global; `DB_SYNCHRONIZE=true` auto-creates tables in dev,
  `false` + migrations in prod.

---

## 6. Frontend & mobile

### Frontend (`@turbohesap/frontend`)
- Stack: React 19, Vite, Tailwind v4, shadcn/ui, TanStack Router + Query. See
  `DESIGN.md` (paths there are relative to `frontend/`).
- **Modular UI:** the far-left **module rail** (`components/layout/module-rail.tsx`)
  lists modules from `src/modules/registry.ts`; selecting one swaps the sidebar
  nav + content (shell stays). Each module defines its nav in
  `src/modules/<module>/module.config.ts`; routes are `/<module>/<resource>`
  under `src/routes/_authed/<module>/`.
- **All API access goes through `src/lib/api.ts`** (`createTurbohesapApi`,
  baseUrl `/api`, token from `lib/auth/tokens.ts`).
- **Auth:** `lib/auth/` — `tokens.ts` (localStorage: tokens, current user, and a
  separately-cached permission list), `auth-provider.tsx` / `auth-context.ts`
  (`login(username,password)`, `logout`, `refresh`, role + permission checks:
  `hasRole`/`hasAnyRole`/`hasAllRoles`/`hasPermission`/…). Roles come from the
  token/`me`; **permissions are fetched separately** via `api.auth.permissions()`
  right after login/refresh and cached (key `turbohesap-permissions`) — so
  `useAuth().permissions` never depends on token size. `routes/login.tsx` is a
  local form; the pathless `_authed` layout guards app pages; `SessionWatcher`
  prompts to extend before the access token lapses.
- **Permission gating (UX layer):** nav items carry a `permission` and the
  sidebar/module-rail/command-palette auto-hide what the user can't access
  (`lib/auth/access.ts`); `<Can permission="…">` hides inline UI (buttons,
  actions); `<PermissionRequired permission="…">` wraps a page with a "Yetkiniz
  yok" state; gate queries with `enabled: hasPermission('…')`. This is **UX
  only** — the backend enforces the same keys (§5), so never rely on it for
  security; always mirror the key in the controller's `@RequirePermissions`.

### Mobile (`@turbohesap/mobile`)
- Expo (React Native), same `@turbohesap/shared` contracts; `src/lib/api.ts`
  passes an absolute `baseUrl` + AsyncStorage `getAccessToken`. Config via
  `EXPO_PUBLIC_*` in `mobile/.env`. `metro.config.js` is monorepo-aware.

---

## 7. Roles & permissions (RBAC) — the system in full

Authorization is **role-based with explicit permissions**, consistent across all
three layers. Read this before touching anything auth-related.

### The model
- **User ↔ Role ↔ Permission** (many-to-many, in PostgreSQL). A user has roles; a
  role has permissions and **belongs to a module** (`RoleDto.module`).
- **Permission key:** `<module>.<resource>.<action>` — e.g. `iam.users.read`,
  `iam.users.write`. Convention: reads require `.read`, mutations `.write`.
- **Effective permissions** = the union of all the user's roles' permissions.

### Who owns what (the three layers)
| Layer | Role in RBAC | Where |
| ----- | ------------ | ----- |
| **shared** (`@turbohesap/shared`) | only the **contracts** that carry roles/permissions: `RoleDto`, `PermissionDto`, `CurrentUser.roles`, and `IAuthService.permissions()`. No logic. | `shared/src/modules/iam`, `…/auth` |
| **backend** (`@turbohesap/backend`) | the **source of truth**: permission catalog, RBAC entities, resolution, and enforcement. | `backend/src/...` (below) |
| **frontend / mobile** | a **UX layer**: fetch the permission list and show/hide accordingly. Never the security boundary. | `frontend/src/lib/auth/...` |

### Backend — declared, seeded, resolved, enforced
1. **Declare per module:** `backend/src/modules/<module>/<module>.permissions.ts`
   exports a `PermissionDef[]`; aggregate every module's list in
   `backend/src/permissions.catalog.ts` (`PERMISSION_CATALOG`, `ALL_PERMISSION_KEYS`).
2. **Auto-seed on boot:** `SeedService.seedPermissions()` upserts the catalog into
   the `permissions` table — **missing keys are inserted automatically** (logs
   "N yeni izin veritabanına eklendi"). Declaring a key + restart is all it takes;
   the `admin` role auto-covers every key.
3. **Token = roles only.** The access token carries `sub, username, roles` — no
   permissions, so it never bloats (`token.service.ts`).
4. **Resolve from the DB:** `AccessService.permissionKeys(userId)` computes a
   user's effective permissions from their roles
   (`modules/iam/access.service.ts`).
5. **Enforce with two global guards** (`app.module.ts`): `JwtAuthGuard` (authn) →
   `PermissionsGuard` (authz). `PermissionsGuard` reads `@RequirePermissions(...)`
   and calls `AccessService` **per request**. To protect a route, **just add the
   decorator** — no per-controller `@UseGuards`:
   ```ts
   @RequirePermissions('inventory.products.write')   // ALL listed keys required
   @Post()
   create(@Body() dto: CreateProductDto) { … }
   ```
   No `@RequirePermissions` → any valid token passes; `@Public()` → no token.
6. **Expose to clients:** `GET /api/auth/permissions` returns the caller's
   effective keys (same source the guard uses).

> Because permissions are resolved from the DB (not the token), editing a role's
> permissions takes effect on the **next request** — no re-login, no token bloat.

### Frontend — UX only, mirror the same keys
- After login/refresh the `AuthProvider` calls `api.auth.permissions()` and caches
  the list (localStorage `turbohesap-permissions`); `useAuth().permissions` reads
  from there. Roles come from the token / `me`.
- **Imperative:** `useAuth().hasPermission('…')` · `hasAnyPermission` ·
  `hasAllPermissions` (and `hasRole` · `hasAnyRole` · `hasAllRoles`).
- **Declarative inline:** `<Can permission="…">…</Can>` — hide buttons/actions.
- **Page guard:** `<PermissionRequired permission="…">…</PermissionRequired>`
  shows a "Yetkiniz yok" state; pair it with `enabled: hasPermission('…')` on
  queries so no request fires without access.
- **Navigation:** a nav item's `permission` makes the sidebar, module rail and
  command palette auto-hide what the user can't reach (`lib/auth/access.ts`).
- **This is presentation only.** A tampered client still hits the backend guard →
  `403`. Always use the **identical key** on the button and the controller.

### Add a permission end-to-end (checklist)
1. **Backend:** add the key to the module's `<module>.permissions.ts` (auto-seeds;
   admin gets it) and put `@RequirePermissions('<module>.<resource>.<action>')` on
   the route. Restart so it seeds.
2. **Frontend:** gate the matching UI with the **same key** — `hasPermission` /
   `<Can>` for actions, `permission` on the nav item, `<PermissionRequired>` +
   query `enabled` for the page.
3. **Assign** the permission to a role via `/iam/roles` (the role's module +
   permission checklist). Users with that role get it on their next request.

---

## 8. Build, run, develop

Driven from the root **`Makefile`** (`make help`):

| Command              | What it does                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `make env`           | create `.env` from `.env.example`                                 |
| `make install`       | install all workspace dependencies (pnpm)                        |
| `make dev`           | shared (watch) + NestJS API (:5800, restarts on change) + Vite (:5173, proxies `/api`) |
| `make dev-shared`    | recompile `@turbohesap/shared` on change (watch)                 |
| `make dev-frontend`  | Vite dev server (`:5173`)                                        |
| `make dev-backend`   | NestJS API in watch mode (`:5800`)                               |
| `make build`         | shared + frontend + backend                                      |
| `make run`           | build shared + frontend, run the NestJS backend serving them     |
| `make run-prod`      | build everything, run the compiled server                        |
| `make lint`          | eslint (frontend) + `tsc --noEmit` (backend)                     |

Mobile: `pnpm --filter @turbohesap/mobile start`.

> **Dev login works through Vite's proxy** (`vite.config.ts` proxies `/api` →
> `:5800`), so the SPA on `:5173` talks to the backend exactly like the built
> single-port app. Always run **both** servers (`make dev`); the frontend alone
> can't log in. Changing a `shared` contract during dev needs a backend restart
> (Nest watches `backend/src`, not `shared/dist`).

---

## 9. Configuration

Backend + frontend config is the root **`.env`** (`@nestjs/config` reads `.env`
then `../.env`; Vite reads the `VITE_`-prefixed vars; the Makefile loads it for
recipes). Mobile is separate (`mobile/.env`, `EXPO_PUBLIC_*`).

| Variable               | Default | Meaning                                          |
| ---------------------- | ------- | ------------------------------------------------ |
| `HOST` / `PORT`        | `0.0.0.0` / `5800` | bind interface / port                 |
| `APP_ENV`              | `development` | `development` \| `production`               |
| `STATIC_CACHE_MAX_AGE` | `3600`  | max-age (s) for static assets                    |
| `DATABASE_URL`         | `postgres://postgres:postgres@localhost:5432/turbohesap` | PostgreSQL DSN |
| `DB_SYNCHRONIZE`       | `true` (dev) | TypeORM auto-create tables (off in prod)    |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders | JWT signing secrets — change in prod |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | token lifetimes (seconds or ms-string) |
| `SEED_ADMIN_USERNAME/PASSWORD/EMAIL` | `admin` / `Admin123!` / `admin@turbohesap.local` | first-boot admin |
| `VITE_API_BASE_URL`    | `/api`  | frontend: API base the shared client builds from |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5800/api` | mobile API base (`mobile/.env`) |

### Endpoints
- `GET /api/health` — liveness + DB connectivity.
- `POST /api/auth/login|refresh|logout`, `GET /api/auth/me`,
  `GET /api/auth/permissions` — local auth (§5). Token carries roles; permissions
  come from the `permissions` endpoint.
- `/api/iam/users`, `/api/iam/roles`, `/api/iam/permissions` — IAM CRUD,
  permission-protected.

---

## 10. Conventions recap for agents

- **Contracts first, by module:** when changing the API, edit
  `shared/src/modules/<module>/` (`*.dto.ts` → `*.service.ts` → `*.client.ts`),
  register in `core/api.ts`, and rebuild shared — so backend and clients stay in
  lockstep. `shared` holds **only** DTOs + service interfaces (+ their axios
  clients): no React, no Nest, no TypeORM there.
- **API shape:** keep `/api/<module>/<resource>`; mirror the module across
  `shared/`, `backend/src/modules/`, and `frontend/src/modules/`.
- **Backend:** keep `pnpm --filter @turbohesap/backend typecheck` clean; protect
  routes by **just adding `@RequirePermissions('<module>.<resource>.<action>')`**
  (the global `PermissionsGuard` enforces it — server is the real access
  boundary); return shared DTO types; Turkish seed data. Declare each module's
  permissions in its `<module>.permissions.ts` and add them to
  `permissions.catalog.ts` — they auto-seed on boot.
- **Same key both sides:** use the identical permission key on the frontend
  (nav `permission` / `<Can>` / `<PermissionRequired>`, UX only) and on the
  backend route (`@RequirePermissions`, the enforced check).
- **Frontend:** follow `DESIGN.md` and the `*-component` / `*-page` skills; verify
  with `tsc -b` + a build.
- **Never break the static contract:** `backend/static/` must always contain a
  self-contained `index.html` (the tracked placeholder).
- Update **this file**, **`DESIGN.md`**, and the **skills** when structure,
  conventions, or the build pipeline change.

---

## 11. Roadmap

- More ERP feature modules (each mirrored across `shared/` + `backend/` +
  `frontend/`, communicating only through `@turbohesap/shared`).
- Production hardening: TypeORM migrations, rate limiting, refresh-token reuse
  detection, audit logging.
- Full mobile auth screens + secure token storage.
- CI: lint + typecheck + build across all workspaces.
```

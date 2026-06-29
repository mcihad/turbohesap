# AGENTS.md — TurboHesap System Guide

This file is the entry point for any agent (or human) working in this repository.
It describes **what the system is, how it is wired together, and how to build,
run, and extend it.** For the frontend *design system* (tokens, components,
layout) the authoritative document is **`DESIGN.md`**; this file covers the
**whole system** — the shared contract layer + NestJS backend + frontend + mobile.

> **How you must operate is in `agy.md`** — a strict, example-driven operating
> manual (contracts-first workflow, build-after-every-step, permission gating,
> migrations, and the **mandatory HTTP endpoint-testing-with-a-real-token**
> protocol). `AGENTS.md` = system facts; `agy.md` = the binding way of working.
> Read `agy.md` before writing code.

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
│       │   ├── pos/            # registers/sessions/orders/tables .dto/.service/.client + pos.permissions.ts + pure pos-pricing.helpers.ts
│       │   └── health/         # health.dto.ts · health.service.ts · health.client.ts
│       └── index.ts        # barrel: re-exports core + every module
├── frontend/               # @turbohesap/frontend — the React SPA
│   └── src/
│       ├── lib/api.ts          # the app's createTurbohesapApi() instance
│       ├── components/dashboard/   # echart.tsx + chart-card.tsx (Apache ECharts) — the shared charting primitive
│       ├── modules/<module>/   # per-module UI: module.config.ts (nav) + pages/ (e.g. modules/pos/)
│       └── routes/
│           ├── _authed/pos/    # in-shell admin pages (dashboard, registers, floors, modifiers)
│           ├── _pos.tsx + _pos/ # FULL-SCREEN POS terminal route group (own chrome, no AppShell — see §6)
│           └── pos.login.tsx   # POS PIN login (OUTSIDE the _pos auth gate)
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
│   │       ├── iam/        # users, roles, permissions → /api/iam/<resource>; iam.permissions.ts + seeding
│   │       ├── sales/      # sales channels → /api/sales/channels (master data; later used by products)
│   │       ├── org/        # branches → /api/org/branches (locations; users are authorized per branch)
│   │       ├── lookups/    # generic key/value reference lists → /api/lookups (LookupSelect consumes these)
│   │       ├── inventory/  # category TREE (+ per-category custom field schema, jsonb) + products/stock + modifiers → /api/inventory/{categories,products,modifiers}
│   │       └── pos/        # registers, sessions, orders, floors/tables → /api/pos/<resource>; order settle posts stock+finance+cari in one tx
│   └── static/             # frontend build output, served by NestJS
│       └── index.html      # tracked placeholder (overwritten by the real build)
└── mobile/                 # @turbohesap/mobile — Expo app (src/lib/api.ts, tokens.ts; src/modules/pos/ POS screens)
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
- **Application cache (analytics):** a pluggable `CacheDriver` (`backend/src/cache/`)
  backs the per-module report endpoints. The store is chosen by `CACHE_STORE`
  (`memory` default — zero-config in-process; or `redis` / `memcached` via env),
  mirroring the files `STORAGE_DRIVER` `useFactory` pattern. `@Global() CacheModule`
  exposes the `CACHE_DRIVER` token; expensive aggregations are wrapped in
  `cache.wrap(key, ttl, fn)`. `redis`/`memcached` clients (`ioredis`/`memjs`) are
  lazy-loaded only when selected, so the default needs nothing extra.

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
│   ├── errors.ts               # ApiError shape + toApiError(err) normalizer
│   └── api.ts                  # createTurbohesapApi(config) → { auth, iam:{…}, health, http }
└── modules/<module>/           # everything a module's API needs
    ├── <name>.dto.ts           # DTOs (data transfer objects) — the wire shapes
    ├── <module>.permissions.ts # permission KEY constants (e.g. IamPermissions) — typed, shared
    ├── <name>.service.ts       # service INTERFACE (the contract, I<Name>Service)
    ├── <name>.client.ts        # axios implementation of that interface
    ├── <name>.helpers.ts       # OPTIONAL pure domain helpers shared by web + mobile
    └── index.ts                # re-exports the module's contracts
```

Each module folder contains the **two things the user asked to keep here**:
**DTOs** and **service interfaces** (with their axios client implementations
alongside). Examples today:

| Module   | DTOs                                                         | Service interfaces |
| -------- | ---------------------------------------------------------- | ------------------ |
| `auth`   | `LoginRequest`, `AuthTokens`, `LoginResponse`, `Refresh/LogoutRequest` | `IAuthService` |
| `iam`    | `UserDto`, `CurrentUser`, `RoleDto`, `PermissionDto`, `Create/Update*Request` | `IUsersService`, `IRolesService`, `IPermissionsService` |
| `pos`    | `PosRegisterDto`, `PosSessionDto`, `PosOrderDto`, `PosTableDto`/floors (+ pure `pos-pricing.helpers`) | `IPosRegistersService`, `IPosSessionsService`, `IPosOrdersService`, `IPosTablesService` |
| `health` | `HealthStatus`                                             | `IHealthService` |

> **POS in the contract layer:** `shared/src/modules/pos/*` carries the
> registers/sessions/orders/tables DTOs + service interfaces + axios clients,
> `pos.permissions.ts`, and the **pure** `pos-pricing.helpers.ts` (line/discount
> math shared by web + mobile). It is wired into `core/api.ts` as a grouped
> `api.pos.{registers,sessions,orders,tables}` and listed in `core/app-modules.ts`.
> Product **modifiers** are part of `inventory` (`shared/src/modules/inventory/product-modifier.*`),
> exposed as `api.inventory.modifiers`.

### Rules that keep separation clean

- **One entry point:** consumers import only from the barrel `@turbohesap/shared`
  (never deep paths). `createTurbohesapApi(config)` returns one typed object where
  **resources are grouped by module** — `{ auth, iam: { users, roles, permissions },
  health, http }` — mirroring `/api/<module>/<resource>` and avoiding resource-name
  collisions across modules. Consumers depend on the **interfaces**, not the axios
  classes (e.g. `api.iam.users.list()`).
- **Permission keys are typed shared constants** (`<module>.permissions.ts`, e.g.
  `IamPermissions.usersWrite === 'iam.users.write'`). Backend and frontend both
  import them — a rename is a compile error, not silent drift. See §7.
- **Errors are one shape:** `ApiError` (`core/errors.ts`); every endpoint returns
  it (backend global filter), and `toApiError(err)` normalizes any thrown value on
  the client.
- **DTOs are framework-agnostic types** — plain interfaces, no React, no Nest, no
  TypeORM. The backend imports the same DTOs and returns them from controllers,
  so the server and clients can never drift.
- **Pure domain helpers may live in shared too** (`<name>.helpers.ts`) when web
  **and** mobile need the *same* logic over the DTOs — e.g.
  `inventory/category.helpers.ts` (`effectiveFieldDefs`) and
  `inventory/product-filters.ts` (`filterProducts`, client-side faceted search).
  Same hard rule as DTOs: **pure functions only, no React/Nest/TypeORM, no I/O** —
  they operate on shared types so both clients stay in lockstep. Anything
  framework- or platform-specific stays in `frontend/`/`mobile/`, never here.
- **Cross-module references go through DTOs** (e.g. `auth`'s `LoginResponse`
  embeds `iam`'s `CurrentUser`; `iam`'s `UserDto.branches` embeds `org`'s
  `BranchSummary`). A module never imports another module's client or backend
  service. The one sanctioned exception is a genuine **entity relationship**: the
  `iam` `User` entity has a `@ManyToMany` to the `org` `Branch` entity (join table
  `user_branches`) so a user's authorized branches are a real FK, not a loose id
  list — the backend imports the `Branch` *entity* (a data shape) for the relation
  and its repository, but still never the `org` *service*. Set a user's branches
  via `branchIds` on create/update (`/api/iam/users`).
- **Per-platform config** is all that differs between web and mobile: `baseUrl`
  (`/api` on web, absolute on mobile), `getAccessToken` (localStorage /
  AsyncStorage, may be async), optional `onUnauthorized`.
- **Dual build:** `tsc` emits ESM (`dist/esm`, for Vite/Metro — real named
  exports) and CJS (`dist/cjs`, for NestJS `require`). `package.json` `exports`
  routes `import`→esm and `require`→cjs. Don't collapse this back to a single
  build (dev would break on named exports).

### Adding a module end-to-end (the separation contract)

1. **Contracts** — `shared/src/modules/<module>/`: add `*.dto.ts`,
   `<module>.permissions.ts` (typed permission **key constants**, e.g.
   `<Mod>Permissions`), `*.service.ts` (the `I<Name>Service` interface),
   `*.client.ts` (axios impl), and `index.ts`. Export the folder from
   `shared/src/index.ts`, and register the new client in `shared/src/core/api.ts`
   (add it to `TurbohesapApi` — grouped per module — + the factory). If the module
   needs to appear in the rail / role dropdown, add it to `core/app-modules.ts`.
   Rebuild: `make build-shared`.
2. **Backend** — `backend/src/modules/<module>/`: entities, service(s), and a
   controller `@Controller('<module>/<resource>')` that returns the shared DTO
   types. Declare the permission **definitions** (shared key + Turkish description)
   in `<module>.permissions.ts` and add them to `src/permissions.catalog.ts` (they
   auto-seed on boot — see §5/§7); protect routes with
   `@RequirePermissions(<Mod>Permissions.<resource>Write)`. Import the module in
   `app.module.ts`.
3. **Frontend** — `frontend/src/modules/<module>/module.config.ts` (icon + nav,
   with `permission: <Mod>Permissions.<resource>Read`) registered in
   `src/modules/registry.ts`, pages in `pages/`, thin route files under
   `src/routes/_authed/<module>/`. Call the API via `api.<module>.<resource>.<method>()`;
   gate UI with `useAuth().hasPermission(<Mod>Permissions.…)`.

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
  (`src/permissions.catalog.ts` — keys from `@turbohesap/shared`, Turkish
  descriptions in each `<module>.permissions.ts`), the system roles
  (`admin`, `user`), and a default admin user from `SEED_ADMIN_*` — idempotent.
- **`pos`** (`/api/pos`): `registers`, `sessions`, `orders` (+ split orders),
  `floors`/`tables`. An order **settle** (`PosOrdersService.settleInTx`, inside one
  `this.orders.manager.transaction`) posts in a **single transaction**: stock
  movements, a finance entry (kasa/banka per tender), and a cari ledger entry —
  the **same atomic pattern as `invoices`**. It reverses cleanly: stock via
  `StockMovementsService.reverseSource(em, 'pos', orderId)`, and the
  finance/contact rows by the `financeTransactionId`/`contactTransactionId` stored
  on each `PosPayment`. Product **modifiers** are not a POS table — they live in
  `inventory` (`ProductModifierGroup`/`Option`/`Link`, `/api/inventory/modifiers`).
- **POS PIN auth** (additions on `auth`/`iam`): the `User` entity gains
  `isPosUser` and `posPinHash` (`select:false`). New endpoints on `/api/auth`:
  `pos-login` (`@Public()` + tight `@Throttle`, username+PIN → opens the terminal),
  `pos-switch` (fast cashier switch by PIN on an already-authenticated device), and
  `pos-pin` (caller sets/changes their own PIN). See `pos.users.pin` in §7.
- **Errors:** a global exception filter (`common/filters/all-exceptions.filter.ts`,
  wired in `main.ts`) normalizes every thrown error to the shared `ApiError`
  (`{ statusCode, error, message, details? }`); validation arrays collapse to a
  single `message` + `details`. (Health is the one endpoint that returns its own
  body on 503 via `@Res` so its `HealthStatus` shape is preserved.)

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
- **DB:** TypeORM is global with **`synchronize` off** — the schema is owned by
  **migrations** (see §5.1). Pending migrations run on boot (`DB_MIGRATIONS_RUN`,
  default on); the seed then upserts permissions/roles/admin.

### 5.1 Migrations
The schema is managed by TypeORM migrations, not auto-synchronize.

- **Files:** `backend/src/migrations/*.ts`, compiled to `dist/migrations/*.js`.
  The CLI uses a standalone DataSource at `backend/src/data-source.ts`; the NestJS
  runtime config (`database/database.module.ts`) points at the same migrations glob
  with `migrationsRun` from `DB_MIGRATIONS_RUN`.
- **After changing any entity** (new module, new column, new index), generate a
  migration and commit it:
  ```bash
  make migration-generate NAME=AddInventoryProducts   # diffs entities ↔ DB
  make migrate                                         # apply (also runs on boot)
  make migration-revert                               # undo the last one
  ```
  `migration-generate` diffs the entities against the **current** DB, so run it
  against an up-to-date local DB. Review the generated SQL before committing.
- **Boot behaviour:** with `DB_MIGRATIONS_RUN=true` (default) the app applies any
  pending migrations at startup. For multi-instance deploys set it to `false` and
  run `make migrate` once out-of-band before rolling out.
- **Fresh install:** an empty DB is fully provisioned by the migrations on first
  boot; the initial `Init` migration enables `uuid-ossp` and creates every table.
- **snake_case DB identifiers:** a `SnakeNamingStrategy` (set in both
  `data-source.ts` and `database.module.ts`) maps camelCase entity properties to
  snake_case **columns/join-columns** (`passwordHash` → `password_hash`,
  `userId` → `user_id`). Entity property names and the **JSON API stay camelCase**
  (services map entity → shared DTO), so this is a DB-only convention. Don't add
  `@Column({ name: '…' })` overrides — let the strategy do it consistently.

### 5.2 Audit & error logging (cross-cutting, under `iam`)
Two always-on observability mechanisms live in the `iam` module (surfaced in the
UI under **Yönetim → İzleme**: `/iam/audit-logs`, `/iam/error-logs`).

- **Audit log** (`audit_logs`): a global TypeORM subscriber
  (`modules/iam/audit/audit.subscriber.ts`) records every Insert/Update/Delete of
  tracked entities in the **same transaction**, with a field-level diff
  (`{ field, oldValue, newValue }[]`). It self-registers on the DataSource.
  - **Opt-out / config** lives in `audit/audited-entities.ts`:
    `IGNORED_AUDIT_ENTITIES` (AuditLog/ErrorLog/RefreshToken — never audited, avoids
    recursion), `REDACTED_AUDIT_FIELDS` (passwordHash… → `***`),
    `NOISE_AUDIT_FIELDS` (e.g. `lastLoginAt`-only updates are skipped), and
    `ENTITY_MODULE_MAP` (entity class → module label). **When you add an audited
    entity in a new module, add it to `ENTITY_MODULE_MAP`** so its rows are labelled.
  - **Who/where** comes from `RequestContext` (AsyncLocalStorage): seeded by
    `RequestContextMiddleware` (ip/method/path) and filled with userId/userName by
    `JwtAuthGuard`. Reads `GET /api/iam/audit-logs` (filters: entityType, entityId,
    module, action, userId, search, from/to; paged) require `iam.audit.read`;
    `…/entity/:type/:id` powers entity detail pages.
- **Error log** (`error_logs`): the global exception filter
  (`common/filters/all-exceptions.filter.ts`, registered via `APP_FILTER` for DI)
  persists every **5xx** to the error log via `ErrorLogsService.capture`, deduped by
  a fingerprint hash (type+message+first frame) — repeats bump `occurrenceCount` /
  `lastSeenAt` instead of inserting. `origin` is `server` or `client`.
  - **Client errors:** the SPA reports unhandled errors / rejections / React
    render errors to `POST /api/iam/error-logs/client` (**`@Public()`**) via
    `frontend/src/lib/errors/` (`installGlobalErrorHandlers` + `ErrorBoundary`,
    wired in `main.tsx`; locally throttled).
  - Reads `GET /api/iam/error-logs` need `iam.errors.read`; triage
    (`PATCH …/:id` → `status` + `developerNotes`) needs `iam.errors.write`;
    deleting (`DELETE …/:id`) needs `iam.errors.delete` (a destructive button in
    the detail drawer, gated by that permission).
  - **Testing:** the error-logs page header has a top-right **"Hata fırlat"**
    dropdown that throws genuine client errors (TypeError / unhandled rejection)
    and calls `GET /api/debug/error/{runtime,http,db}` (`modules/debug`,
    authenticated, real errors) — safe to delete the menu + controller.
- **Reuse:** the `AuditTrail` UI primitive (`components/ui/audit-trail.tsx`) renders
  a timeline of `AuditLogDto[]`; `EntityAuditTrail` (`modules/iam/components`)
  self-fetches by entity for detail pages.

### 5.3 Hardening (security, validation, observability)
- **Rate limiting:** global `ThrottlerGuard` (`@nestjs/throttler`,
  `THROTTLE_TTL`/`THROTTLE_LIMIT`, default 300/min/IP, in-memory — use a shared
  store for multi-instance). Tighter per-route via `@Throttle(...)`: login 10/min,
  public client-error report 30/min.
- **Headers/CORS:** `helmet` (CSP off — tune before prod); CORS from
  `CORS_ORIGINS` (open in dev, same-origin in prod unless an allowlist is set).
- **Config safety:** `assertProductionConfig()` (main.ts) refuses to boot in
  production while JWT secrets / seed admin password are the dev defaults.
  `app.enableShutdownHooks()` for graceful shutdown.
- **Validation:** global `ValidationPipe({ whitelist, forbidNonWhitelisted,
  transform })` — unknown body/query fields → 400. List filters use validated
  query DTOs (`*-query.dto.ts`).
- **Refresh-token reuse detection:** presenting an already-rotated (revoked)
  refresh token revokes the user's whole active token family (`auth.service.ts`).
- **Docs:** OpenAPI at **`/api/docs`** (JSON `/api/docs-json`); the
  `@nestjs/swagger` CLI plugin (`nest-cli.json`) derives schemas from DTOs.
- **Observability:** per-request correlation id (`X-Request-Id`, in
  `RequestContext`), one HTTP log line per request (`LoggingInterceptor`).
- **Conventions:** entities should extend `common/entities/base.entity.ts`
  (`BaseEntity`: uuid id + created/updated). Paginated list endpoints return the
  shared `Page<T>` with a validated `PageQuery` (see audit/error logs); use this
  for any list that can grow (small bounded lists like roles may stay arrays).

### 5.4 Platform subsystems (files, settings, lookups)
Three cross-cutting subsystems are already built. **Reuse them — never reinvent.**

- **File management** (`backend/src/modules/files/` → `/api/files`). Polymorphic
  attachments for **any** entity: bytes are stored under a **random** `storedName`,
  the `files` table (`@Index(['entityType','entityId'])`) keeps `originalName` +
  metadata. Two backends chosen by `.env` (`FILE_STORAGE=local|s3`) behind a
  `StorageDriver` interface (`LocalStorageDriver` / `S3StorageDriver`, injected via
  the `STORAGE_DRIVER` token). Permissions `FilesPermissions.read|write`. Routes:
  `POST /api/files` (multipart `files[]` + `entityType,entityId,kind,sortOrder`,
  write), `GET /api/files?entityType=&entityId=` (read), `PATCH/DELETE /api/files/:id`
  (write), and `GET /api/files/raw/:storedName` (**`@Public()`** — the unguessable
  name is the capability, so it works directly in `<img>`). Shared client:
  `api.files` (incl. `rawUrl(storedName)`). **To attach files/images to a new
  entity, write zero backend code** — render `<FileManager>` (web) /
  `<ImageManager>` (mobile) with that `entityType` + row id. See `agy.md` §8.
- **Settings** (`backend/src/modules/settings/` → `/api/settings`). Per-user jsonb
  key/value store with an in-memory **read-through/write-through cache**
  (`user_settings`, unique `(userId, type)`). `GET/PUT/DELETE /api/settings/:type`
  (authenticated, no extra permission). Shared: `api.settings.get/set/remove`. The
  DataGrid uses it to persist each grid's layout per user (`grid:<gridId>`).
- **Lookups** (`backend/src/modules/lookups/` → `/api/lookups`). Generic
  user-managed key/value reference lists (units, colours…). Use this for **any**
  small enumerated list instead of a bespoke table/module. `GET /items` (`?list=`),
  `GET /lists`, `GET /items/:id`, `POST/PATCH/DELETE /items[/:id]`
  (`LookupsPermissions.read|write`). Web/mobile `LookupSelect` and category
  `lookup` fields consume them.

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
- **Full-screen route group (POS terminal):** a surface that needs its own chrome
  instead of the app shell gets its own pathless layout next to `_authed`.
  `routes/_pos.tsx` is the auth gate (mirrors `_authed.tsx` — redirects
  unauthenticated users, but to the PIN login `/pos/login` instead of `/login`) yet
  renders **no `AppShell`** (no sidebar/rail/navbar); its children
  (`routes/_pos/pos.sell.$registerId.tsx`, …) are the terminal. The PIN login
  `routes/pos.login.tsx` lives **outside** the gate so it's reachable while logged
  out. Because the rail/command-palette navigate to a module's `home`, a module
  with a full-screen surface must set `home` to an **in-shell** dashboard
  (`pos.module.config.ts` → `/pos/dashboard`, under `_authed/pos/`) — never the
  full-screen route — so the admin pages (registers, floors, modifiers) stay
  reachable from the normal shell.
- **Every web list/table is the DataGrid** (`src/components/data-grid/`) — the
  single table primitive. TanStack-Table based, it gives search, per-column
  filters, sorting, grouping, drag column reorder, a scrollable column chooser,
  pin left/right, row selection, row-click → detail, pagination, and **tree mode**
  (`getSubRows` + `treeColumnId` + `defaultExpanded`). Its layout is **persisted
  per user** via the settings API (`gridId` → `grid:<gridId>`). Pass a unique
  `gridId`, `columns`, `data`, `getRowId`, and put actions in the `toolbar` prop;
  use `search` to avoid a second search box, `fillHeight` for full-height pages,
  `rowClassName` for a just-saved highlight. **List/grid pages carry no
  `<PageHeader>` band** (the title is in the breadcrumb) — actions live on the grid
  toolbar; `PageHeader` is for **detail** pages (title + `audit` + actions).
  Create/edit happen in a `Dialog` that **saves only on submit**, then
  `invalidate`s the query (in-place refresh, no reload). Examples:
  `modules/org/pages/branches-page.tsx` (basic), `…/inventory/pages/categories-page.tsx`
  (tree), `…/inventory/pages/products-page.tsx` (advanced filter + `fillHeight`).
- **Files/images:** render `<FileManager entityType entityId kind="image"|"file"
  canWrite>` (`src/modules/files/components/file-manager.tsx`) — it talks to the
  files API; images use `api.files.rawUrl(storedName)`. No per-entity backend work.
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
- Expo (React Native 0.85 / React 19), same `@turbohesap/shared` contracts;
  `src/lib/api.ts` passes an absolute `baseUrl` + AsyncStorage `getAccessToken`.
  Config via `EXPO_PUBLIC_*` in `mobile/.env`. `metro.config.js` is
  monorepo-aware. Run with `make dev-mobile` (`mobile-ios` / `mobile-android`);
  type-check with `make mobile-typecheck`.
- **The mobile design system is documented in `mobile_design.md`** (the RN
  counterpart of `DESIGN.md`) — read it before touching mobile UI. In brief:
  a TS **token system** (`src/theme/tokens.ts` + `theme-context.tsx`: palette,
  spacing, radius, type, elevation, light/dark + system mode), token-driven UI
  **primitives** (`src/components/*`, Feather icons, no heavy UI lib), and a
  dependency-free **tab + stack navigator** (`src/navigation/*`: a bottom tab per
  accessible module + Profil, per-tab stacks, a screen registry).
- **Same RBAC as the web.** `src/lib/auth/` mirrors the frontend: `auth-provider`
  stores the session and fetches permissions separately via
  `GET /api/auth/permissions`; `useAuth()` exposes the identical
  `hasPermission`/`hasAnyPermission`/`hasAllPermissions`/`hasRole`/… surface.
  Visibility is gated with the **same `@turbohesap/shared` permission keys**:
  `access.ts` filters the tab bar + module home, `<Can>` (`can.tsx`) gates inline
  UI, `<PermissionRequired>` guards whole screens, and `useAsync(…, { enabled })`
  gates fetches. UX only — the backend re-checks every key.
- **Modules mirror the web** (`src/modules/<module>`): `genel` (dashboard,
  analytics), `iam` (users + detail, roles, permissions, audit logs, error logs),
  and `pos` (dashboard, registers, floors, modifier groups, sell + tender screens —
  the mobile POS terminal). Add a module/screen by following `mobile_design.md` §6 (build the screen,
  register its key in `navigation/screens.tsx`, add a permission-gated nav item in
  `modules/registry.ts`).
- **Images:** the reusable `src/components/image/` module mirrors the web
  FileManager — `<ImageManager entityType entityId canWrite layout>` (gallery, add
  via camera/library → edit → upload, reorder/cover/delete, tap → fullscreen),
  `<QuickImageAdd>` (compact strip), and `<ImageEditor>` (crop/rotate/flip + Skia
  colour-matrix bake). It uses the same `/api/files` endpoints. Its native deps
  (`@shopify/react-native-skia`, `expo-image-picker`, `expo-image-manipulator`,
  `expo-image`, `expo-file-system`) need `npx expo prebuild` + a dev build (not
  plain Expo Go).

---

## 7. Roles & permissions (RBAC) — the system in full

Authorization is **role-based with explicit permissions**, consistent across all
three layers. Read this before touching anything auth-related.

### The model
- **User ↔ Role ↔ Permission** (many-to-many, in PostgreSQL). A user has roles; a
  role has permissions and **belongs to a module** (`RoleDto.module`).
- **Permission key:** `<module>.<resource>.<action>` — e.g. `iam.users.read`,
  `iam.users.write`. Convention: reads require `.read`, mutations `.write`. Keys
  are **typed constants in shared** (`<module>.permissions.ts`, e.g.
  `IamPermissions.usersWrite`); backend and frontend import them — never hardcode
  the string.
- **Effective permissions** = the union of all the user's roles' permissions.

> **POS permission group** (`PosPermissions`, group "POS"):
> `pos.registers.read`/`write`, `pos.sell`, `pos.session.open`/`close`,
> `pos.discount.line`/`pos.discount.override`, `pos.price.override`, `pos.refund`,
> `pos.void`, `pos.drawer.open`, `pos.reprint`, `pos.reports`,
> `pos.kitchen.view`/`pos.kitchen.bump`, `pos.tables.manage`, `pos.settings`,
> `pos.users.pin`. Plus, on `inventory`, `inventory.modifiers.read`/`write` (the
> shared product-modifier catalog that POS consumes).

### Who owns what (the three layers)
| Layer | Role in RBAC | Where |
| ----- | ------------ | ----- |
| **shared** (`@turbohesap/shared`) | the **permission key constants** (`<Mod>Permissions`) + the contracts that carry roles/permissions (`RoleDto`, `PermissionDto`, `CurrentUser.roles`, `IAuthService.permissions()`). No logic. | `shared/src/modules/iam`, `…/auth` |
| **backend** (`@turbohesap/backend`) | the **source of truth**: permission catalog, RBAC entities, resolution, and enforcement. | `backend/src/...` (below) |
| **frontend / mobile** | a **UX layer**: fetch the permission list and show/hide accordingly. Never the security boundary. | `frontend/src/lib/auth/...` |

### Backend — declared, seeded, resolved, enforced
1. **Declare per module:** the **keys** are typed constants in
   `shared/src/modules/<module>/<module>.permissions.ts` (`<Mod>Permissions`); the
   backend's `backend/src/modules/<module>/<module>.permissions.ts` pairs each
   shared key with a Turkish description (`PermissionDef[]`), aggregated in
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
   @RequirePermissions(InventoryPermissions.productsWrite)   // ALL listed keys required
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
1. **Shared:** add the key constant to `shared/src/modules/<module>/<module>.permissions.ts`
   (`<Mod>Permissions`). Rebuild shared.
2. **Backend:** add a `PermissionDef` (the shared key + Turkish description) in the
   backend's `<module>.permissions.ts` (auto-seeds; admin gets it) and put
   `@RequirePermissions(<Mod>Permissions.<resource>Write)` on the route. Restart so
   it seeds.
3. **Frontend:** gate the matching UI with the **same constant** —
   `hasPermission(<Mod>Permissions.…)` / `<Can>` for actions, `permission` on the
   nav item, `<PermissionRequired>` + query `enabled` for the page.
4. **Assign** the permission to a role via `/iam/roles` (the role's module +
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
| `make test`          | backend unit tests (jest)                                        |
| `make test-e2e`      | backend e2e (boots the app; needs Postgres, uses `turbohesap_test`) |

Mobile: `pnpm --filter @turbohesap/mobile start`.

**Testing (backend):** Jest. **Unit** specs sit next to sources (`*.spec.ts`,
`jest.config.cjs`) — pure logic, no DB. **e2e** (`test/*.e2e-spec.ts`,
`jest-e2e.config.cjs`) boots the real app via `@nestjs/testing`+`supertest`
against a throwaway `turbohesap_test` DB (migrations + seed run on init). Run with
`make test` / `make test-e2e`.

**CI:** `.github/workflows/ci.yml` runs on every push/PR — `build` job (install,
build shared, lint frontend, typecheck backend + mobile, build frontend + backend,
**backend unit tests**) and an `e2e` job (Postgres service → backend e2e). Keep it
green; it's the safety net against cross-workspace drift.

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
| `DB_MIGRATIONS_RUN`    | `true`  | run pending migrations on boot (off for multi-instance) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders | JWT signing secrets — change in prod |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | token lifetimes (seconds or ms-string) |
| `SEED_ADMIN_USERNAME/PASSWORD/EMAIL` | `admin` / `Admin123!` / `admin@turbohesap.local` | first-boot admin |
| `VITE_API_BASE_URL`    | `/api`  | frontend: API base the shared client builds from |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5800/api` | mobile API base (`mobile/.env`; also runtime-overridable by double-tapping the login logo) |
| `CACHE_STORE`          | `memory` | analytics cache backend: `memory` \| `redis` \| `memcached` |
| `CACHE_TTL` / `CACHE_PREFIX` / `CACHE_MEMORY_MAX` | `60` / `th:` / `1000` | cache entry TTL (s) / key namespace / in-memory entry cap |
| `REDIS_URL` (or `REDIS_HOST/PORT/PASSWORD/DB`) | — | redis connection (only when `CACHE_STORE=redis`) |
| `MEMCACHED_SERVERS` (+ `MEMCACHED_USERNAME/PASSWORD`) | `127.0.0.1:11211` | memcached servers (only when `CACHE_STORE=memcached`) |

### Endpoints
- `GET /api/health` — liveness + DB connectivity.
- `POST /api/auth/login|refresh|logout`, `GET /api/auth/me`,
  `GET /api/auth/permissions` — local auth (§5). Token carries roles; permissions
  come from the `permissions` endpoint.
- `/api/iam/users`, `/api/iam/roles`, `/api/iam/permissions` — IAM CRUD,
  permission-protected.
- `/api/inventory/{categories,products}` — category tree (+ jsonb custom field
  schema) and products/stock.
- `/api/sales/channels`, `/api/org/branches`, `/api/lookups` — sales channels,
  branches (per-branch user authz), generic reference lists.
- `/api/finance/{cash-accounts,bank-accounts,transactions}` — kasa/banka + ledger
  (computed balances; `transactions.contactId` links a tahsilat/ödeme to a cari).
- `/api/contacts/{contacts,groups,persons,addresses,transactions,activities,opportunities}`
  — Cari/CRM: unified contacts (customer/supplier/both/lead), group tree, people,
  addresses, debit/credit ledger (Cari Ekstre → computed balance), CRM activities
  and the opportunity pipeline.
- `/api/invoices/invoices` (+ `/:id/issue`, `/:id/cancel`) — Türkiye-uyumlu fatura
  (satış/alış/iade): KDV + tevkifat (computed via the shared `invoice.helpers`
  `computeInvoiceTotals`), KDV özeti, gapless numbering + ETTN on issue, and
  cari-ledger posting (issue → cari borç/alacak; cancel reverses). The web entry
  is a dedicated page with a live line editor + inline cari/ürün create.
- `/api/pos/{registers,sessions,orders,tables}` (+ `/api/auth/pos-login|pos-switch`)
  — restaurant-capable POS: PIN/cashier auth, sessions (vezne: cash/card posted to
  kasa/banka in one aggregated finance entry **at session close**, cari + stock
  real-time), orders with modifiers + **bundle** components + per-unit tender split,
  returns (geri giriş), floors/tables. Server-authoritative pricing (§7.4 in agy.md).
  See `docs/pos.md`.
- `/api/reports/{overview,pos,inventory,finance,invoices,contacts,sales}` — per-module
  analytics, each returning the generic shared `ModuleStatsDto` (KPIs + trend +
  breakdowns + top lists), **cached** (§3 Caching policy), gated by the `reports.<module>`
  permission group. Web pages live under `/genel/analytics/*`.
- `/api/feedback` — in-app feedback (istek/talep/öneri/hata) with an annotated
  screenshot (stored via `/api/files`) and a triage status workflow; `feedback.create`
  / `feedback.read` / `feedback.manage`.
- `/api/files` — polymorphic uploads (`raw/:storedName` is `@Public()`);
  `/api/settings/:type` — per-user jsonb state (DataGrid layouts). See §5.4.

---

## 10. Conventions recap for agents

- **Contracts first, by module:** when changing the API, edit
  `shared/src/modules/<module>/` (`*.dto.ts` → `*.service.ts` → `*.client.ts`),
  register in `core/api.ts`, and rebuild shared — so backend and clients stay in
  lockstep. `shared` holds DTOs + service interfaces (+ their axios clients) and,
  when web **and** mobile need it, **pure** framework-agnostic domain helpers
  (`*.helpers.ts`): never any React, Nest, TypeORM, or I/O.
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
- **Reuse the platform subsystems (§5.4):** web tables → **DataGrid**; files/images
  → **files API + FileManager/ImageManager**; small enumerated lists → **lookups**;
  per-user UI state → **settings**. Never hand-roll a `<table>`, an uploader, or a
  reference-list table.
- **Test endpoints over HTTP with a real token** (`agy.md` §13) before calling
  backend work done: login via `POST /api/auth/login` (`admin`/`Admin123!` in dev),
  then `curl` every new/changed route incl. 401 (no token) and 400 (bad body)
  negative checks. A green build is not a test.
- **Never break the static contract:** `backend/static/` must always contain a
  self-contained `index.html` (the tracked placeholder).
- Update **this file**, **`DESIGN.md`**, and the **skills** when structure,
  conventions, or the build pipeline change.

---

## 11. Roadmap

- More ERP feature modules (each mirrored across `shared/` + `backend/` +
  `frontend/`, and on mobile per `mobile_design.md`, communicating only through
  `@turbohesap/shared`).
- Mobile: secure token storage (`expo-secure-store` instead of AsyncStorage), a
  `SessionWatcher` equivalent (proactive refresh), and push notifications.
- Grow the test suite (more unit + e2e coverage as modules land); frontend tests.

> **Done (don't re-litigate):** monorepo + contract-first shared, modular UI +
> rail, local JWT auth, DB-resolved RBAC with typed permission keys, per-module
> auto-seeded permission catalog, nested `api.<module>.<resource>`, shared
> `ApiError` contract, and CI.

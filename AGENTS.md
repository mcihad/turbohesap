# AGENTS.md — KentOS Console System Guide

This file is the entry point for any agent (or human) working in this repository.
It describes **what the system is, how it is wired together, and how to build,
run, and extend it.** For the frontend *design system* (tokens, components,
layout) the authoritative document is **`DESIGN.md`**; this file covers the
**whole system** — the shared contract layer + frontend + NestJS backend +
mobile.

> Status: this is a template under active development. The architecture below is
> the foundation we build on; expect the backend (API surface, persistence,
> auth) to grow over time.

---

## 1. What this is

KentOS Console is a **pnpm monorepo** where one **NestJS** process serves a rich
React single-page application together with its JSON API, and a typed
**`@kentos/shared`** package carries the API contracts so every client (web and
mobile) speaks to the backend the same way.

- **`@kentos/shared`** — framework-agnostic **DTO models**, **service
  interfaces**, and their **axios client implementations**. The single source of
  truth for the API shapes. Consumed by the web frontend and the mobile app; the
  NestJS backend imports the same DTOs.
- **`@kentos/frontend`** — a Vite + React 19 SPA (TanStack Router/Query, Tailwind
  v4, shadcn/ui). Compiles to static assets in `backend/static/`.
- **`@kentos/backend`** — a NestJS service (TypeScript) using **TypeORM**
  (PostgreSQL) and **jose** (Keycloak JWKS). It serves the compiled SPA
  (`backend/static/`) — deep-link fallback included — alongside `/api`, so the
  whole app runs from one Node process.
- **`@kentos/mobile`** — an Expo (React Native) app built on the **same
  `@kentos/shared` contracts** as the web frontend.

```
  shared (tsc → dist)  ──►  frontend (Vite build)  ──►  backend/static/  ──►  NestJS serves /api + SPA
        └────────────────►  mobile (Expo)  ── same contracts, absolute base URL ──┘
```

---

## 2. Repository layout

```
.
├── AGENTS.md            # this file — whole-system guide
├── DESIGN.md            # frontend design-system contract (tokens, components)
├── README.md            # quick start
├── Makefile             # convenience entry point over the pnpm scripts
├── package.json         # workspace root scripts (build/dev/lint)
├── pnpm-workspace.yaml   # workspaces: shared, frontend, backend, mobile
├── .env                 # local configuration (gitignored; shared by all but mobile)
├── .env.example         # template for .env (tracked)
├── docs/                # longer-form documentation
├── shared/              # @kentos/shared — the contract layer
│   └── src/
│       ├── models/      # DTOs (auth, user, module, health)
│       ├── services/    # service interfaces (IAuthService, IMeService, …)
│       ├── clients/     # axios implementations + createKentosApi()
│       └── http/        # createHttpClient (axios instance factory)
├── frontend/            # @kentos/frontend — the React SPA
│   ├── src/             # application source (see DESIGN.md; paths there are relative to here)
│   │   └── lib/api.ts   # the app's createKentosApi() instance
│   ├── vite.config.ts   # build.outDir → ../backend/static; envDir → repo root
│   └── package.json
├── backend/             # @kentos/backend — the NestJS service
│   ├── kentos.module.json  # MODULE MANIFEST (read at startup) — single source of truth
│   ├── nest-cli.json
│   ├── src/
│   │   ├── main.ts      # bootstrap: /api prefix, static serving + SPA fallback
│   │   ├── app.module.ts
│   │   ├── config/      # env-driven configuration
│   │   ├── module/      # manifest loader (reads kentos.module.json)
│   │   ├── auth/        # Keycloak OIDC: discovery, PKCE, exchange/refresh, JWKS verify
│   │   ├── common/      # KeycloakAuthGuard + @Roles()/@CurrentUser() decorators
│   │   ├── me/ metadata/ health/   # controllers
│   │   └── database/    # TypeORM (optional, registered only when DATABASE_URL set)
│   └── static/          # frontend build output, served by NestJS
│       └── index.html   # tracked placeholder (overwritten by the real build)
└── mobile/              # @kentos/mobile — Expo (React Native) app
    ├── App.tsx          # demo screen using @kentos/shared
    ├── src/lib/         # api.ts (createKentosApi) + tokens.ts (AsyncStorage)
    ├── app.json metro.config.js
    └── .env.example     # EXPO_PUBLIC_* (Expo reads mobile/.env, not the root .env)
```

**Module name:** `kentos-project-template` (manifest `name`). Rename it for a
real app with the **`init-module`** skill — see §9. (The `@kentos/*` workspace
package names are the org scope and stay fixed.)

---

## 3. How the pieces fit together

### Build pipeline
1. `make build-shared` runs `tsc` in `shared/`, producing `shared/dist` (CommonJS
   + `.d.ts`). Both the frontend and mobile import the compiled package; **rebuild
   it when you change a contract** (or run `make dev-shared` to watch).
2. `make build-frontend` runs Vite. `vite.config.ts` sets
   `build.outDir = ../backend/static`, so the compiled SPA lands directly in the
   directory NestJS serves (replacing the placeholder `index.html`).
3. `make build-backend` runs `nest build` → `backend/dist`.
4. `make build` does all three. `make run` builds shared + frontend and starts
   the NestJS server.

### Request flow at runtime
- `node backend/dist/main.js` boots NestJS with global prefix **`/api`**.
- Middleware: **CORS** enabled; `trust proxy` on (correct base URL behind a
  proxy).
- **`/api/*`** routes are handled by the NestJS controllers.
- Static assets in `backend/static/` are served by `useStaticAssets`
  (`index: false`).
- A final fallback middleware returns `index.html` for any non-`/api` `GET`/`HEAD`
  that didn't match a file, so client-side routing and deep links/reloads work
  (SPA fallback). Unknown `/api/*` paths are genuine `404`s.

### Caching policy
The frontend is rebuilt frequently, so caching is deliberately conservative:
- **`index.html`** (and the SPA fallback) → `Cache-Control: no-cache` (always
  revalidated, so a new build is picked up immediately).
- **All other assets** → `Cache-Control: public, max-age=<STATIC_CACHE_MAX_AGE>`,
  default **3600s (1 hour)**, configurable via `.env`. No `immutable`/year-long
  caching, on purpose.

### 3.1 Module manifest & metadata endpoint
Every app from this template is a **module** that declares its identity in
**`kentos.module.json`**. NestJS reads it at startup and serves it verbatim:

- **Single source of truth:** `backend/kentos.module.json` — the one and only
  copy. The manifest loader (`src/module/manifest.ts`) reads it from the
  filesystem (no build-time copy step), so editing the JSON — or using the
  `init-module` skill — is picked up on the next start. Fields:

  | Field         | Meaning                                                              |
  | ------------- | ------------------------------------------------------------------- |
  | `name`        | module identifier (slug). **Also the Keycloak client ID** — keep it stable and URL/realm-safe. Drives the metadata route. |
  | `displayName` | human-readable title shown in UIs                                   |
  | `description` | one-line description                                                |
  | `version`     | module version                                                      |
  | `icon`        | lucide icon name                                                    |
  | `address`     | **full public URL** where the module is served, e.g. `https://kentos.sivas.bel.tr` or `https://sivas.bel.tr/kentos` |
  | `roles`       | roles the module defines/uses                                       |
  | `api.version` | API version segment used in the metadata route (`v1`)              |

  The `ModuleManifest` DTO (`@kentos/shared`) keeps an index signature, so any
  extra fields you add are typed loosely and served as-is.
- **Endpoint:** `GET /api/<api.version>/<name>/metadata` returns the manifest
  JSON. With the defaults that is **`/api/v1/kentos-project-template/metadata`**.
  The route is computed from the manifest at startup, so it tracks the module
  name.

---

## 4. The shared contract layer (`@kentos/shared`)

This is the heart of the "write once, use on web and mobile" design. It has three
layers, all under `shared/src/`:

| Layer        | Path        | What                                                       |
| ------------ | ----------- | ---------------------------------------------------------- |
| **models**   | `models/`   | DTOs — the wire shapes (`AuthTokens`, `CallbackResponse`, `CurrentUser`, `ModuleManifest`, `HealthStatus`, …). |
| **services** | `services/` | Framework-agnostic interfaces (`IAuthService`, `IMeService`, `IMetadataService`, `IHealthService`). |
| **clients**  | `clients/`  | axios implementations of those interfaces + `createKentosApi()`. |

- **One entry point:** `createKentosApi(config)` builds a configured axios
  instance (`createHttpClient`) and wires every service client, returning
  `{ auth, me, metadata, health, http }`. Consumers depend on the **interfaces**,
  not the concrete classes.
- **Per-platform config** is all that differs:
  - `baseUrl` — `/api` (same-origin) on web; an absolute URL on mobile.
  - `getAccessToken` — localStorage on web, AsyncStorage on mobile (may be async).
  - `onUnauthorized` — optional 401 hook.
  - `moduleName` / `apiVersion` — used to build the metadata path.
- **Build:** compiled with `tsc` to `dist` (CommonJS + types). The backend
  imports only the **DTOs** from here (`import type { AuthTokens } from
  '@kentos/shared'`) so the server and clients never drift.

**Adding an endpoint end-to-end:** add the DTO(s) in `models/`, the method on the
relevant interface in `services/`, the axios call in the matching `clients/`
class, rebuild shared, then implement the NestJS controller (§5).

---

## 5. Backend stack & conventions (NestJS)

| Concern        | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| Framework      | **NestJS 11** (`@nestjs/core`, platform-express)        |
| Database       | PostgreSQL via **TypeORM** (`@nestjs/typeorm`, `pg`)    |
| Config         | `@nestjs/config` + `src/config/configuration.ts`        |
| Auth/JWKS      | **jose** (`createRemoteJWKSet` + `jwtVerify`)           |
| Static/SPA     | `useStaticAssets` + a fallback middleware (`main.ts`)   |

Conventions:
- **Controllers** live in feature folders (`me/`, `metadata/`, `health/`, `auth/`)
  and return DTOs from `@kentos/shared`. The global prefix is `/api`, so a
  `@Controller('me')` is served at `/api/me`.
- **Add an API endpoint:** add/extend the contract in `@kentos/shared` (§4), then
  create a controller (and a feature module if needed) and wire it into
  `app.module.ts`. Return the shared DTO type so the client and server agree.
- **Auth/roles:** protect a route with
  `@UseGuards(KeycloakAuthGuard)` and optionally `@Roles('admin')`. The guard
  verifies the bearer token against Keycloak's JWKS and checks realm + this
  module's client roles. Read the caller with `@CurrentUser()`. See §11.
- **Database access:** TypeORM is registered **only when `DATABASE_URL` is set**
  (`DatabaseModule.forRoot()`), so the server boots **without** a database and
  `make run` works out of the box. Inject `DataSource`/repositories with
  `@Optional()` where a route must tolerate the no-DB case (see
  `health.controller.ts`). Migrations own the schema — `synchronize` stays
  `false`.
- **JSON is always camelCase.** Every response (and accepted body) our API
  produces uses camelCase keys. Keycloak's token response is snake_case; it is
  parsed by a private `KeycloakTokens` type and mapped to the camelCase
  `AuthTokens` DTO (`auth/auth.types.ts` → `toAuthTokens`) — never leak snake_case
  out of our API.
- **Config** is read in one place (`configuration()`); env wins, with sensible
  defaults that mirror the old behaviour.

---

## 6. Frontend & mobile

### Frontend (`@kentos/frontend`)
Documented in depth in **`DESIGN.md`** — read it before touching UI. System facts:
- Stack: React 19, TypeScript, Vite 8, Tailwind v4, shadcn/ui (Radix), TanStack
  Router + Query, lucide-react, cmdk, sonner.
- All `src/...` paths in `DESIGN.md` and the skills are **relative to
  `frontend/`**.
- **API access goes through `src/lib/api.ts`**, which calls `createKentosApi`
  from `@kentos/shared` (baseUrl `/api`, token from `lib/auth/tokens.ts`). The old
  `src/lib/auth/api.ts` is now a thin wrapper over `api.auth.*`.
- The build output **must** go to `backend/static/` (configured in
  `vite.config.ts`); do not change this without also updating `main.ts`.
- Skills `create-component`, `update-component`, `create-page`, `update-page`
  encode the conventions and run their verify steps inside `frontend/`.

### Mobile (`@kentos/mobile`)
- **Expo** (React Native). Imports `@kentos/shared` exactly like the web app;
  `src/lib/api.ts` passes an absolute `baseUrl` and an AsyncStorage-backed
  `getAccessToken`. `metro.config.js` is monorepo-aware (watches the workspace
  root, resolves both `node_modules` trees).
- Config via `EXPO_PUBLIC_*` in `mobile/.env` (Expo does **not** read the root
  `.env`). See `mobile/README.md`.
- Auth on mobile opens the backend-mediated Keycloak flow in the system browser;
  completing it needs a deep link (`kentos://`) — wire `expo-auth-session` to
  capture `code`/`state` and call `api.auth.exchangeCode(...)`.

---

## 7. Build, run, develop

Everything is driven from the root **`Makefile`** (a thin layer over the
workspace's pnpm scripts). Run `make help` for the list.

| Command              | What it does                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `make env`           | create `.env` from `.env.example` if missing                      |
| `make install`       | install all workspace dependencies (pnpm)                         |
| `make dev-shared`    | recompile `@kentos/shared` on change (watch)                      |
| `make dev-frontend`  | Vite dev server with hot reload (`:5173`)                         |
| `make dev-backend`   | NestJS API in watch mode (`:5800`)                                |
| `make build-shared`  | compile `@kentos/shared` → `shared/dist`                          |
| `make build-frontend`| compile the SPA into `backend/static`                             |
| `make build-backend` | compile the NestJS server → `backend/dist`                        |
| `make build`         | shared + frontend + backend                                       |
| `make run`           | build shared + frontend, then run the NestJS backend serving it   |
| `make run-prod`      | build everything, run the compiled server (`start:prod`)          |
| `make lint`          | eslint (frontend) + `tsc --noEmit` (backend)                      |
| `make clean`         | remove `dist/` output and generated frontend assets               |

Mobile runs from its workspace: `pnpm --filter @kentos/mobile start` (or
`make`-less `pnpm dev:mobile`).

### Two development modes
- **Full-app loop (single port):** `make run` — frontend is compiled and served
  by NestJS on `:5800`. Closest to production; rebuild to see frontend changes.
- **Fast frontend loop (two ports):** `make dev-frontend` (Vite/HMR on `:5173`)
  alongside `make dev-backend` (API on `:5800`). Keep `make dev-shared` running
  too if you are editing contracts.

---

## 8. Configuration

**Backend + frontend config lives in `.env`** at the repo root. Copy
`.env.example` to `.env` (`make env`) and edit it:
- The **Makefile** loads it (`-include .env` + `export`) so every command runs
  with those variables.
- The **NestJS backend** reads it via `@nestjs/config` (`envFilePath:
  ['.env', '../.env']`, process env wins), so it works run from the repo root or
  from `backend/`.
- **Vite** reads the same root `.env` (`envDir`), exposing only `VITE_`-prefixed
  variables to the browser.
- **Mobile** is separate: Expo reads `mobile/.env` and exposes only
  `EXPO_PUBLIC_`-prefixed variables.

| Variable               | Default       | Meaning                                       |
| ---------------------- | ------------- | --------------------------------------------- |
| `HOST`                 | `0.0.0.0`     | bind interface                                |
| `PORT`                 | `5800`        | listen port                                   |
| `DATABASE_URL`         | *(empty)*     | PostgreSQL DSN; if empty, TypeORM is disabled |
| `APP_ENV`              | `development` | `development` \| `production`                 |
| `LOG_LEVEL`            | `info`        | reserved (`debug`\|`info`\|`warn`\|`error`)   |
| `STATIC_CACHE_MAX_AGE` | `3600`        | max-age (s) for static assets (HTML always no-cache) |
| `KEYCLOAK_URL`         | `http://localhost:8080` | Keycloak base URL                   |
| `KEYCLOAK_REALM`       | `sivasbeltr`  | Keycloak realm                                |
| `KEYCLOAK_CLIENT_SECRET` | *(empty)*   | confidential client secret (backend only)     |
| `KEYCLOAK_REDIRECT_URI`| *(empty)*     | optional override; else derived as `<base>/auth/callback` |
| `VITE_API_BASE_URL`    | `/api`        | frontend: base path the shared client builds every URL from |
| `VITE_MODULE_NAME`     | `kentos-project-template` | frontend: module name for the metadata path |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5800/api` | mobile: absolute API base (`mobile/.env`) |
| `EXPO_PUBLIC_MODULE_NAME`  | `kentos-project-template`   | mobile: module name for the metadata path |

The OIDC **client_id is the module name** (`kentos.module.json` "name"); it is
not a separate variable.

`.env` is gitignored; `.env.example` (root) and `mobile/.env.example` are the
tracked templates. Keep them in sync when you add a variable.

### Endpoints
- `GET /api/health` → `{"status":"ok"}` (adds `"database":"up"` when a DB is
  configured and reachable; returns `503` if configured but unreachable).
- `GET /api/v1/<module-name>/metadata` → the module manifest JSON (see §3.1).
- `GET /api/auth/login`, `POST /api/auth/callback|refresh|logout` → Keycloak
  login flow (see §11).
- `GET /api/me` → verified caller (identity + roles); requires a valid access
  token (`Authorization: Bearer …`).

---

## 9. Conventions recap for agents

- **Build/run through the Makefile or the workspace pnpm scripts** — don't invent
  ad-hoc commands.
- **Contracts first:** when changing the API, edit `@kentos/shared` (models →
  services → clients) and rebuild it, so the backend and both clients stay in
  lockstep.
- **Frontend changes:** follow `DESIGN.md` and the `*-component` / `*-page`
  skills; verify with `tsc -b`, eslint, and a build (all inside `frontend/`).
- **Backend changes:** keep `pnpm --filter @kentos/backend typecheck` clean;
  return shared DTO types from controllers.
- **Never break the static contract:** `backend/static/` must always contain a
  self-contained `index.html` (the tracked placeholder) so a fresh checkout boots
  before any frontend build.
- **Module identity** comes from the single `backend/kentos.module.json` — change
  it with the `init-module` skill, not by hand-editing scattered files.
- Update **this file**, **`DESIGN.md`**, and the **skills** when you change
  structure, conventions, or the build pipeline.

---

## 10. Skills

Repeatable workflows are encoded as skills under `.claude/skills/`:

| Skill              | Use for                                                        |
| ------------------ | -------------------------------------------------------------- |
| `init-module`      | rename the template to a real module across the workspaces     |
| `create-page`      | add a new route/page (frontend)                                |
| `update-page`      | edit an existing page (frontend)                               |
| `create-component` | add a new UI component (frontend)                              |
| `update-component` | edit an existing component (frontend)                          |

Run `init-module <name>` right after cloning to claim the module name (updates
`backend/kentos.module.json`, `VITE_MODULE_NAME`, and the mobile
`EXPO_PUBLIC_MODULE_NAME`, then verifies).

---

## 11. Roadmap (where this is heading)

Planned/expected areas of growth — not yet implemented unless noted:
- Real API resources backed by PostgreSQL (TypeORM entities, migrations,
  repositories, services).
- Full mobile auth (deep-link capture of the Keycloak callback + token refresh).
- Request validation (`class-validator`/Zod), structured error responses, OpenAPI.
- Production hardening (TLS termination, timeouts, graceful shutdown).
- CI: lint + typecheck + build across all workspaces.

---

## 12. Authentication (Keycloak)

Login uses Keycloak (OIDC, Authorization Code + PKCE) with a **confidential
client**, mediated by the backend. The client secret lives only on the backend;
the browser never sees it. Because the SPA and API are same-origin (one process),
the web `/api/auth/*` calls need no CORS.

**Client identity.** The OIDC `client_id` **is the module name**
(`kentos.module.json` "name"), which is also the **Keycloak client ID**. Realm,
base URL and secret come from `.env` (`KEYCLOAK_*`).

### Backend — `src/auth/*` + `/api/auth/*`
- `GET /api/auth/login?redirect=/dashboard` → builds the authorization URL
  (PKCE/state/nonce stored server-side in `StateStore`, keyed by `state`) and
  redirects the browser to Keycloak.
- `POST /api/auth/callback {code, state}` → validates state, exchanges the code
  (client secret + PKCE verifier), checks the id_token nonce, returns the tokens
  (camelCase) plus the post-login `redirect`.
- `POST /api/auth/refresh {refreshToken}` → new token set.
- `POST /api/auth/logout {idToken, refreshToken}` → revokes at Keycloak, returns
  the end-session `logoutUrl`.
- `KeycloakService` reads discovery once from
  `KEYCLOAK_URL/realms/<realm>/.well-known/openid-configuration` and caches it.
  `TokenVerifier` verifies access tokens against the JWKS with **jose**
  (`jwtVerify`, issuer checked, audience skipped — Keycloak's `aud` isn't the
  client id).

### Authorization (roles)
Roles are taken from the access token: **realm roles** (`realm_access.roles`) +
**this module's client roles** (`resource_access[<module-name>].roles`).

- **Backend** uses `KeycloakAuthGuard` + the `@Roles(...)` decorator
  (`src/common/`): a valid token is required, and when roles are given the caller
  must have **at least one** (no roles → any valid token). Protect a route:
  ```ts
  @UseGuards(KeycloakAuthGuard)
  @Roles('Manager', 'Admin')
  @Get('reports')
  reports(@CurrentUser() user: Claims) { … }
  ```
  `GET /api/me` (guard with no roles) returns the verified caller. The token is
  **signature-verified**, not just decoded.
- **Frontend** mirrors the same semantics — see below.

### Frontend — `src/lib/auth/*` + routes
- Tokens are stored in **localStorage** (`tokens.ts`); the `AuthTokens` shape is
  imported from `@kentos/shared`. Roles come from the **access token**, identity
  from the lightweight **id token**.
- `AuthProvider`/`useAuth` hold session state and expose
  `login/logout/refresh/setSession/expire` plus `hasRole/hasAnyRole/hasAllRoles`.
  Auth calls go through `@kentos/shared` (via `src/lib/api.ts` → `api.auth.*`).
- **Role gating:** `useAuth().hasAnyRole([...])` / `hasAllRoles([...])`, and the
  declarative `<RolesRequired anyOf={[…]} allOf={[…]} fallback={…}>` component.
  Live demo on the **/components** page.
- **Routing:** `__root` provides auth context; **`_authed`** is a pathless layout
  that guards every app page (renders the shell + `SessionWatcher`), so `/login`
  and `/auth/callback` render bare. `/` redirects authenticated users to
  `/dashboard`; the guard sends unauthenticated users to `/login`.
- **Session watcher:** ~30s before access-token expiry raises a sticky toast with
  an **"Oturumu uzat"** action that refreshes; an unattended lapse drops the
  session and returns the user to `/login`.

### Keycloak client setup (realm `sivasbeltr`)
Create a client whose **Client ID = the module name**, with:
- **Client authentication: ON** (confidential) → copy the secret into
  `KEYCLOAK_CLIENT_SECRET`.
- **Standard flow** enabled.
- **Valid redirect URIs:** `http://localhost:5800/auth/callback` (and your prod
  `address` + `/auth/callback`; for mobile add the `kentos://` deep link).
- **Valid post-logout redirect URIs:** `http://localhost:5800/login` (+ prod).
- **Web origins:** the app origin (e.g. `http://localhost:5800`).

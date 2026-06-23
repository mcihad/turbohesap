# AGENTS.md — KentOS Console System Guide

This file is the entry point for any agent (or human) working in this repository.
It describes **what the system is, how it is wired together, and how to build,
run, and extend it.** For the frontend *design system* (tokens, components,
layout) the authoritative document is **`DESIGN.md`**; this file covers the
**whole system** — frontend + backend + the single-binary packaging.

> Status: this is a template under active development. The architecture below is
> the foundation we build on; expect the backend (API surface, persistence,
> auth) to grow over time.

---

## 1. What this is

KentOS Console is a **single self-contained binary** that serves a rich
React single-page application together with its JSON API.

- The **frontend** is a Vite + React 19 SPA (TanStack Router/Query, Tailwind v4,
  shadcn/ui). It compiles to static assets.
- The **backend** is a Go service built on **Fiber v3**, with **pgx** for
  PostgreSQL and **Cobra** for its CLI.
- At build time the compiled frontend is **embedded into the Go binary**
  (`go:embed`). The result is one executable that needs no separate web server,
  no Node runtime, and no static-file hosting to run the full app.

```
  frontend (Vite build)  ──►  backend/static/  ──(go:embed)──►  single Go binary
```

---

## 2. Repository layout

```
.
├── AGENTS.md            # this file — whole-system guide
├── DESIGN.md            # frontend design-system contract (tokens, components)
├── README.md            # quick start
├── Makefile             # single entry point for all build/run tasks
├── .env                 # local configuration (gitignored; all vars live here)
├── .env.example         # template for .env (tracked)
├── docs/                # longer-form documentation
├── frontend/            # the React SPA
│   ├── src/             # application source (see DESIGN.md; paths there are relative to here)
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts   # build.outDir → ../backend/static; envDir → repo root
│   └── package.json
└── backend/             # the Go service
    ├── go.mod           # module: kentos-project-template
    ├── main.go          # embeds ./static, injects it into the CLI
    ├── cmd/             # Cobra commands (root, serve, version)
    ├── internal/
    │   ├── auth/        # Keycloak OIDC: discovery, PKCE, token exchange/refresh
    │   ├── config/      # env-driven configuration (loads .env)
    │   ├── database/    # pgx connection pool
    │   ├── module/      # MODULE MANIFEST lives here (kentos.module.json, embedded) + parsing
    │   └── server/      # Fiber app: middleware, API routes, static/SPA serving
    └── static/          # frontend build output, embedded into the binary
        └── index.html   # tracked placeholder (overwritten by the real build)
```

**Module name:** `kentos-project-template` (Go import path root). Rename it for a
real app with the **`init-module`** skill — see §9.

---

## 3. How the pieces fit together

### Build pipeline
1. `make build-frontend` runs Vite. `vite.config.ts` sets
   `build.outDir = ../backend/static`, so the compiled SPA lands directly in the
   backend's embed directory (replacing the placeholder `index.html`).
2. `make build-backend` runs `go build`. `backend/main.go` carries the
   `//go:embed all:static` directive, so whatever is in `backend/static/` at
   compile time is baked into the binary.
3. `make build` does both → `bin/kentos`, a single executable.

> `go:embed` cannot reference parent directories, which is why the embed
> directives live in the root `main` package and the resulting values are
> **injected** down into the command/server layers (`cmd.Execute(assets, mod)` →
> `server.New(cfg, db, assets, mod)`) rather than being declared inside
> `internal/`. The module manifest is embedded **by the `internal/module`
> package itself** (it lives there) — see §3.1.

### Request flow at runtime
- `kentos serve` boots the Fiber app (`internal/server`).
- Middleware order: panic **recover** → **logger** → **CORS**.
- **`/api/*`** routes are matched first (JSON API).
- A catch-all `GET /*` serves embedded files. Unknown, non-`/api` paths fall back
  to `index.html` so client-side routing and deep links/reloads work (SPA
  fallback).

### Caching policy
The frontend is rebuilt frequently, so caching is deliberately conservative:
- **`index.html`** (and the SPA fallback) → `Cache-Control: no-cache` (always
  revalidated, so a new build is picked up immediately).
- **All other assets** → `Cache-Control: public, max-age=<STATIC_CACHE_MAX_AGE>`,
  default **3600s (1 hour)**, configurable via `.env`. No `immutable`/year-long
  caching, on purpose.

### 3.1 Module manifest & metadata endpoint
Every app from this template is a **module** that declares its identity in
**`kentos.module.json`**. The Go binary embeds it and serves it verbatim:

- **Single source of truth:** `backend/internal/module/kentos.module.json` — the
  one and only copy. It is embedded (`go:embed`) by the `internal/module` package
  that parses it (`module.Load()`), so the binary stays self-contained with no
  build-time copy step. Hand-edit it (or use the `init-module` skill). Fields:

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

  Any extra fields you add are served as-is.
- **Embedding:** the `internal/module` package embeds its own
  `kentos.module.json` and exposes `module.Load()`. There is **no mirror and no
  sync step** — edit the one file and rebuild.
- **Endpoint:** `GET /api/<api.version>/<name>/metadata` returns the manifest
  JSON. With the defaults that is **`/api/v1/kentos-project-template/metadata`**.
  The route is derived from the manifest, so it tracks the module name.

---

## 4. Backend stack & conventions

| Concern        | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| HTTP framework | Fiber **v3** (`github.com/gofiber/fiber/v3`)            |
| Database       | PostgreSQL via **pgx v5** (`pgxpool`)                   |
| CLI            | **Cobra** (`github.com/spf13/cobra`)                    |
| Config         | environment variables (+ flags), `internal/config`     |
| Logging        | stdlib `log/slog` (text handler)                        |

Conventions:
- **Handlers** are methods on `*server.Server` with the signature
  `func(c fiber.Ctx) error` (note: Fiber v3 uses the `fiber.Ctx` interface, not a
  pointer). Keep request-scoped work on `c.Context()`.
- **Add an API endpoint:** register it in `server.registerAPI()` (under the
  `/api` group) and implement the handler in `internal/server/handlers.go`.
- **Database access** goes through `internal/database.DB` (wraps `*pgxpool.Pool`).
  The pool is created in `cmd/serve.go` only when `DATABASE_URL` is set; the
  server is designed to boot **without** a database so `make run` works out of
  the box. Guard DB-dependent handlers accordingly.
- **CLI:** new subcommands go in `backend/cmd/` and register themselves via
  `init()` with `rootCmd.AddCommand(...)`. Flags override env, which overrides
  defaults.
- **JSON is always camelCase.** Every response (and accepted request body) our
  API produces uses camelCase keys (`accessToken`, `refreshExpiresIn`, …). When
  a struct also parses a third-party payload that is snake_case (e.g. Keycloak's
  token response in `internal/auth`), keep that parsing struct private and map it
  to a separate camelCase response DTO — never leak snake_case out of our API.
- Keep packages under `internal/` unless something is genuinely meant to be
  importable by other modules.

---

## 5. Frontend

The frontend is documented in depth in **`DESIGN.md`** — read it before touching
UI. Key facts relevant to the system:
- Stack: React 19, TypeScript, Vite 8, Tailwind v4, shadcn/ui (Radix), TanStack
  Router + Query, lucide-react, cmdk, sonner.
- All `src/...` paths in `DESIGN.md` and the skills are **relative to
  `frontend/`**.
- The build output **must** go to `backend/static/` (configured in
  `vite.config.ts`); do not change this without also updating the embed setup.
- Skills `create-component`, `update-component`, `create-page`, `update-page`
  encode the conventions and run their verify steps inside `frontend/`.

---

## 6. Build, run, develop

Everything is driven from the root **`Makefile`**. Run `make help` for the list.

`make` with no target prints a grouped, formatted list of every target.

| Command              | What it does                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `make env`           | create `.env` from `.env.example` if missing                      |
| `make install`       | install frontend dependencies (pnpm)                              |
| `make dev-frontend`  | Vite dev server with hot reload (`:5173`)                         |
| `make dev-backend`   | run the Go API server, no embed rebuild (`:5800`)                 |
| `make build-frontend`| compile the SPA into `backend/static`                             |
| `make build-backend` | compile the Go binary, embedding `backend/static`                |
| `make build`         | frontend + backend → `bin/kentos` (single binary)                |
| `make run`           | build the frontend, then run the backend serving it (full app)   |
| `make run-bin`       | build everything and run the compiled binary                      |
| `make tidy`          | `go mod tidy`                                                     |
| `make fmt`           | `go fmt`                                                          |
| `make lint`          | eslint (frontend) + `go vet` (backend)                            |
| `make test`          | backend tests                                                     |
| `make clean`         | remove `bin/` and generated frontend assets                       |

### Two development modes
- **Full-app loop (single port):** `make run` — frontend is compiled and served
  by Go on `:5800`. Closest to production; rebuild to see frontend changes.
- **Fast frontend loop (two ports):** `make dev-frontend` (Vite/HMR on `:5173`)
  alongside `make dev-backend` (API on `:5800`). The Vite dev server proxies or
  the SPA calls the API at `:5800`. Use this for rapid UI iteration.

---

## 7. Configuration

**All configuration lives in `.env`** at the repo root. Copy `.env.example` to
`.env` (`make env`) and edit it. The same file feeds both sides:
- The **Makefile** loads it (`-include .env` + `export`) so every command runs
  with those variables.
- The **backend** also reads it at startup via `godotenv` (process environment
  always wins, then `./.env`, then `../.env`), so the binary picks it up whether
  run from the repo root or from `backend/`.
- **Vite** reads the same root `.env` (`envDir`), exposing only `VITE_`-prefixed
  variables to the browser.

CLI flags on `serve` override the corresponding variables.

| Variable               | Default       | Meaning                                       |
| ---------------------- | ------------- | --------------------------------------------- |
| `HOST`                 | `0.0.0.0`     | bind interface                                |
| `PORT`                 | `5800`        | listen port                                   |
| `DATABASE_URL`         | *(empty)*     | PostgreSQL DSN; if empty, DB is disabled      |
| `APP_ENV`              | `development` | `development` \| `production`                 |
| `LOG_LEVEL`            | `info`        | `debug` \| `info` \| `warn` \| `error`        |
| `STATIC_CACHE_MAX_AGE` | `3600`        | max-age (s) for embedded assets (HTML always no-cache) |
| `KEYCLOAK_URL`         | `http://localhost:8080` | Keycloak base URL                   |
| `KEYCLOAK_REALM`       | `sivasbeltr`  | Keycloak realm                                |
| `KEYCLOAK_CLIENT_SECRET` | *(empty)*   | confidential client secret (backend only)     |
| `KEYCLOAK_REDIRECT_URI`| *(empty)*     | optional override; else derived as `<base>/auth/callback` |
| `VITE_API_BASE_URL`    | `/api/v1`     | frontend: base path of the module API         |

The OIDC **client_id is the module name** (`kentos.module.json` "name"); it is
not a separate variable.

Flags: `kentos serve --host --port --database-url`.

`.env` is gitignored; `.env.example` is the tracked template. Keep them in sync
when you add a variable.

### Endpoints
- `GET /api/health` → `{"status":"ok"}` (adds `"database":"up"` when a DB is
  configured and reachable; returns `503` if configured but unreachable).
- `GET /api/v1/<module-name>/metadata` → the module manifest JSON (see §3.1).
- `GET /api/auth/login`, `POST /api/auth/callback|refresh|logout` → Keycloak
  login flow (see §11).

---

## 8. Conventions recap for agents

- **Build/run only through the Makefile** — don't invent ad-hoc commands.
- **Frontend changes:** follow `DESIGN.md` and the `*-component` / `*-page`
  skills; verify with `tsc -b`, eslint, and a build (all inside `frontend/`).
- **Backend changes:** keep `go vet ./...` clean and `gofmt`-formatted; prefer
  small, focused packages under `internal/`.
- **Never break the embed contract:** `backend/static/` is the embed root and
  must always contain a self-contained `index.html` (the tracked placeholder)
  so a fresh checkout compiles before any frontend build.
- **Module identity** comes from the single
  `backend/internal/module/kentos.module.json` (embedded by its package) —
  change it with the `init-module` skill, not by hand-editing scattered files.
- Update **this file**, **`DESIGN.md`**, and the **skills** when you change
  structure, conventions, or the build pipeline.

---

## 9. Skills

Repeatable workflows are encoded as skills under `.claude/skills/`:

| Skill              | Use for                                                        |
| ------------------ | -------------------------------------------------------------- |
| `init-module`      | rename the template to a real module across frontend + backend |
| `create-page`      | add a new route/page (frontend)                                |
| `update-page`      | edit an existing page (frontend)                               |
| `create-component` | add a new UI component (frontend)                              |
| `update-component` | edit an existing component (frontend)                          |

Run `init-module <name>` right after cloning to claim the module name (updates
`go.mod` + Go imports, `frontend/package.json`, and
`backend/internal/module/kentos.module.json`, then verifies).

---

## 10. Roadmap (where this is heading)

Planned/expected areas of growth — not yet implemented unless noted:
- Real API resources backed by PostgreSQL (migrations, repositories, services).
- Authentication/authorization and session/token handling.
- Request validation, structured error responses, and OpenAPI docs under `docs/`.
- Configuration hardening for production (TLS, timeouts, graceful shutdown
  tuning — graceful shutdown via `GracefulContext` is already wired).
- CI: lint + test + build of the single binary.

---

## 11. Authentication (Keycloak)

Login uses Keycloak (OIDC, Authorization Code + PKCE) with a **confidential
client**, mediated by the backend. The client secret lives only on the backend;
the browser never sees it. Because the SPA and API are same-origin (one binary),
the `/api/auth/*` calls need no CORS.

**Client identity.** The OIDC `client_id` **is the module name**
(`kentos.module.json` "name"), which is also the **Keycloak client ID**. Realm,
base URL and secret come from `.env` (`KEYCLOAK_*`).

### Backend — `internal/auth` + `/api/auth/*`
- `GET /api/auth/login?redirect=/dashboard` → builds the authorization URL
  (PKCE/state/nonce stored server-side, keyed by `state`) and 303-redirects the
  browser to Keycloak.
- `POST /api/auth/callback {code, state}` → validates state, exchanges the code
  (client secret + PKCE verifier), checks the id_token nonce, returns the tokens
  (camelCase) plus the post-login `redirect`.
- `POST /api/auth/refresh {refreshToken}` → new token set.
- `POST /api/auth/logout {idToken, refreshToken}` → revokes at Keycloak, returns
  the end-session `logoutUrl`.
- Discovery is read once from `KEYCLOAK_URL/realms/<realm>/.well-known/openid-configuration`
  and cached. The internal `Tokens` struct parses Keycloak's snake_case; the API
  emits camelCase via a DTO.

### Frontend — `src/lib/auth/*` + routes
- Tokens are stored in **localStorage** (`tokens.ts`); roles come from the
  **access token** (`realm_access` + this client's `resource_access`), identity
  from the lightweight **id token**.
- `AuthProvider`/`useAuth` (`auth-provider.tsx` / `auth-context.ts`) hold session
  state and expose `login/logout/refresh/setSession/expire`.
- **Routing:** `__root` only provides auth context; **`_authed`** is a pathless
  layout that guards every app page (renders the shell + `SessionWatcher`), so
  `/login` and `/auth/callback` render bare. `/` redirects authenticated users to
  `/dashboard`; the guard sends unauthenticated users to `/login`.
- **Session watcher** (`session-watcher.tsx`): polls access-token expiry and ~30s
  before it lapses raises a sticky toast with an **"Oturumu uzat"** action that
  refreshes; if the token lapses unattended the session is dropped and the guard
  returns the user to `/login`.

### Keycloak client setup (realm `sivasbeltr`)
Create a client whose **Client ID = the module name**, with:
- **Client authentication: ON** (confidential) → copy the secret into
  `KEYCLOAK_CLIENT_SECRET`.
- **Standard flow** enabled.
- **Valid redirect URIs:** `http://localhost:5800/auth/callback` (and your prod
  `address` + `/auth/callback`).
- **Valid post-logout redirect URIs:** `http://localhost:5800/login` (+ prod).
- **Web origins:** the app origin (e.g. `http://localhost:5800`).

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
├── docs/                # longer-form documentation
├── frontend/            # the React SPA
│   ├── src/             # application source (see DESIGN.md; paths there are relative to here)
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts   # build.outDir → ../backend/static
│   └── package.json
└── backend/             # the Go service
    ├── go.mod           # module: kentos-project-template
    ├── main.go          # embeds ./static, injects it into the CLI
    ├── cmd/             # Cobra commands (root, serve, version)
    ├── internal/
    │   ├── config/      # env-driven configuration
    │   ├── database/    # pgx connection pool
    │   └── server/      # Fiber app: middleware, API routes, static/SPA serving
    └── static/          # frontend build output, embedded into the binary
        └── index.html   # tracked placeholder (overwritten by the real build)
```

**Module name:** `kentos-project-template` (Go import path root).

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
> directive lives in the root `main` package and the resulting `fs.FS` is
> **injected** down into the command/server layers (`cmd.Execute(assets)` →
> `server.New(cfg, db, assets)`) rather than being declared inside `internal/`.

### Request flow at runtime
- `kentos serve` boots the Fiber app (`internal/server`).
- Middleware order: panic **recover** → **logger** → **CORS**.
- **`/api/*`** routes are matched first (JSON API).
- A catch-all `GET /*` serves embedded files. Unknown, non-`/api` paths fall back
  to `index.html` so client-side routing and deep links/reloads work (SPA
  fallback). Hashed assets under `/assets/*` are served `immutable`, long-cache.

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

| Command              | What it does                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `make install`       | install frontend dependencies (pnpm)                              |
| `make dev-frontend`  | Vite dev server with hot reload (`:5173`)                         |
| `make dev-backend`   | run the Go API server, no embed rebuild (`:8080`)                 |
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
  by Go on `:8080`. Closest to production; rebuild to see frontend changes.
- **Fast frontend loop (two ports):** `make dev-frontend` (Vite/HMR on `:5173`)
  alongside `make dev-backend` (API on `:8080`). The Vite dev server proxies or
  the SPA calls the API at `:8080`. Use this for rapid UI iteration.

---

## 7. Configuration

The backend reads configuration from the environment (CLI flags on `serve`
override them):

| Variable        | Default       | Meaning                                  |
| --------------- | ------------- | ---------------------------------------- |
| `HOST`          | `0.0.0.0`     | bind interface                           |
| `PORT`          | `8080`        | listen port                              |
| `DATABASE_URL`  | *(empty)*     | PostgreSQL DSN; if empty, DB is disabled |
| `APP_ENV`       | `development` | `development` \| `production`            |
| `LOG_LEVEL`     | `info`        | `debug` \| `info` \| `warn` \| `error`   |

Flags: `kentos serve --host --port --database-url`.

Health check: `GET /api/health` → `{"status":"ok"}` (adds `"database":"up"` when
a DB is configured and reachable; returns `503` if configured but unreachable).

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
- Update **this file**, **`DESIGN.md`**, and the **skills** when you change
  structure, conventions, or the build pipeline.

---

## 9. Roadmap (where this is heading)

Planned/expected areas of growth — not yet implemented unless noted:
- Real API resources backed by PostgreSQL (migrations, repositories, services).
- Authentication/authorization and session/token handling.
- Request validation, structured error responses, and OpenAPI docs under `docs/`.
- Configuration hardening for production (TLS, timeouts, graceful shutdown
  tuning — graceful shutdown via `GracefulContext` is already wired).
- CI: lint + test + build of the single binary.

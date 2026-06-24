# KentOS Console — Application Template

A token-driven application shell to build **all our apps** with one consistent,
fully themeable look and feel — a **pnpm monorepo** where one NestJS process
serves the SPA and its JSON API together.

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix) ·
TanStack Router + Query · lucide-react · cmdk · sonner.
**Backend:** NestJS · TypeScript · TypeORM (PostgreSQL) · jose (Keycloak OIDC).
**Shared:** `@kentos/shared` — framework-agnostic DTO models, service interfaces,
and their axios client implementations, consumed by the web frontend and (later)
the React Native mobile app.

Three workspaces:

- **`shared/`** (`@kentos/shared`) — the typed contract layer (models + service
  interfaces + axios clients). The single source of truth for the API shapes.
- **`frontend/`** (`@kentos/frontend`) — the React SPA; compiles into
  `backend/static/`.
- **`backend/`** (`@kentos/backend`) — the NestJS API; serves `backend/static/`
  as the SPA (deep-link fallback included) alongside `/api`, so the whole app
  runs from one Node process.

> **Architecture:** see **[`AGENTS.md`](./AGENTS.md)** for the full system guide.

## What's in the box

- **App shell**: fixed searchable/groupable **tree sidebar** (collapsible icon
  rail), **app launcher** (Office/Unity style), **app bar** with breadcrumb +
  centered **⌘K command palette**, theme/notifications/mode/user controls.
- **Page system**: `PageWrapper` (padded or edge-to-edge for maps), `PageHeader`
  with title + actions, optional fixed footer, and an always-present **AI chat**
  FAB bottom-right.
- **Theme engine**: 100% token-based. Customize colors, font family, font size,
  scale/density, spacing grid, radius, and elevation live — persisted locally,
  with light/dark/system modes and no flash on load.

## 📐 DESIGN.md is the contract

**[`DESIGN.md`](./DESIGN.md)** documents every token, color, dimension, and
component standard in enough detail to rebuild this system 1:1. Read it first.

## Get started

```bash
make env            # create .env from .env.example
make install        # install all workspace dependencies (pnpm)
init module <name>  # (in Claude Code) claim a module name across the workspaces
make run            # build shared + frontend, run the NestJS backend → http://localhost:5800
```

`init module <name>` runs the **`init-module`** skill, which renames the package
names, `frontend/package.json`, and the module manifest in one step. New here?
Skip it to try the template as-is.

## Develop

Everything runs through the root **`Makefile`** (run `make` for a grouped list):

```bash
make run            # full app on one port (rebuild to see frontend changes)
make build          # shared + frontend + backend (NestJS → backend/dist)

# Fast UI iteration (three terminals):
make dev-shared     # recompile @kentos/shared on change (watch)
make dev-frontend   # Vite dev server with HMR (:5173)
make dev-backend    # NestJS API in watch mode (:5800)
```

Prerequisites: Node 20+ and pnpm.

## Configuration

All settings live in **`.env`** (root) — copy from `.env.example`. The Makefile,
the NestJS server, and Vite all read this one file. See [`AGENTS.md`](./AGENTS.md) §7
for every variable.

## Module manifest

Each app is a **module** described by **`kentos.module.json`** (name, icon,
roles, …), which lives at **`backend/kentos.module.json`** — read at startup by
the NestJS server and served at `GET /api/v1/<module-name>/metadata`.

## Authentication

Login is handled by **Keycloak** (OIDC, confidential client) — the backend holds
the secret and runs the code/token exchange (`/api/auth/*`); the SPA stores the
returned tokens in localStorage, gates routes (`/` → `/login` or `/dashboard`),
and shows an "extend session" toast ~30s before the token expires. The OIDC
client ID **is the module name**. Configure `KEYCLOAK_*` in `.env`. Full details
and the required Keycloak client settings: [`AGENTS.md`](./AGENTS.md) §11 and
[`docs/auth.md`](./docs/auth.md).

## Customize

> Paths below are relative to **`frontend/`** (e.g. `frontend/src/index.css`).

| Want to change…        | Edit…                                  |
| ---------------------- | -------------------------------------- |
| Design tokens / colors | `src/index.css`                        |
| Theme presets/defaults | `src/lib/theme/presets.ts`             |
| Sidebar navigation     | `src/config/navigation.ts`             |
| App launcher tiles     | `src/config/apps.ts`                   |
| Add a page             | add a file under `src/routes/`         |
| Add an API endpoint    | a NestJS controller under `backend/src/` (+ a contract in `shared/src/`) |
| Shared API contracts   | `shared/src/` (models · services · clients) |
| Module name/identity   | `init module <name>` skill, then `backend/kentos.module.json` |
| Backend/runtime config | `.env` (root)                          |

> Generated file `frontend/src/routeTree.gen.ts` is created by the TanStack Router
> plugin on `make dev-frontend` — do not edit it by hand.

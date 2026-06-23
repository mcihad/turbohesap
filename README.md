# KentOS Console — Application Template

A token-driven application shell to build **all our apps** with one consistent,
fully themeable look and feel — now packaged as a **single self-contained binary**
that serves the SPA and its JSON API together.

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix) ·
TanStack Router + Query · lucide-react · cmdk · sonner.
**Backend:** Go · Fiber v3 · pgx (PostgreSQL) · Cobra.

The frontend (`frontend/`) compiles into `backend/static/`, which the Go backend
(`backend/`) embeds via `go:embed` — so `make build` produces one executable
(`bin/kentos`) with no separate web server or Node runtime needed at runtime.

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

## Develop

Everything runs through the root **`Makefile`** (`make help` lists all targets):

```bash
make install        # install frontend dependencies (pnpm)
make run            # build the frontend, run the backend serving it → http://localhost:8080
make build          # frontend + backend → single binary at bin/kentos

# Fast UI iteration (two terminals):
make dev-frontend   # Vite dev server with HMR (:5173)
make dev-backend    # Go API server (:8080)
```

Prerequisites: Go (1.26+), Node + pnpm.

## Customize

> Paths below are relative to **`frontend/`** (e.g. `frontend/src/index.css`).

| Want to change…        | Edit…                                  |
| ---------------------- | -------------------------------------- |
| Design tokens / colors | `src/index.css`                        |
| Theme presets/defaults | `src/lib/theme/presets.ts`             |
| Sidebar navigation     | `src/config/navigation.ts`             |
| App launcher tiles     | `src/config/apps.ts`                   |
| Add a page             | add a file under `src/routes/`         |
| Add an API endpoint    | `backend/internal/server/` (`registerAPI` + `handlers.go`) |

> Generated file `frontend/src/routeTree.gen.ts` is created by the TanStack Router
> plugin on `make dev-frontend` — do not edit it by hand.

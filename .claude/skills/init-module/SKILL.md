---
name: init-module
description: Rename this template to a new module — stamp the chosen module name everywhere it matters across the pnpm monorepo (backend/kentos.module.json, the frontend's VITE_MODULE_NAME, and the mobile app's EXPO_PUBLIC_MODULE_NAME). Use right after cloning the template, when the user says "init module <name>", "initialize module", "rename module", or wants to turn the template into a concrete app/module.
---

# Initialize a module

Every app is built from this template — a pnpm monorepo with three (or four)
workspaces: `@kentos/shared` (contracts), `@kentos/frontend` (React SPA),
`@kentos/backend` (NestJS API), and optionally `@kentos/mobile` (Expo). This
skill stamps a chosen **module name** so the backend metadata route, the
frontend, and the mobile app all agree on the module's identity.

> The `@kentos/*` **workspace package names are the org scope** and do NOT
> change — they are internal. What changes is the **module identity**: the
> manifest `name`, which is also the **Keycloak client ID** and drives
> `/api/<version>/<name>/metadata`.

## 0. Inputs

- **`<new>`** — the new module name from the user's request. It must be a single
  URL-safe slug usable as an npm package name, a URL segment, **and a Keycloak
  client ID**: **`^[a-z][a-z0-9-]*$`** (lowercase letters/digits/hyphens,
  starting with a letter). Reject anything else and ask for a valid slug. Note:
  `name` doubles as the **Keycloak client ID**, so choose it deliberately.
- **`<old>`** — the current module name. Determine it, don't assume:
  ```bash
  OLD=$(node -e "process.stdout.write(require('./backend/kentos.module.json').name)")
  ```
  If `OLD` already equals `<new>`, stop — nothing to do.

## 1. What changes (the contract)

| File                         | What                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `backend/kentos.module.json` | `"name"` → `<new>` (single source of truth; Keycloak client id; metadata route) |
| `.env`, `.env.example`       | `VITE_MODULE_NAME=<old>` → `<new>` (frontend metadata path) |
| `mobile/.env`, `mobile/.env.example` | `EXPO_PUBLIC_MODULE_NAME=<old>` → `<new>` (if the mobile workspace exists) |

> The **Makefile does not need editing**: `MODULE` is derived from
> `backend/kentos.module.json`, so the metadata route follows automatically.

## 2. Apply the rename

Run from the repo root.

```bash
NEW=<new>
OLD=$(node -e "process.stdout.write(require('./backend/kentos.module.json').name)")

# Module manifest name (drives the metadata route; also the Keycloak client id)
sed -i "s/\"name\": \"${OLD}\"/\"name\": \"${NEW}\"/" backend/kentos.module.json

# Frontend + mobile module-name env vars (ignore files that don't exist)
sed -i "s/^VITE_MODULE_NAME=${OLD}$/VITE_MODULE_NAME=${NEW}/" .env .env.example 2>/dev/null || true
sed -i "s/^EXPO_PUBLIC_MODULE_NAME=${OLD}$/EXPO_PUBLIC_MODULE_NAME=${NEW}/" mobile/.env mobile/.env.example 2>/dev/null || true
```

Then **review `backend/kentos.module.json` by hand** with the user: `displayName`,
`description`, `icon`, `address`, `roles`, `tags`, `version` usually need real
values for the new module (only `name` is set automatically). In particular,
`address` must be the module's **full public URL** (e.g.
`https://kentos.sivas.bel.tr` or `https://sivas.bel.tr/kentos`), not a path.

## 3. Verify (required, must pass)

```bash
pnpm install                                   # link workspaces
pnpm --filter @kentos/shared build             # contracts must compile
pnpm --filter @kentos/backend typecheck        # zero errors
pnpm --filter @kentos/frontend exec tsc -b     # zero errors
# If the mobile workspace exists:
pnpm --filter @kentos/mobile typecheck         # zero errors
```

Smoke-test the metadata endpoint resolves at the new path:
```bash
pnpm --filter @kentos/shared build
pnpm --filter @kentos/frontend build           # SPA → backend/static
pnpm --filter @kentos/backend build
PORT=8099 node backend/dist/main.js &
sleep 2
curl -s http://localhost:8099/api/v1/${NEW}/metadata   # returns the manifest
# stop the server afterwards (kill the process holding port 8099)
```
Restore the placeholder `backend/static/index.html` afterwards if you ran a build
and aren't committing the compiled frontend (see AGENTS.md "static contract").

## 4. Finish

- Confirm no stray references remain:
  `grep -rn "<old>" backend frontend mobile .env*` (ignore `node_modules`,
  `dist`, `routeTree.gen.ts`).
- The repo directory name and git remote are **not** changed by this skill — do
  that separately if the user wants it.
- Documentation (`README.md`, `AGENTS.md`, `docs/`) uses the old name only in
  illustrative examples; update those only if the user asks.

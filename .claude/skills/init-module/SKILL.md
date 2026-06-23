---
name: init-module
description: Rename this template to a new module — set the module name everywhere it matters across both the Go backend and the React frontend (go.mod + Go imports, frontend/package.json, kentos.module.json, and the embedded manifest). Use right after cloning the template, when the user says "init module <name>", "initialize module", "rename module", or wants to turn the template into a concrete app/module.
---

# Initialize a module

Every app is built from this template. This skill stamps a chosen **module name**
across the whole repo so the backend module path, the frontend package, and the
module manifest (which drives `/api/v1/<name>/metadata`) all agree.

## 0. Inputs

- **`<new>`** — the new module name from the user's request. It must be a single
  URL-safe slug usable as a Go module path, an npm package name, a URL segment,
  **and a Keycloak client ID**: **`^[a-z][a-z0-9-]*$`** (lowercase
  letters/digits/hyphens, starting with a letter). Reject anything else and ask
  for a valid slug. Note: `name` doubles as the **Keycloak client ID**, so it
  should be stable and chosen deliberately.
- **`<old>`** — the current module path. Determine it, don't assume:
  ```bash
  OLD=$(cd backend && go list -m)   # e.g. kentos-project-template
  ```
  If `OLD` already equals `<new>`, stop — nothing to do.

## 1. What changes (the contract)

| File                              | What                                              |
| --------------------------------- | ------------------------------------------------- |
| `backend/go.mod`                  | `module <old>` → `module <new>`                   |
| `backend/**/*.go`                 | every import path `<old>/...` → `<new>/...`        |
| `frontend/package.json`           | `"name": "<old-npm>"` → `"name": "<new>"`          |
| `backend/internal/module/kentos.module.json` | `"name"` → `<new>` (the single, embedded manifest) |

> `Makefile` does **not** need editing: `MODULE` is derived from `go.mod`
> (`go list -m`), so `LDFLAGS` and the metadata route follow automatically.

## 2. Apply the rename

Run from the repo root. Use `|` as the sed delimiter so module paths containing
`/` are safe.

```bash
NEW=<new>
OLD=$(cd backend && go list -m)

# Go module path + all import references (imports and the version.go ldflags note)
sed -i "s|^module ${OLD}$|module ${NEW}|" backend/go.mod
grep -rl "${OLD}/" backend --include='*.go' | xargs -r sed -i "s|${OLD}/|${NEW}/|g"

# Frontend package name (first "name" key in package.json)
sed -i "0,/\"name\": \".*\"/s//\"name\": \"${NEW}\"/" frontend/package.json

# Module manifest name (drives the metadata route; also the Keycloak client id)
sed -i "s/\"name\": \"${OLD}\"/\"name\": \"${NEW}\"/" backend/internal/module/kentos.module.json
```

Then **review `backend/internal/module/kentos.module.json` by hand** with the user: `displayName`,
`description`, `icon`, `address`, `roles`, `tags`, `version` usually need real
values for the new module (only `name` is set automatically). In particular,
`address` must be the module's **full public URL** (e.g.
`https://kentos.sivas.bel.tr` or `https://sivas.bel.tr/kentos`), not a path.

## 3. Verify (required, must pass)

```bash
cd backend && go mod tidy && go build ./... && go vet ./...   # zero errors
cd ../frontend && pnpm exec tsc -b                            # zero errors
```

Smoke-test the metadata endpoint resolves at the new path:
```bash
make build && PORT=8099 ./bin/kentos serve &
sleep 2
curl -s http://localhost:8099/api/v1/${NEW}/metadata    # returns the manifest
kill %1
```
Restore the placeholder `backend/static/index.html` afterwards if you ran a build
and aren't committing the compiled frontend (see AGENTS.md §"embed contract").

## 4. Finish

- Confirm no stray references remain: `grep -rn "<old>" backend frontend` (ignore `node_modules`, `routeTree.gen.ts`).
- The repo directory name and git remote are **not** changed by this skill — do
  that separately if the user wants it.
- Documentation (`README.md`, `AGENTS.md`, `docs/`) uses the old name only in
  illustrative examples; update those only if the user asks.

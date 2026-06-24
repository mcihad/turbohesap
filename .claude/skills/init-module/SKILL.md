---
name: init-module
description: Rename/rebrand this monorepo to a new project — change the npm package scope (@turbohesap/* → @<new>/*), the app/brand name, the database name, and brand strings across the workspaces. Use right after cloning TurboHesap to start a new product, when the user says "init module <name>", "rename project", "rebrand", or wants to turn this into a differently-named app.
---

# Initialize / rebrand the project

TurboHesap is a pnpm monorepo (`shared`, `backend`, `frontend`, `mobile`). This
skill rebrands the whole repo to a new name. There is **no per-app manifest** —
identity is just the package scope, the brand strings, and the database name.

## 0. Inputs

- **`<new>`** — the new project slug: lowercase letters/digits/hyphens,
  `^[a-z][a-z0-9-]*$` (used as the npm scope and the DB name). Reject anything
  else and ask for a valid slug.
- **`<old>`** — the current scope, `turbohesap` (from the package names, e.g.
  `@turbohesap/shared`). If `<old>` already equals `<new>`, stop.
- Optionally a human-readable **display name** (e.g. "Acme ERP") for brand strings.

## 1. What changes

| Where | What |
| ----- | ---- |
| every `package.json` (root + workspaces) | `@<old>/...` → `@<new>/...` names + deps |
| all imports `from '@<old>/shared'` | → `from '@<new>/shared'` |
| `pnpm-workspace.yaml`, `Makefile`, root scripts | `@<old>/` filters → `@<new>/` |
| `.env` / `.env.example` | `DATABASE_URL` db name `<old>` → `<new>`; `SEED_ADMIN_EMAIL` domain |
| brand strings | `frontend/index.html` `<title>`, `frontend/src/components/layout/sidebar.tsx` + `footer.tsx`, `login.tsx`, `mobile/app.json` (`name`, `slug`, `scheme`), `mobile/App.tsx` |
| `shared/src/clients/index.ts` | `createTurbohesapApi` → `create<New>Api` (optional; update callers in `frontend/src/lib/api.ts` + `mobile/src/lib/api.ts`) |

## 2. Apply the rename

From the repo root:

```bash
OLD=turbohesap
NEW=<new>

# npm scope across all package.json, imports, workspace filters, Makefile, docs
grep -rIl "@${OLD}/" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  --exclude=pnpm-lock.yaml | while IFS= read -r f; do sed -i "s|@${OLD}/|@${NEW}/|g" "$f"; done

# database name in the connection string
sed -i "s|/${OLD}|/${NEW}|g" .env .env.example 2>/dev/null || true
```

Then update **brand strings** by hand (display name, titles, scheme) and — if you
renamed the API factory — `createTurbohesapApi` and its two callers.

Create the new database if needed:
```bash
PGPASSWORD=postgres createdb -h localhost -U postgres ${NEW} 2>/dev/null || true
```

## 3. Verify (must pass)

```bash
pnpm install
pnpm --filter @${NEW}/shared build
pnpm --filter @${NEW}/backend typecheck
pnpm --filter @${NEW}/frontend exec tsc -b
pnpm --filter @${NEW}/mobile typecheck
```

Then `make run` and confirm login works at `http://localhost:5800/login`.

## 4. Finish

- Check for stray references: `grep -rn "${OLD}" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` (ignore the lockfile / generated files).
- The repo directory name and git remote are not changed by this skill.

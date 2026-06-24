---
name: update-page
description: Modify an existing page/route in TurboHesap — change content, header/actions, layout (padded vs full-bleed), footer, or authorization for a route under frontend/src/routes/_authed/<module> (page in frontend/src/modules/<module>/pages). Use when asked to edit/update/change/restyle an existing page, screen, or view. Keeps the page consistent with the app shell, module nav, and DESIGN.md.
---

# Update a page

Edit the route while keeping it consistent with the shell and the token system.

## 0. Read first (required)
1. **`DESIGN.md`** §11 (page primitives), §12 (footer), §6 (layout) and
   **`AGENTS.md`** §3/§6 (module convention, modular UI) and §7 (roles &
   permissions) if you touch gating.
2. The route file under `frontend/src/routes/_authed/<module>/` and the page
   component it points to under `frontend/src/modules/<module>/pages/`.

## 1. Preserve the page contract
- Keep content inside **`<PageWrapper>`** and the heading in **`<PageHeader>`**.
  Don't replace them with ad-hoc `<div>`s that re-implement padding/title.
- Keep the `export const Route = createFileRoute('/path')({ component })` shape.
- Header actions (buttons / dropdowns) go in `PageHeader`'s `actions` prop,
  right-aligned — don't scatter them into the body.

## 2. Common edits
- **Change gutters/centering**: don't add per-page padding. Either keep default
  full-width, or cap with `<PageWrapper className="max-w-3xl">`, or go
  edge-to-edge with `<PageWrapper padded={false}>` (maps/canvases).
- **Add content**: compose from `@/components/ui/*` (Card, Tabs, Table, Tree,
  List view pattern, etc.). **Tokens only** — semantic colors, `rounded-*`,
  `shadow-*`, spacing utilities; never hardcode hex/px/shadows.
- **Add a contextual footer**: render `<PageFooter>` with `<PageFooterStat>`
  items; it overrides the default footer while the page is mounted.
- **Authorization**: gate reads with `<PermissionRequired permission="…">`
  (`@/lib/auth/permission-gate`) and `enabled: hasPermission('…')` on queries;
  gate write UI with `useAuth().hasPermission('<module>.<resource>.write')` or
  `<Can permission="…">`. Routes are `/<module>/<resource>`; data via
  `api.<resource>.*` (`@/lib/api`).
- **Rename/move the route**: changing the file path changes the URL — update the
  matching nav item in `frontend/src/modules/<module>/module.config.ts` (keep its
  `permission`), and let Vite regenerate `frontend/src/routeTree.gen.ts`
  (`pnpm exec vite build`).

## 3. Verify (required, must pass)
```bash
cd frontend           # frontend commands run here (or `make lint` / `make build` from the repo root)
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
pnpm build            # succeeds (emits into ../backend/static)
```
For visible changes, check the page in `pnpm dev` (`make dev-frontend`).

## 4. Keep things in sync
- If you renamed the route or its nav title, confirm the breadcrumb + command
  palette still resolve (both derive from the module's `module.config.ts` nav).
- Update **DESIGN.md** only if you introduced a new layout pattern worth
  standardizing across pages.

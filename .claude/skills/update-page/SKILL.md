---
name: update-page
description: Modify an existing page/route in this design-system template (Acme Console) — change content, header/actions, layout (padded vs full-bleed), or footer for a route under src/routes. Use when asked to edit/update/change/restyle an existing page, screen, or view. Keeps the page consistent with the app shell and DESIGN.md.
---

# Update a page

Edit the route while keeping it consistent with the shell and the token system.

## 0. Read first (required)
1. **`DESIGN.md`** §11 (page primitives), §12 (footer), and §6 (layout) if you're
   changing how the page fills space.
2. The route file under `src/routes/`.

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
- **Rename/move the route**: changing the file path changes the URL — update the
  matching entry in `src/config/navigation.ts` (and `apps.ts` if present), and
  let Vite regenerate `src/routeTree.gen.ts` (`pnpm dev`).

## 3. Verify (required, must pass)
```bash
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
pnpm build            # succeeds
```
For visible changes, check the page in `pnpm dev`.

## 4. Keep things in sync
- If you renamed the route or its nav title, confirm the breadcrumb + command
  palette still resolve (both derive from `src/config/navigation.ts`).
- Update **DESIGN.md** only if you introduced a new layout pattern worth
  standardizing across pages.

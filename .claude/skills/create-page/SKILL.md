---
name: create-page
description: Create a new page/route in this design-system template (KentOS Console) using TanStack Router file-based routing under frontend/src/routes, wired into the app shell (PageWrapper, PageHeader, breadcrumb, optional footer). Use when asked to add/create a new page, screen, route, view, or section. Keeps layout and navigation consistent with DESIGN.md.
---

# Create a page

Pages render inside the app shell's content area. They must use the page
primitives so padding, breadcrumb, footer, and theming all behave consistently.

## 0. Read first (required)
1. **`DESIGN.md`** §6 (layout anatomy), §11 (page primitives), §12 (footer),
   §15.1 (navigation schema).
2. An existing route as a template:
   - Standard page → `frontend/src/routes/_authed/dashboard.tsx` or `_authed/analytics.tsx`.
   - Full-bleed (map/canvas) → `frontend/src/routes/_authed/map.tsx`.
   - Page-controlled footer → `_authed/analytics.tsx` (`PageFooter`).

## 1. Create the route file
> **Auth layout.** App pages live under the pathless **`_authed`** layout
> (`frontend/src/routes/_authed/`), which guards them behind Keycloak login and
> renders the app shell. The `_authed` segment adds **no** URL path. Put new
> authenticated pages here. Only public, shell-less routes (`login.tsx`,
> `auth.callback.tsx`) sit directly under `routes/`. See AGENTS.md §11.

- Path = file location under `frontend/src/routes/_authed/` (TanStack file-based).
  The `createFileRoute` id includes `/_authed/`, but the URL does not.
  - `/reports` → `frontend/src/routes/_authed/reports.tsx` → id `/_authed/reports`
  - `/reports/weekly` → `frontend/src/routes/_authed/reports.weekly.tsx` **or**
    `frontend/src/routes/_authed/reports/weekly.tsx`
- Skeleton:
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, PageWrapper } from '@/components/layout/page'

export const Route = createFileRoute('/_authed/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Reports"
        description="Optional one-line description."
        actions={/* optional: <Button>…</Button> / <DropdownMenu>… */ undefined}
      />
      {/* page content built from components/ui/* */}
    </PageWrapper>
  )
}
```

## 2. Layout rules (DESIGN.md §11)
- Wrap content in **`<PageWrapper>`** (fills full width with tight gutters).
  - For maps/canvases/editors that must be edge-to-edge: `<PageWrapper padded={false}>`
    and position children with `absolute inset-0`.
  - To cap+center for readability (forms/prose): `<PageWrapper className="max-w-3xl">`.
- Use **`<PageHeader title description actions />`** for the heading band. Put
  action buttons / dropdown menus in `actions` (right-aligned).
- Build the body from `@/components/ui/*` primitives (Card, Table, Tabs,
  Tree, etc.). **Tokens only** — no hardcoded colors/px/shadows.
- Optional contextual footer: render **`<PageFooter>`** with `<PageFooterStat>`
  items (e.g. totals) — it takes over the app footer while mounted.

## 3. Register navigation (so it's reachable)
- Add an entry to **`frontend/src/config/navigation.ts`** (`NAVIGATION`) — a `NavItem`
  with `title`, `icon` (lucide), and `to` matching the route path; nest under a
  group or as a child for the tree. The **breadcrumb and command palette pick it
  up automatically** (title is derived from this config).
- App-level tile? Optionally add to `frontend/src/config/apps.ts` (`APPS`).

## 4. Generate the route tree + verify (required)
The TanStack Router plugin regenerates `frontend/src/routeTree.gen.ts` when Vite runs.
```bash
cd frontend # frontend commands run here (or `make dev-frontend` / `make build` from the repo root)
pnpm dev   # start once so the new route is added to routeTree.gen.ts (then stop)
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
pnpm build            # succeeds (emits into ../backend/static)
```
- Do **not** hand-edit `frontend/src/routeTree.gen.ts`.
- TanStack `Link`/`navigate` are typed to known routes. For a path that is only
  served by the `$` catch-all, pass it as a `string` variable (see how
  `user-menu.tsx` does `to={'/x' as string}`), or create the real route file.

## 5. Notes
- `noUnusedLocals`/`noUnusedParameters` are on — omit unused props/imports
  (e.g. drop `actions` if you don't use it rather than passing `undefined`).
- DESIGN.md generally doesn't need updating for an ordinary page, but DO update
  it if you introduce a **new layout pattern** other pages should follow.

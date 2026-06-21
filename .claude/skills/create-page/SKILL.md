---
name: create-page
description: Create a new page/route in this design-system template (KentOS Console) using TanStack Router file-based routing under src/routes, wired into the app shell (PageWrapper, PageHeader, breadcrumb, optional footer). Use when asked to add/create a new page, screen, route, view, or section. Keeps layout and navigation consistent with DESIGN.md.
---

# Create a page

Pages render inside the app shell's content area. They must use the page
primitives so padding, breadcrumb, footer, and theming all behave consistently.

## 0. Read first (required)
1. **`DESIGN.md`** §6 (layout anatomy), §11 (page primitives), §12 (footer),
   §15.1 (navigation schema).
2. An existing route as a template:
   - Standard page → `src/routes/index.tsx` or `analytics.tsx`.
   - Full-bleed (map/canvas) → `src/routes/map.tsx`.
   - Page-controlled footer → `analytics.tsx` (`PageFooter`).

## 1. Create the route file
- Path = file location under `src/routes/` (TanStack file-based routing).
  - `/reports` → `src/routes/reports.tsx`
  - `/reports/weekly` → `src/routes/reports.weekly.tsx` **or**
    `src/routes/reports/weekly.tsx`
- Skeleton:
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, PageWrapper } from '@/components/layout/page'

export const Route = createFileRoute('/reports')({
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
- Add an entry to **`src/config/navigation.ts`** (`NAVIGATION`) — a `NavItem`
  with `title`, `icon` (lucide), and `to` matching the route path; nest under a
  group or as a child for the tree. The **breadcrumb and command palette pick it
  up automatically** (title is derived from this config).
- App-level tile? Optionally add to `src/config/apps.ts` (`APPS`).

## 4. Generate the route tree + verify (required)
The TanStack Router plugin regenerates `src/routeTree.gen.ts` when Vite runs.
```bash
pnpm dev   # start once so the new route is added to routeTree.gen.ts (then stop)
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
pnpm build            # succeeds
```
- Do **not** hand-edit `src/routeTree.gen.ts`.
- TanStack `Link`/`navigate` are typed to known routes. For a path that is only
  served by the `$` catch-all, pass it as a `string` variable (see how
  `user-menu.tsx` does `to={'/x' as string}`), or create the real route file.

## 5. Notes
- `noUnusedLocals`/`noUnusedParameters` are on — omit unused props/imports
  (e.g. drop `actions` if you don't use it rather than passing `undefined`).
- DESIGN.md generally doesn't need updating for an ordinary page, but DO update
  it if you introduce a **new layout pattern** other pages should follow.

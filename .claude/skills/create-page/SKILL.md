---
name: create-page
description: Create a new page/route in TurboHesap using TanStack Router file-based routing under frontend/src/routes/_authed/<module>, wired into the app shell (PageWrapper, PageHeader, module nav, permission gate). Use when asked to add/create a new page, screen, route, or view. Keeps layout, navigation, and authorization consistent with AGENTS.md and DESIGN.md.
---

# Create a page

Pages render inside the app shell's content area and belong to a **module**.
Routes mirror the API: **`/<module>/<resource>`**. They must use the page
primitives and the permission gate so layout and authorization stay consistent.

## 0. Read first (required)
1. **`AGENTS.md`** §3–6 (module convention, modular UI) and **§7 (roles &
   permissions)** — required for gating; plus **`DESIGN.md`** §6/§11/§12 (layout,
   page primitives, footer).
2. **`frontend/src/components/components.md`** — reuse existing components.
3. An existing template:
   - Module page → `frontend/src/modules/iam/pages/users-page.tsx`.
   - Simple page → `frontend/src/modules/genel/...` / `routes/_authed/genel/dashboard.tsx`.

## 1. Where things go (modular layout)
A page lives in its module and is exposed by a thin route file:
- **Page component:** `frontend/src/modules/<module>/pages/<name>-page.tsx`
- **Route file (thin):** `frontend/src/routes/_authed/<module>/<resource>.tsx`
  re-exporting the page component.

> **Auth layout.** App pages live under the pathless **`_authed`** layout, which
> guards them behind login and renders the shell. `_authed` adds **no** URL
> segment. Only public, shell-less routes (`login.tsx`) sit directly under
> `routes/`. Login is local (username/password) — there is no OIDC callback.

Route id includes `/_authed/` and the module segment; the URL is
`/<module>/<resource>`:
- `/iam/customers` → `routes/_authed/iam/customers.tsx` → id `/_authed/iam/customers`

**Page component skeleton** (`modules/<module>/pages/<name>-page.tsx`):
```tsx
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { PermissionRequired } from '@/lib/auth/permission-gate'

export function CustomersPage() {
  return (
    <PermissionRequired permission="<module>.customers.read">
      <PageWrapper>
        <PageHeader title="Müşteriler" description="Açıklama." />
        {/* body built from components/ui/* and api.<resource>.* */}
      </PageWrapper>
    </PermissionRequired>
  )
}
```

**Route file skeleton** (`routes/_authed/<module>/<resource>.tsx`):
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/modules/<module>/pages/customers-page'

export const Route = createFileRoute('/_authed/<module>/customers')({
  component: CustomersPage,
})
```

## 2. Layout rules (DESIGN.md §11)
- Wrap content in **`<PageWrapper>`** (full width, tight gutters). Edge-to-edge:
  `<PageWrapper padded={false}>`; capped/centered: `<PageWrapper className="max-w-3xl">`.
- Heading band via **`<PageHeader title description actions />`** (actions right-aligned).
- Build the body from `@/components/ui/*`. **Tokens only** — no hardcoded
  colors/px/shadows.
- Optional contextual footer: **`<PageFooter>`** with `<PageFooterStat>` items.

## 3. Data + authorization
- **Data goes through the shared API:** `import { api } from '@/lib/api'` and call
  `api.<resource>.<method>()` (with TanStack Query). The contract lives in
  `@turbohesap/shared` — add the DTO/service/client there first if the endpoint is
  new (see AGENTS.md §4), and the backend route under
  `backend/src/modules/<module>/` returning that DTO.
- **Gate reads** with `<PermissionRequired permission="…">` (above) and set
  `enabled: hasPermission('…')` on queries so no request fires without access.
- **Gate write UI** with `useAuth().hasPermission('<module>.<resource>.write')`
  or `<Can permission="…">` (hide create/edit/delete).

## 4. Register navigation (so it's reachable)
Add the item to the **module's** nav in
`frontend/src/modules/<module>/module.config.ts` (`nav[].items[]`): `title`,
`icon` (lucide), `to` = the route path, and **`permission`** (the read key) so it
auto-hides from the sidebar/rail/command-palette for users without it. New module?
create `module.config.ts` and register it in `frontend/src/modules/registry.ts`
(and add the key/label to `@turbohesap/shared` `core/app-modules.ts`). The
breadcrumb + command palette pick the title up automatically.

## 5. Generate the route tree + verify (required)
The TanStack Router plugin regenerates `frontend/src/routeTree.gen.ts` when Vite runs.
```bash
cd frontend           # or `make dev` from the repo root (frontend + backend)
pnpm exec vite build  # regenerates routeTree.gen.ts and bundles
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
```
- Do **not** hand-edit `frontend/src/routeTree.gen.ts`.
- `Link`/`navigate` are typed to known routes; literal paths must exist as route
  files (string-typed dynamic paths are allowed, see `module-rail.tsx`).

## 6. Notes
- `noUnusedLocals`/`noUnusedParameters` are on — omit unused props/imports.
- Update **DESIGN.md** only if you introduce a new layout pattern; update
  **`components.md`** if you add a reusable component.

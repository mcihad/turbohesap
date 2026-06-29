---
name: create-module
description: Scaffold a whole new ERP module across EVERY layer of TurboHesap — shared contracts (DTO + service interface + axios client), the NestJS backend (entity, DTOs, service, controller, permissions, module), the React frontend (module config, pages, routes, left-rail registration with permission gating), and the Expo mobile app. Use when asked to add/create a new module, feature area, or section (e.g. inventory/stok, accounting/muhasebe, CRM) — i.e. a new /api/<module> with its own sidebar entry and permissions.
---

# Create a module

A **module** is one ERP feature area. It exists in three mirrored places and is
reachable from the left rail:

```
shared/src/modules/<mod>/      → contracts (DTOs + service interface + axios client)
backend/src/modules/<mod>/     → implementation (entity, dto, service, controller, permissions)
frontend/src/modules/<mod>/    → UI (module.config + pages) + routes under routes/_authed/<mod>/
```

- **API:** every endpoint is `/api/<mod>/<resource>`. **UI routes:** `/<mod>/<resource>`.
- **Auth:** declare permissions per module; the server enforces them (global
  `PermissionsGuard`), the frontend mirrors the same keys for UX.
- **Mobile** consumes the shared contract automatically — no per-module code unless
  you add a screen.

> **Read first:** `agy.md` (the binding operating manual — workflow, gating,
> migrations, and the mandatory HTTP token-testing protocol), then `AGENTS.md` §3
> (API convention), §4 (shared layer), §5.4 (files/settings/lookups subsystems),
> §7 (roles & permissions), and `frontend/src/components/components.md`. The
> **canonical reference implementation is the `iam` module** (full CRUD across all
> layers) and `genel` (a nav-only module); for grid pages copy
> `org`/`inventory`. Copy their shape. The **`pos` module** is the current
> worked example of the full 4-layer pattern end-to-end: shared `modules/pos/*`
> (→ `api.pos.*`), backend `modules/pos/`, frontend `modules/pos/` +
> `routes/_authed/pos/`, mobile `modules/pos/`.
>
> Paths below are relative to the repo root. Replace `<mod>` (module key, e.g.
> `inventory`), `<res>` (plural resource, e.g. `products`), `<Res>` (PascalCase
> singular, e.g. `Product`). Keys must be `^[a-z][a-z0-9-]*$`.

This skill was verified by scaffolding a throwaway module end-to-end (build +
run + permission-gated API calls succeeded). Follow it in order.

---

## 0. Inputs to settle first
- **`<mod>`** module key + Turkish **label** + a **lucide icon** (for the rail).
- One or more **resources** `<res>` with their fields.
- **Permission keys**: `<mod>.<res>.read`, `<mod>.<res>.write` (convention:
  reads need `.read`, mutations `.write`).

---

## 1. Shared — the contract (`shared/src/modules/<mod>/`)

Create `<res>.dto.ts`, `<mod>.permissions.ts`, `<res>.service.ts`,
`<res>.client.ts`, `index.ts`:

```ts
// <res>.dto.ts
export interface <Res>Dto { id: string; name: string; /* fields… */ createdAt: string; updatedAt: string }
export interface Create<Res>Request { name: string /* … */ }
export interface Update<Res>Request { name?: string /* … */ }
```
```ts
// <mod>.permissions.ts — typed permission KEY constants (single source of truth;
// backend guard/catalog + frontend gating both import these).
export const <Mod>Permissions = {
  <res>Read: '<mod>.<res>.read',
  <res>Write: '<mod>.<res>.write',
} as const
export type <Mod>Permission = (typeof <Mod>Permissions)[keyof typeof <Mod>Permissions]
```
```ts
// <res>.service.ts
import type { Create<Res>Request, <Res>Dto, Update<Res>Request } from './<res>.dto'
export interface I<Res>Service {
  list(): Promise<<Res>Dto[]>
  get(id: string): Promise<<Res>Dto>
  create(input: Create<Res>Request): Promise<<Res>Dto>
  update(id: string, input: Update<Res>Request): Promise<<Res>Dto>
  remove(id: string): Promise<void>
}
```
```ts
// <res>.client.ts
import type { AxiosInstance } from 'axios'
import type { Create<Res>Request, <Res>Dto, Update<Res>Request } from './<res>.dto'
import type { I<Res>Service } from './<res>.service'
export class <Res>ApiClient implements I<Res>Service {
  constructor(private readonly http: AxiosInstance) {}
  async list() { return (await this.http.get<<Res>Dto[]>('/<mod>/<res>')).data }
  async get(id: string) { return (await this.http.get<<Res>Dto>(`/<mod>/<res>/${id}`)).data }
  async create(input: Create<Res>Request) { return (await this.http.post<<Res>Dto>('/<mod>/<res>', input)).data }
  async update(id: string, input: Update<Res>Request) { return (await this.http.patch<<Res>Dto>(`/<mod>/<res>/${id}`, input)).data }
  async remove(id: string) { await this.http.delete(`/<mod>/<res>/${id}`) }
}
```
```ts
// index.ts
export * from './<res>.dto'
export * from './<mod>.permissions'
export * from './<res>.service'
export * from './<res>.client'
```

**Register (3 edits):**
- `shared/src/index.ts` → add `export * from './modules/<mod>'`
- `shared/src/core/api.ts` → import `<Res>ApiClient` + `I<Res>Service`; add a
  **grouped** module key to `TurbohesapApi` (e.g. `<mod>: { <res>: I<Res>Service }`,
  define a `<Mod>Api` interface like `IamApi`); build it in the factory return
  (`<mod>: { <res>: new <Res>ApiClient(http) }`). Resources nest under their module
  → `api.<mod>.<res>` (no cross-module collisions).
- `shared/src/core/app-modules.ts` → add `{ key: '<mod>', label: '<Label>', description: '…' }` to `MODULES`.

Build it: `pnpm --filter @turbohesap/shared build`.

---

## 2. Backend — the implementation (`backend/src/modules/<mod>/`)

Files: `entities/<res-singular>.entity.ts`, `dto/create-<res-singular>.dto.ts`,
`dto/update-<res-singular>.dto.ts`, `<res>.service.ts`, `<res>.controller.ts`,
`<mod>.permissions.ts`, `<mod>.module.ts`.

```ts
// entities/<res-singular>.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
@Entity('<mod>_<res>')
export class <Res> {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column() name!: string
  // @Column(...) other fields
  @CreateDateColumn() createdAt!: Date
  @UpdateDateColumn() updatedAt!: Date
}
```
> Use **camelCase** property names — a `SnakeNamingStrategy` maps them to
> snake_case columns automatically (`createdAt` → `created_at`). Don't add
> `@Column({ name: '…' })` overrides; the JSON API stays camelCase via the DTO.
> Extend `common/entities/base.entity.ts` (`BaseEntity`) instead of re-inlining
> id/timestamps.
> **Money/quantities:** `@Column('numeric', { precision, scale, transformer:
> decimalTransformer })` — never `double precision` (agy.md §7.1). And **always set
> transformer columns explicitly in `repo.create({…})`** (e.g. `amount: 0`): a
> transformer column is always inserted, and `undefined` → `NULL` → not-null
> violation; the DB `default` never applies. In raw QueryBuilder SQL reference
> columns as quoted snake_case (`o."created_at"`), not the camelCase property (agy.md §7.5).
```ts
// dto/create-<res-singular>.dto.ts  (class-validator; implements the shared request)
import { IsNotEmpty, IsString } from 'class-validator'
import type { Create<Res>Request } from '@turbohesap/shared'
export class Create<Res>Dto implements Create<Res>Request {
  @IsString() @IsNotEmpty() name!: string
}
// dto/update-<res-singular>.dto.ts → same fields, all @IsOptional()
```
```ts
// <mod>.permissions.ts — pair each SHARED key with a Turkish description.
import { <Mod>Permissions } from '@turbohesap/shared'
import type { PermissionDef } from '../../common/permission.types'
export const <MOD>_PERMISSION_DEFS: PermissionDef[] = [
  { key: <Mod>Permissions.<res>Read,  description: '… görüntüleme', group: '<res>' },
  { key: <Mod>Permissions.<res>Write, description: '… ekleme, düzenleme ve silme', group: '<res>' },
]
```

`<res>.service.ts` — inject `@InjectRepository(<Res>)`, implement
list/get/create/update/remove, map entity → `<Res>Dto` (dates → `.toISOString()`).
**Don't trust client money/derived values.** On a write, resolve prices/names/tax
server-side from ids; treat any client-supplied value as an *override* only. The
POS order line resolves `name`/`unitPrice`/`taxRate` from `productId` + the
register's sales-channel price (`pos-orders.service.ts` `writeLines`). Keep the
pure pricing/math in a shared helper both server and clients import — see
`shared/src/modules/pos/pos-pricing.helpers.ts` (tested by
`backend/src/modules/pos/pos-pricing.spec.ts`).
`<res>.controller.ts` — `@Controller('<mod>/<res>')`, one method per CRUD op, each
decorated with `@RequirePermissions(<Mod>Permissions.<res>Read | …<res>Write)`
(import `<Mod>Permissions` from `@turbohesap/shared`). **No `@UseGuards`** — the
global guard enforces it. (Copy `modules/iam/users/` verbatim and rename.)

```ts
// <mod>.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { <Res> } from './entities/<res-singular>.entity'
import { <Res>Controller } from './<res>.controller'
import { <Res>Service } from './<res>.service'
@Module({ imports: [TypeOrmModule.forFeature([<Res>])], controllers: [<Res>Controller], providers: [<Res>Service] })
export class <Mod>Module {}
```

**Register (2 edits):**
- `backend/src/permissions.catalog.ts` → import `<MOD>_PERMISSION_DEFS`; spread
  `...<MOD>_PERMISSION_DEFS` into `PERMISSION_CATALOG` (auto-seeds on boot; `admin`
  gets the keys automatically).
- `backend/src/app.module.ts` → import `<Mod>Module` and add it to `imports`.

Build it: `pnpm --filter @turbohesap/backend build`.

**Generate a migration (required — schema is migration-owned, `synchronize` is
off).** After the entity exists and the backend builds, diff it into a migration
and commit the file:
```bash
make migration-generate NAME=Add<Mod><Res>     # backend/src/migrations/<ts>-Add<Mod><Res>.ts
make migrate                                    # apply locally (also runs on boot)
```
Review the generated SQL **and strip unrelated drift** (e.g. CRM index renames the
diff picks up) so the migration only contains your new schema. Without a migration
the new table never gets created (no `synchronize` fallback). See AGENTS.md §5.1.

> **Migrations run as the app DB role, via `DATABASE_URL`.** If it's unset,
> `migration:generate|run` fall back to the `postgres` superuser and create tables
> *owned by* `postgres` → the app role then hits `permission denied for table`.
> Always pass it, e.g.
> `DATABASE_URL=postgres://turbohesap:turbohesap@localhost:5432/turbohesap pnpm --filter @turbohesap/backend migration:run`
> (the `make` targets already export it).

---

## 3. Frontend — the UI (`frontend/src/modules/<mod>/`)

```ts
// module.config.ts — EVERY module's home is its dashboard (/<mod>), and its nav
// starts with a "Gösterge Paneli" item pointing there.
import { LayoutDashboard, <Icon> } from 'lucide-react'
import { <Mod>Permissions } from '@turbohesap/shared'
import type { AppModule } from '@/modules/types'
export const <mod>Module: AppModule = {
  key: '<mod>', label: '<Label>', icon: <Icon>, home: '/<mod>',
  nav: [{ items: [
    { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/<mod>' },
    { title: '<Res Label>', icon: <Icon>, to: '/<mod>/<res>', permission: <Mod>Permissions.<res>Read },
  ]}],
}
```
- **Module dashboard (required, "Gösterge Paneli"):** every module's `home` is
  `/<mod>` — a dashboard with the module's own statistics. Build it from the
  generic `ModuleDashboard` + a stats component:
  ```tsx
  // components/<mod>-stats.tsx — fetch the module's data (gated by read perms) and
  // render <StatGrid><StatTile icon=… value=… label=… tone=…/>…</StatGrid>.
  //   (@/components/layout/stat-tile). Copy modules/inventory/components/inventory-stats.tsx.
  // routes/_authed/<mod>/index.tsx  → path /<mod>
  import { createFileRoute } from '@tanstack/react-router'
  import { ModuleDashboard } from '@/components/layout/module-dashboard'
  import { <mod>Module } from '@/modules/<mod>/module.config'
  import { <Mod>Stats } from '@/modules/<mod>/components/<mod>-stats'
  export const Route = createFileRoute('/_authed/<mod>/')({
    component: () => <ModuleDashboard module={<mod>Module} stats={<<Mod>Stats />} />,
  })
  ```
- **List page** `pages/<res>-page.tsx`: data via `import { api } from '@/lib/api'` →
  `api.<mod>.<res>.list()/...` (TanStack Query,
  `enabled: hasPermission(<Mod>Permissions.<res>Read)`); wrap the return in
  `<PermissionRequired permission={<Mod>Permissions.<res>Read}>`; gate write buttons
  with `useAuth().hasPermission(<Mod>Permissions.<res>Write)` or `<Can>`; surface
  server errors with `toApiError(e).message`.
  - **Render the list with `<DataGrid>`** (`@/components/data-grid`) — never a raw
    `<table>`. Unique `gridId="<mod>.<res>"`, `columns`, `getRowId`, `onRowClick` →
    detail, actions in the `toolbar` prop. **No `<PageHeader>` band on list pages**
    (title is in the breadcrumb). Tree data → `getSubRows`+`treeColumnId`+
    `defaultExpanded`+`pagination={false}`. Copy
    `modules/org/pages/branches-page.tsx` (or `…/inventory/pages/categories-page.tsx`
    for a tree). See `agy.md` §9.
  - **Create/edit:** a `Dialog` that **saves only on submit**, then closes + toasts
    + `invalidate`s the query. Copy `modules/inventory/components/category-dialog.tsx`.
  - **Detail page** (`pages/<res>-detail-page.tsx`, route `<res>.$id.tsx`): use
    `<PageHeader title audit actions />` + `Tabs`/`Card`. Copy
    `modules/inventory/pages/category-detail-page.tsx`.
  - **Files/images** on the entity → `<FileManager entityType="<Res>" entityId kind
    canWrite>` (no backend work). Small enumerated fields → **lookups** /
    `<LookupSelect>`. See `agy.md` §8/§10.
- **Route (thin)** `frontend/src/routes/_authed/<mod>/<res>.index.tsx`:
  ```tsx
  import { createFileRoute } from '@tanstack/react-router'
  import { <Res>Page } from '@/modules/<mod>/pages/<res>-page'
  export const Route = createFileRoute('/_authed/<mod>/<res>/')({ component: <Res>Page })
  ```
  > **Scrollable dialog bodies:** use `overflow-y-auto px-1 py-2` (the horizontal
  > `px-1`, not `pr-1` — `overflow-y-auto` also clips the x-axis, hiding inputs'
  > left focus ring/border). Reusable key/value choices use `<LookupSelect list=…>`.

**Register (1 edit):** `frontend/src/modules/registry.ts` → import `<mod>Module`
and add it to `APP_MODULES`.

Regenerate routes + build: `pnpm --filter @turbohesap/frontend exec vite build`
(the TanStack plugin rewrites `routeTree.gen.ts`), then `pnpm --filter @turbohesap/frontend exec tsc -b`.

---

## 4. Mobile (`@turbohesap/mobile`) — see **`mobile_design.md`**

The shared client is automatic (`api.<mod>.<res>.*` works once shared is rebuilt).
For UI, mirror the web module — the mobile nav is a **launcher → module → tabs**
model (mobile_design.md §6):

1. **`mobile/src/modules/<mod>/module.config.ts`** — a `MobileModule` with
   `key`, `label`, Feather `icon`, `permission`, and `items` (each resource → a
   bottom tab, with its `permission`). The launcher tile + the per-module bottom
   **TabBar** (Panel + resources, max 5 + "…") pick it up automatically. Register
   it in `mobile/src/modules/registry.ts` (`APP_MODULES`).
2. **Screens** under `mobile/src/modules/<mod>/` (list / detail / form), each
   registered by key in `mobile/src/navigation/screens.tsx`. Use `useNav()` to
   navigate, `useAsync({ enabled: hasPermission(KEY) })` to fetch, the form kit
   (`FormSelect`, `Checklist`, `LookupSelect`…) and `useSubmit()` to mutate. Copy
   an existing module (e.g. `modules/inventory` or `modules/org`).
3. **Dashboard stats (Panel):** the generic `ModuleDashboardScreen` is the Panel
   tab. Add a `mobile/src/modules/<mod>/<Mod>Stats.tsx` (StatCards from the
   module's data, gated by read perms) and register it in
   `navigation/module-stats.tsx` so the same stats as web show on mobile. (A
   module with a custom dashboard sets `dashboardScreen` on its config instead.)

---

## 5. Build & verify (required, must pass)

```bash
make build                                   # shared + frontend + backend
make migration-generate NAME=Add<Mod><Res>   # commit the generated migration
make migrate                                 # apply it (schema is migration-owned)
pnpm --filter @turbohesap/mobile typecheck   # mobile still resolves the contract
```
Then run and exercise the new endpoint (this is the real check):
```bash
# start the API (or use `make dev`)
node backend/dist/main.js & sleep 4
B=http://localhost:5800/api
A=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
curl -s -H "Authorization: Bearer $A" $B/auth/permissions          # must include <mod>.<res>.read/write
curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/<mod>/<res> \
     -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"name":"test"}'   # 201
curl -s -H "Authorization: Bearer $A" $B/<mod>/<res>               # the created row
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5800/<mod>/<res>   # 200 (SPA deep-link)
```
Also run the **negative checks** (agy.md §13): no token → `401`; malformed body →
`400` (`ApiError`); GET/PATCH/DELETE the created row; delete then GET → `404`.

Expected: new permissions auto-seeded (boot logs "N yeni izin veritabanına
eklendi"), `201` on create, list returns the row, and a user **without** the
permission gets `403`. The module icon appears in the left rail. **Report the
commands run + status codes seen** — a green build is not a substitute for §13.

---

## 6. Registration checklist (the easy-to-forget wiring)

| Layer | File | Add |
| ----- | ---- | --- |
| shared | `src/index.ts` | `export * from './modules/<mod>'` |
| shared | `src/core/api.ts` | client import, `TurbohesapApi.<mod>` group, factory `<mod>: { <res>: … }` |
| shared | `src/core/app-modules.ts` | `MODULES` entry |
| backend | `src/permissions.catalog.ts` | `...<MOD>_PERMISSION_DEFS` |
| backend | `src/app.module.ts` | `<Mod>Module` in `imports` |
| backend | `src/migrations/` | a generated migration for the new entity/table |
| backend | `modules/iam/audit/audited-entities.ts` | `ENTITY_MODULE_MAP` entry per entity |
| frontend | `src/modules/registry.ts` | `<mod>Module` in `APP_MODULES` |
| frontend | `routes/_authed/<mod>/index.tsx` | dashboard route (`ModuleDashboard` + `<Mod>Stats`) |
| mobile | `src/modules/registry.ts` + `navigation/screens.tsx` | `MobileModule` + screen keys |
| mobile | `navigation/module-stats.tsx` | `<Mod>Stats` for the Panel dashboard |

Miss one and the symptom is: route 404 (app.module), no permissions (catalog),
client undefined (api.ts), module absent from rail (registry/app-modules),
**table missing / query fails (no migration)**, no dashboard (`<mod>/index` route),
absent from mobile launcher (mobile registry/screens).

## 7. Gotchas
- **Rebuild shared first** after editing contracts (`make build-shared` /
  `make dev-shared`); the backend (CJS) and frontend/mobile (ESM) consume its
  `dist`. In `make dev`, a contract change needs a **backend restart** (Nest
  watches `backend/src`, not `shared/dist`).
- **`routeTree.gen.ts` is generated** — never hand-edit; a `vite build`/`vite`
  run rewrites it. `createFileRoute('/_authed/<mod>/<res>')` must match the file path.
- **Permissions resolve from the DB**, so after adding a write permission, assign
  it to a role (`/iam/roles`) for non-admins; admin gets every key automatically.
- **No `synchronize` fallback** — a new entity needs a migration
  (`make migration-generate NAME=…`) or its table simply won't exist. Generate it
  against an up-to-date local DB and review the SQL before committing (AGENTS.md §5.1).
- **Auditing is automatic** — every entity's Insert/Update/Delete is recorded by
  the global audit subscriber (AGENTS.md §5.2). Add your entity class to
  `ENTITY_MODULE_MAP` (`modules/iam/audit/audited-entities.ts`) so its audit rows
  are labelled with your module. Errors (5xx) are captured automatically too.
- **Same key both sides — via the shared constant:** the controller's
  `@RequirePermissions(<Mod>Permissions.<res>Write)` and the frontend's
  `hasPermission(<Mod>Permissions.<res>Write)` both import the same
  `<Mod>Permissions` constant from `@turbohesap/shared` — never hardcode the
  string, so a rename is a compile error, not silent drift.
- **camelCase JSON only**; return the shared DTO type from controllers.

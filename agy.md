# agy.md — TurboHesap Agent Operating Manual (STRICT)

> **This is a binding contract, not a tutorial.** If you are an AI agent working
> in this repository, you MUST follow every rule here, in order, for every task.
> Deviation is a defect. When this file and your own instinct disagree, **this
> file wins**. When this file and `AGENTS.md` / `DESIGN.md` / `mobile_design.md`
> overlap, treat them as layers: `AGENTS.md` = system facts, `DESIGN.md` /
> `mobile_design.md` = visual system, **`agy.md` = how you must operate**.

This manual exists because work on TurboHesap is done in many short sessions by
different agents. The product only stays coherent if **every** agent works the
**exact same way**: contracts-first, mirrored across layers, permission-gated,
built after every step, and **every endpoint tested over HTTP with a real token**
before it is called "done".

Read this whole file before touching code. Then keep it open.

---

## 0. The product in one paragraph

TurboHesap is a **pnpm monorepo** ERP. One **NestJS** process (PostgreSQL +
TypeORM) serves a **React (Vite)** SPA and a JSON API at `/api/<module>/<resource>`;
an **Expo** mobile app consumes the same API. A typed **`@turbohesap/shared`**
package is the single source of truth for every wire shape (DTOs), service
interface, axios client, and permission key. Auth is local JWT + DB-resolved
RBAC enforced by two global guards. The schema is owned by **migrations**
(`synchronize` is OFF). Everything user-facing is **Turkish**; all code, types,
and comments are **English**.

Packages: `@turbohesap/shared`, `@turbohesap/backend`, `@turbohesap/frontend`,
`@turbohesap/mobile`.

---

## 1. THE HARD RULES (non-negotiable)

1. **Contracts first.** Any API change starts in `shared/src/modules/<mod>/`
   (DTO → service interface → axios client), is registered in
   `shared/src/core/api.ts` + `shared/src/index.ts`, and **`shared` is rebuilt**
   before backend/frontend/mobile consume it. Never inline a wire shape in the
   backend or a client.
2. **The mirror rule (incl. mobile).** A module lives in mirrored places with the
   same name: `shared/src/modules/<mod>`, `backend/src/modules/<mod>`,
   `frontend/src/modules/<mod>`, **and `mobile/src/modules/<mod>`**. Endpoints are
   **always** `/api/<mod>/<resource>`. Modules talk to each other **only** through
   `@turbohesap/shared` DTOs. **Mobile is NOT optional** — every user-facing module
   ships at least a permission-gated mobile module config + list/detail screens
   (see §12). Skipping a platform is allowed **only** if the user explicitly
   approved it; if so, say so plainly in your final message. "I forgot mobile" is a
   defect, not a deferral.
3. **Build after every step.** After each layer you touch, run that layer's build
   /typecheck (see §4) and fix every error before moving on. Never stack unbuilt
   changes. "It looks right" is not "it builds".
4. **Permission-gate everything.** Every mutating route and every non-public read
   gets `@RequirePermissions(<Mod>Permissions.<res><Action>)`. The frontend mirrors
   the **same key constant** for UX. The server is the only real boundary.
5. **Migrations, never `synchronize`.** After any entity change, generate and apply
   a migration (`make migration-generate NAME=…` → `make migrate`) and review the
   SQL. No schema change ships without a committed migration.
6. **Test every endpoint over HTTP with a real token.** Before declaring any
   backend work done, acquire a JWT via `POST /api/auth/login` and exercise
   **every** new/changed route with `curl` (see §13). Reading the code is not a
   test. A green build is not a test. You must see real HTTP responses.
7. **English code, Turkish UX.** Identifiers, comments, commit messages → English.
   User-visible strings, seed data, permission descriptions → Turkish.
8. **camelCase JSON, snake_case DB.** DTOs and JSON are camelCase; the
   `SnakeNamingStrategy` maps DB columns. Never add `@Column({ name: … })`.
9. **Reuse the platform primitives.** Web tables → the **DataGrid** (§9). Files /
   images → the **files API + FileManager / ImageManager** (§8). Reference lists →
   **lookups** (§10). Per-user UI state → the **settings** API (§9). Do not
   re-implement these.
10. **Leave the docs true.** If you change structure, conventions, or the build
    pipeline, update `AGENTS.md`, the relevant skill, and this file in the same
    change.
11. **Money is `decimal`, never `float`.** Any monetary / quantity-with-precision
    column is `numeric/decimal` with a value transformer to a JS `number` — never
    `double precision`, `float`, or `real`. Floats corrupt money. See §7.1.
12. **Ship the whole feature, not a stub.** Deliver every resource the feature
    actually needs, not just the obvious master-data table. For an accounts feature
    that means the **transactions/movements ledger and computed balances**, not
    only the account list. If you must defer part of the scope, you **list each
    deferred piece explicitly** in your final message and get it acknowledged — you
    do not silently ship half a module and call it done.
13. **Every user-managed entity gets a detail page.** A list/grid row links
    (`onRowClick`) to a detail page (web `*-detail-page.tsx` + `$id` route; mobile
    detail screen) that surfaces the entity's **audit trail**, its **files/images**
    (`FileManager`/`ImageManager`), and its **related/child records**. A list +
    edit-dialog alone is incomplete for anything that has history, attachments, or
    children. (Pure tiny reference lists — see lookups — are the only exception.)

> If you cannot satisfy a rule, **stop and report why** — do not silently skip it.
> Scope you chose not to build is a **reported deferral**, never an unmentioned
> hole.

---

## 2. The per-task workflow (follow in order, every time)

For any feature/bugfix that touches the API or UI:

```
(1) shared   → DTO + service interface + axios client + register in core/api.ts + index.ts
              → pnpm --filter @turbohesap/shared build           [MUST pass]
(2) backend  → entity + dto/ (class-validator) + service + controller + permissions + module
              → make migration-generate NAME=… && make migrate    [if entity changed]
              → pnpm --filter @turbohesap/backend build           [MUST pass]
              → pnpm --filter @turbohesap/backend test            [MUST pass]
(3) TEST     → login for a token, curl EVERY new/changed endpoint  [§13, MUST pass]
(4) frontend → module.config + registry + pages (DataGrid/dialogs) + routes, same permission keys
              → pnpm --filter @turbohesap/frontend exec vite build  [regenerates routeTree.gen.ts]
              → pnpm --filter @turbohesap/frontend exec tsc -b       [MUST pass — after the route tree exists]
(5) mobile   → screens if needed (theme + primitives + permission gating)
              → pnpm --filter @turbohesap/mobile typecheck         [MUST pass]
              → CI=1 npx expo export --platform ios                [if RN deps/imports changed]
(6) docs     → update AGENTS.md / skill / agy.md if conventions changed
```

You do not advance to the next numbered step until the current one's build/test is
green. Step (3) is mandatory and is the most-skipped step — **do not skip it**.

> Before you call any layer done, run its checklist in **§18 (the complete
> registration map)**. Missing a wiring point (a `core/api.ts` factory line, the
> permissions catalog, the audit map, a mobile `screens.tsx` key, a `module.config`
> nav item, a `registry.ts` entry) compiles fine but ships a dead/invisible feature.
> §18 enumerates every file per layer; §19 covers adding an AI provider.

---

## 3. Architecture facts you must not violate

- **Two global guards** run on every route (`backend/src/app.module.ts`):
  `JwtAuthGuard` (authn; opt out with `@Public()`) → `PermissionsGuard` (authz;
  reads `@RequirePermissions`, resolves the caller's permissions **from the DB
  per request**, not from the token).
- **Token = roles only.** Permissions are fetched separately via
  `GET /api/auth/permissions`. Editing a role takes effect on the next request, no
  re-login.
- **`BaseEntity`** (`backend/src/common/entities/base.entity.ts`): uuid `id` +
  `createdAt` + `updatedAt`. Every entity extends it.
- **`Page<T>` + `PageQuery`** for any list that can grow large; small bounded lists
  may return arrays.
- **Audit**: a global subscriber records insert/update/delete of tracked entities.
  When you add an audited entity, register it in
  `backend/src/modules/iam/audit/audited-entities.ts` (`ENTITY_MODULE_MAP`); add
  high-churn/noise entities to `IGNORED_AUDIT_ENTITIES`.
- **Dual build of shared**: ESM (bundlers) + CJS (Nest `require`). Never collapse it.

---

## 4. Build & verify commands (memorize these)

Run from repo root. **These are the only acceptable "is it green?" checks.**

| Layer | Build / verify command |
| ----- | ---------------------- |
| shared | `pnpm --filter @turbohesap/shared build` |
| backend | `pnpm --filter @turbohesap/backend build` |
| backend tests | `pnpm --filter @turbohesap/backend test` |
| frontend | `pnpm --filter @turbohesap/frontend exec vite build` **then** `pnpm --filter @turbohesap/frontend exec tsc -b` |
| mobile | `pnpm --filter @turbohesap/mobile typecheck` |
| mobile bundle | `CI=1 npx expo export --platform ios` (run inside `mobile/`; do for android too if native deps changed) |
| DB migration | `make migration-generate NAME=AddThing` → `make migrate` (revert: `make migration-revert`) |
| run the API for testing | `make dev-backend` (NestJS watch on `:5800`) — needed for §13 |

Rules:
- `noUnusedLocals` is ON in frontend and mobile — an unused import is a build
  failure. Remove imports you stop using.
- The frontend compiles into `backend/static/`; the route tree
  (`routeTree.gen.ts`) is regenerated by the vite build — always run the vite
  build after adding a route file.
- Never commit unless explicitly asked. When you do, branch off `main` first.

---

## 5. Authorization — the exact recipe (do this for EVERY resource)

**Step A — shared key constant** (`shared/src/modules/<mod>/<mod>.permissions.ts`):
```ts
export const InventoryPermissions = {
  productsRead: 'inventory.products.read',
  productsWrite: 'inventory.products.write',
} as const
```
**Step B — backend description + catalog** (`backend/src/modules/<mod>/<mod>.permissions.ts`):
```ts
import { InventoryPermissions } from '@turbohesap/shared'
import type { PermissionDef } from '../../common/permission.types'
export const INVENTORY_PERMISSION_DEFS: PermissionDef[] = [
  { key: InventoryPermissions.productsRead,  description: 'Ürünleri görüntüle', group: 'Envanter' },
  { key: InventoryPermissions.productsWrite, description: 'Ürünleri düzenle',   group: 'Envanter' },
]
```
Add `...INVENTORY_PERMISSION_DEFS` to `backend/src/permissions.catalog.ts`. They
**auto-seed on boot** (admin gets every key). No migration for permissions.

**Step C — guard the route** (controller):
```ts
@RequirePermissions(InventoryPermissions.productsWrite)  // ALL listed keys required
@Post()
create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) { … }
```
Read routes → `.read`; mutations → `.write`. No `@RequirePermissions` → any valid
token. `@Public()` → no token (use ONLY for login/refresh/logout, health, the
public file-raw route, the public client-error report).

**Step D — mirror the SAME key on the UI** (frontend & mobile):
```tsx
const canWrite = hasPermission(InventoryPermissions.productsWrite)
// nav item: { permission: InventoryPermissions.productsRead }
// query:   useQuery({ enabled: hasPermission(InventoryPermissions.productsRead), … })
// <Can permission={InventoryPermissions.productsWrite}> … </Can>
// <PermissionRequired permission={InventoryPermissions.productsRead}> … </PermissionRequired>
```

`@CurrentUser()` returns `AuthUser { sub, username, roles }`; `sub` is the userId.

---

## 6. Shared contracts — the exact shape

For a resource `<Res>` in module `<mod>`, create in `shared/src/modules/<mod>/`:

```ts
// <res>.dto.ts — pure interfaces. No React, Nest, TypeORM, or I/O.
export interface ProductDto { id: string; name: string; /* … */ createdAt: string; updatedAt: string }
export interface CreateProductRequest { name: string /* … */ }
export type UpdateProductRequest = Partial<CreateProductRequest>
```
```ts
// products.service.ts — the contract.
import type { ProductDto, CreateProductRequest, UpdateProductRequest } from './product.dto'
export interface IProductsService {
  list(): Promise<ProductDto[]>
  get(id: string): Promise<ProductDto>
  create(input: CreateProductRequest): Promise<ProductDto>
  update(id: string, input: UpdateProductRequest): Promise<ProductDto>
  remove(id: string): Promise<void>
}
```
```ts
// products.client.ts — axios implementation of the interface.
import type { AxiosInstance } from 'axios'
export class ProductsApiClient implements IProductsService {
  constructor(private readonly http: AxiosInstance) {}
  async list() { return (await this.http.get<ProductDto[]>('/inventory/products')).data }
  // … one method per interface member, hitting /inventory/products/<id>
}
```
Then:
- `shared/src/modules/<mod>/index.ts` re-exports everything.
- `shared/src/index.ts` re-exports the module folder.
- `shared/src/core/api.ts`: add to the `TurbohesapApi` type (grouped per module:
  `inventory: { products: IProductsService }`) and construct it in the factory.
- `pnpm --filter @turbohesap/shared build`.

**Pure domain helpers** shared by web AND mobile go in `<name>.helpers.ts` —
pure functions only, operating on DTOs (e.g. `category.helpers.ts`,
`product-filters.ts`). No platform code.

---

## 7. Backend module — the exact shape

`backend/src/modules/<mod>/`:
- `entities/<res>.entity.ts` — `@Entity('<res_plural>')` extends `BaseEntity`;
  jsonb columns where appropriate; `@Index([...])` for polymorphic/lookup columns.
- `dto/create-<res>.dto.ts` / `update-…` — classes with `class-validator`
  decorators that `implements` the shared request interface.
- `<res>.service.ts` — `@Injectable()`, `@InjectRepository`, maps **entity → shared
  DTO** in a `to<Res>Dto()` function (JSON stays camelCase).
- `<res>.controller.ts` — `@Controller('<mod>/<res>')`, returns shared DTO types,
  `@RequirePermissions(...)` per route, `@CurrentUser()` where needed.
- `<mod>.permissions.ts` — the `PermissionDef[]` (§5B).
- `<mod>.module.ts` — `TypeOrmModule.forFeature([...])` + providers + controllers.
- Register the module in `backend/src/app.module.ts`.
- If you added an audited entity, register it in `audited-entities.ts`.
- Generate + apply a migration. Build. Test. **Then §13.**

### 7.1 Money, quantities & numeric columns (STRICT)
**Never store money or precise quantities as a float.** PostgreSQL `double
precision` / `real` and JS floats lose precision and silently corrupt totals — a
fatal bug in finance, inventory pricing, tax, etc.

- A reusable transformer already exists: `backend/src/common/decimal.transformer.ts`
  (`decimalTransformer`) — use it on `numeric` columns instead of re-inlining.
- Use a `numeric/decimal` column with explicit precision/scale **and a value
  transformer** so the entity property and the shared DTO stay a plain `number`:
  ```ts
  // money column on an entity (decimal in DB, number in TS/JSON)
  @Column('numeric', { precision: 18, scale: 2, default: 0,
    transformer: { to: (v: number) => v, from: (v: string | null) => (v == null ? 0 : Number(v)) } })
  openingBalance!: number
  ```
  Use `scale: 2` for currency; widen scale for unit prices/quantities as needed
  (`numeric(18,4)`). Quantities that can be fractional follow the same rule.
- Confirm the generated migration emits `numeric(18,2)` — **not** `double
  precision`. If it shows `double precision`, the entity is wrong; fix it and
  regenerate.
- Currency is always an explicit field next to the amount; default `'TRY'`.
- Format for display on the client (`Intl.NumberFormat('tr-TR', { style:
  'currency', currency })`); put the helper in a shared/util, not duplicated per
  page.
- A **balance is computed** from the movements ledger (opening balance + Σ
  transactions), exposed as a derived DTO field — like `category.productCount`.
  Do not keep a mutable `balance` column you update by hand.

### 7.2 Branch scoping
Money/stock/operational entities are usually **per branch**. Add a `branchId`
(FK to `org` `Branch`, via the shared `BranchSummary` DTO for embedding) when the
entity belongs to a location, so per-branch authorization (the existing
`user_branches` model) and per-branch reporting work. Ask yourself "is this global
or per-branch?" for every operational entity and justify the answer.

### 7.3 Route ordering — never shadow a collection route under another `:param`
A static collection route placed under a path that **another controller already
owns with a parametric segment** is swallowed by that param. Real bug: a
`GET /inventory/products/modifier-map` was captured by the products controller's
`/inventory/products/:id` → the literal `"modifier-map"` was parsed as a UUID
(`500 invalid input syntax for type uuid: "modifier-map"`).
- RULE: never put a static collection route under another controller's `:id`
  parent. Give it its own path — the fix moved it to `/inventory/modifier-map`
  (see `backend/src/modules/inventory/product-modifiers.controller.ts`).
- Within ONE controller, declare static segments before parametric ones, but
  cross-controller you cannot rely on order — use a non-colliding path.

### 7.4 The server is authoritative for money — never trust client prices
For POS order lines the server re-resolves `name` / `unitPrice` / `taxRate` from
`productId` (+ the register's sales-channel `ProductChannelPrice`) and modifier
snapshots from `optionId`; client-supplied values are **overrides only**, gated by
a price-override permission (`pos.price.override`). See
`backend/src/modules/pos/pos-orders.service.ts`.
- Tax/price math lives **once** in shared `pos-pricing.helpers.ts`
  (`resolveUnitPrice` / `lineGross` / `taxBreakdown` / `modifierDeltaSum`) and is
  used by BOTH server and clients, so previews match the posted total to the kuruş.
  Never duplicate pricing math per platform.

---

## 8. File management system (images & files) — USE IT, don't reinvent

Files of any kind attach to **any entity** via a **polymorphic FK**. Bytes are
stored under a **random** `storedName`; the DB row keeps the meaningful
`originalName` + metadata. Two backends, chosen by `.env` (`FILE_STORAGE=local|s3`).

### Backend (already built — do not duplicate)
- `backend/src/modules/files/` — `FileEntity` (`files` table,
  `@Index(['entityType','entityId'])`), `StorageDriver` interface +
  `LocalStorageDriver` + `S3StorageDriver` (chosen via the `STORAGE_DRIVER` DI
  token from `configuration().files.driver`), `FilesService`, `FilesController`.
- Config (`.env`): `FILE_STORAGE`, `FILE_LOCAL_DIR`, `FILE_MAX_SIZE_MB`,
  `S3_*` (see `.env.example`).
- Permissions: `FilesPermissions.read` / `FilesPermissions.write`.

### Endpoints (`/api/files`)
| Method | Path | Guard | Purpose |
| ------ | ---- | ----- | ------- |
| `POST` | `/api/files` | `files.write` | multipart upload (`files[]` + `entityType`, `entityId`, `kind`, `sortOrder`) |
| `GET` | `/api/files?entityType=&entityId=` | `files.read` | list an entity's files |
| `GET` | `/api/files/raw/:storedName` | **`@Public()`** | serve raw bytes (unguessable name = capability; works in `<img>`) |
| `GET` | `/api/files/:id` | `files.read` | one file row |
| `PATCH` | `/api/files/:id` | `files.write` | update metadata (e.g. `sortOrder` for reorder) |
| `DELETE` | `/api/files/:id` | `files.write` | delete row + bytes |

### Shared client
`api.files.{ list(entityType,entityId), get(id), upload(FormData), update(id,patch),
remove(id), rawUrl(storedName) }`. **Use `api.files.rawUrl(storedName)` for `<img src>`.**

### Web UI — `FileManager`
`frontend/src/modules/files/components/file-manager.tsx`:
```tsx
<FileManager entityType="Product" entityId={product.id} kind="image" canWrite={canFiles} />
// kind="image" → thumbnail gallery (drag-reorder, set-cover, delete)
// kind="file"  → list with download + delete
```
`canFiles = hasPermission(FilesPermissions.write)`. The upload FormData fields are
exactly: `files`, `entityType`, `entityId`, `kind`, `sortOrder`.

### Mobile UI — `mobile/src/components/image/` (modular, reusable)
- `<ImageManager entityType entityId canWrite layout="grid"|"strip" />` — gallery +
  add (camera/library) → **edit** → upload, set-cover/reorder/delete, tap →
  fullscreen `ImageViewer`.
- `<QuickImageAdd entityType entityId canWrite />` — compact horizontal quick-add.
- `<ImageEditor />` — crop (aspect) / rotate / flip + colour (Skia colour-matrix
  bake). `bakeImage()` + `color-matrix.ts` + `pick-image.ts` + `image-files.ts`.
- RN upload uses `FormData` with `{ uri, name, type }` (see `image-files.ts`).
- **Native deps** (`@shopify/react-native-skia`, `expo-image-picker`,
  `expo-image-manipulator`, `expo-image`, `expo-file-system`) require
  `npx expo prebuild` + a dev build — they do NOT run in plain Expo Go.

**To add images/files to a new entity:** nothing backend-side — just render a
`FileManager` (web) / `ImageManager` (mobile) with that `entityType` + the row id.
`entityType` is a free string; use the PascalCase entity name (`'Product'`,
`'ProductVariant'`, `'Category'`).

---

## 9. Settings + Data Grid (web) — per-user state & every web table

### Settings API (per-user, cached read-through/write-through)
`backend/src/modules/settings/` — `user_settings` table
(`@Index(['userId','type'],{unique:true})`, jsonb `data`), in-memory cache +
DB. Endpoints (`/api/settings`, authenticated, no extra permission):
`GET/PUT/DELETE /api/settings/:type`. Shared: `api.settings.get(type)` /
`api.settings.set(type, data)` / `api.settings.remove(type)`. Each grid/page stores
its own jsonb under a `type` key like `grid:<gridId>`.

### DataGrid — the ONLY web table primitive
`frontend/src/components/data-grid/`. **Every web list/table uses this.** It is
TanStack-Table-based and provides: global search, per-column filters, sorting,
grouping, column reorder (drag), column chooser (scrollable), column pin
left/right, single/multi/no row selection, row click → detail, pagination, and
**tree mode**. Its layout state is **persisted per user** via the settings API
(`gridId` → `grid:<gridId>`), auto-loaded on mount, debounce-saved.

```tsx
import { DataGrid, type ColumnDef } from '@/components/data-grid'

const columns: ColumnDef<ProductDto>[] = [
  { id: 'code', accessorKey: 'code', header: 'Kod', size: 120,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
  { id: 'category', accessorFn: (p) => p.category?.name ?? '', header: 'Kategori',
    enableGrouping: true, cell: ({ row }) => <Badge>{row.original.category?.name ?? '—'}</Badge> },
  // action column: enableSorting:false, enableHiding:false, enableColumnFilter:false,
  // enableGrouping:false; buttons call e.stopPropagation() so row-click still works.
]

<DataGrid
  gridId="inventory.products"     // unique, stable — the persistence key
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  loading={query.isLoading}
  onRowClick={(r) => navigate({ to: '/inventory/products/$id', params: { id: r.id } })}
  emptyText="Kayıt yok."
  toolbar={canWrite ? <Button onClick={openCreate}><Plus />Yeni</Button> : null}
/>
```

**Key props:** `gridId` (required, unique), `data`, `columns`, `getRowId`,
`loading`, `onRowClick`, `toolbar` (right-aligned actions), `emptyText`,
`selection` (`'none'|'single'|'multi'`) + `onSelectionChange`, `rowClassName`
(transient row highlight), `search` (page-controlled override — use it instead of
a second search box), `hideSearch`, `fillHeight` (toolbar fixed, body scrolls).

**Tree tables** (e.g. categories): provide `getSubRows`, `treeColumnId`,
`defaultExpanded`, and usually `pagination={false}`. The grid renders indentation
rails + an animated chevron. (Gotcha already handled in the component: the
pagination row model is always included because TanStack only flattens expanded
children there.) Build nested data yourself (parent → `children`) and pass roots.

```tsx
<DataGrid gridId="inventory.categories" data={roots} columns={cols}
  getSubRows={(c) => c.children} treeColumnId="name" defaultExpanded pagination={false} … />
```

**Page-layout rule (consistency):** list/grid pages do **NOT** render a
`<PageHeader>` title band — the page title is in the app breadcrumb. Put all
actions + search on the grid toolbar line. (`PageHeader` stays for **detail**
pages, where it carries title + `audit` + actions.) Detail pages use `Tabs` +
`Card` (see `product-detail-page.tsx` / `category-detail-page.tsx`).

**Dialogs:** create/edit happen in a `Dialog` that **saves only on the
Save/Kaydet button** (never auto-create on open). After save: close, toast,
`invalidate` the query (React Query refetches in place — no page reload). See
`category-dialog.tsx` and the `rowClassName` highlight in `categories-page.tsx`.

---

## 10. Lookups — generic reference lists

Reusable key/value reference data (units, colours, etc.) lives in the **lookups**
module instead of bespoke tables. `backend/src/modules/lookups/`,
permissions `LookupsPermissions.read|write`.

Endpoints (`/api/lookups`): `GET /items` (optionally `?list=`), `GET /lists`,
`GET /items/:id`, `POST /items` (write), `PATCH /items/:id` (write),
`DELETE /items/:id` (write). Shared: `api.lookups.{ list(), … }`.

- A `LookupItemDto` has `list` (the list name), `key`, `value`, `sortOrder`,
  `isActive`. Resolve a key to a label via the list map (see
  `products-page.tsx` `lookupLabels`).
- **Web:** the lookups page renders one **DataGrid per list** inside an accordion.
- **Frontend/mobile pickers** consume lookups (web `LookupSelect`, mobile
  `LookupSelect`) — bind a `select`/`lookup` field to a `lookupList`.
- A category custom field of type `lookup` references a `lookupList`; the product
  form renders the picker from it.

**Use lookups** for any small, user-managed enumerated list. Do not create a new
table + module for "a list of X values".

---

## 11. Frontend UI rules

- Stack: React 19, Vite, Tailwind v4, shadcn/ui, TanStack Router (file routes) +
  Query. Follow `DESIGN.md` and the component/page skills.
- All API access via `frontend/src/lib/api.ts` (`api.<mod>.<res>.<method>()`).
- Routes: thin files under `src/routes/_authed/<mod>/`; a list at
  `<res>.index.tsx`, a detail at `<res>.$id.tsx`. The vite build regenerates
  `routeTree.gen.ts`.
- Nav: `src/modules/<mod>/module.config.ts` (icon + items with a `permission`),
  registered in `src/modules/registry.ts`.
- Tables → DataGrid (§9). Files → FileManager (§8). Lists → lookups (§10).
- Gate every page with `<PermissionRequired>`, every query with `enabled:
  hasPermission(...)`, every action with the same key. Verify: `vite build` +
  `tsc -b`.
- **Full-screen / template-independent surfaces** (POS terminal, KDS, etc.) use a
  **pathless gated layout route group that renders its OWN chrome** — no AppShell.
  Pattern: `frontend/src/routes/_pos.tsx` mirrors `_authed.tsx` (auth gate) but
  renders a full-screen shell (`h-svh`, its own header). Its **public** login
  (`/pos/login`, `frontend/src/routes/pos.login.tsx`) lives OUTSIDE the gate as a
  top-level route, else the gate redirect-loops on unauthenticated users.
- A module whose `home` is a full-screen surface makes its in-sidebar admin pages
  unreachable. A module's `home` (`module.config.ts`) MUST be a normal in-shell
  dashboard page (e.g. POS `home: '/pos/dashboard'`); launch the full-screen
  surface from a CTA on that dashboard.
- **`PageWrapper` adds NO vertical spacing** between children — pass
  `className="space-y-6"` (or wrap) to space page sections
  (`frontend/src/components/layout/page.tsx`).
- **Dashboards / charts**: reuse `frontend/src/components/dashboard/{echart.tsx,
  chart-card.tsx}` (Apache ECharts; `barOption` / `donutOption` / `lineOption`).
  Do not add another charting library.

---

## 12. Mobile rules

- Expo (RN 0.85 / React 19), same `@turbohesap/shared`. Read `mobile_design.md`
  before any mobile UI.
- Theme tokens: `src/theme/tokens.ts` + `theme-context.tsx` (`useTheme()`),
  never hardcode colours. Primitives in `src/components/*` (Feather icons via
  `Icon`, `Button`, `Card`, `Text`, `Input`, `SegmentedControl`, `Slider`, …).
- API via `src/lib/api.ts`; data via `useAsync`. Same RBAC surface (`useAuth()`,
  `<Can>`, `<PermissionRequired>`, `useAsync(…, { enabled })`).
- Images → the `components/image/` module (§8). Navigation is the
  dependency-free registry in `src/navigation/*`.
- **Two registration points — both mandatory for every new screen** (the
  most-missed mobile step): (1) add the screen key → component to the map in
  `mobile/src/navigation/screens.tsx`; (2) add a nav item (`key`, `title`, Feather
  `icon`, `description`, `permission`) to `mobile/src/modules/<mod>/module.config.ts`
  `items`. A screen file that is not in BOTH is dead code. Navigate with
  `useNav().navigate('<mod>.<res>'[, params, title])` — the key MUST exist in the
  map. Form/sheet/bell components mounted directly by a screen need no key.
- Verify: `pnpm --filter @turbohesap/mobile typecheck`; if you changed RN
  deps/imports, also `CI=1 npx expo export --platform ios`.

---

## 13. ENDPOINT TESTING PROTOCOL (mandatory, with a real token)

**You must run this for every new/changed endpoint before calling work done.**
A passing build proves types; it does not prove the route authenticates,
authorizes, validates, persists, and returns the right shape. Only HTTP does.

### Setup
1. Ensure Postgres is up and the backend is running: `make dev-backend` (`:5800`).
2. Base URL: `http://localhost:5800/api`. Seed admin: `admin` / `Admin123!`
   (`.env` `SEED_ADMIN_*`).

### Acquire a token
```bash
BASE=http://localhost:5800/api
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')
echo "${TOKEN:0:20}…"   # sanity: non-empty
AUTH="Authorization: Bearer $TOKEN"
```
`LoginResponse` is `AuthTokens & { user }`, so the token is `.accessToken`.

### Exercise the resource (example: inventory/products)
```bash
# CREATE (write) — expect 201 + the created DTO
curl -s -X POST "$BASE/inventory/products" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Test ürün","code":"TST-1"}' | jq .

# LIST (read) — expect 200 + array (or Page<T>)
curl -s "$BASE/inventory/products" -H "$AUTH" | jq 'length'

# GET one
ID=$(curl -s "$BASE/inventory/products" -H "$AUTH" | jq -r '.[0].id')
curl -s "$BASE/inventory/products/$ID" -H "$AUTH" | jq .

# UPDATE (write)
curl -s -X PATCH "$BASE/inventory/products/$ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Güncellendi"}' | jq .

# DELETE (write) — expect 204
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE "$BASE/inventory/products/$ID" -H "$AUTH"
```

### Prove the guards actually guard (do this too)
```bash
# No token → 401
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/inventory/products"          # expect 401
# Bad body → 400 (ValidationPipe)
curl -s -X POST "$BASE/inventory/products" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"bogus":true}' | jq .                                                   # expect 400 ApiError
```

### File upload (multipart) test
```bash
curl -s -X POST "$BASE/files" -H "$AUTH" \
  -F 'files=@/path/to/image.png' \
  -F 'entityType=Product' -F "entityId=$ID" -F 'kind=image' -F 'sortOrder=0' | jq .
# then the public raw URL works without a token:
SN=$(curl -s "$BASE/files?entityType=Product&entityId=$ID" -H "$AUTH" | jq -r '.[0].storedName')
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$BASE/files/raw/$SN"  # expect 200 image/png
```

### What "tested" means (all must hold)
- Authn: no/invalid token → **401**.
- Authz: a token lacking the permission → **403** (test with a non-admin role if
  the route is permission-gated and you can create one; at minimum confirm the
  decorator is present and admin succeeds).
- Validation: malformed body → **400** with the `ApiError` shape.
- Happy path: correct status (200/201/204) and the **exact shared DTO shape**.
- Side effects: a create then list/get reflects it; a delete then get → **404**.

**Do not be fooled by `jq` run over an error body.** A `500`/`400` returns the
`ApiError` shape `{statusCode,error,message}`, so `jq 'length'` or
`jq 'to_entries|length'` happily prints `3` as if you got data — always check the
HTTP status (`-w '%{http_code}'`) and inspect the body before trusting a count.

Record (in your final message) the commands you ran and the status codes you saw.
If you could not run them, say so explicitly and why — do not imply you did.

---

## 14. Migration protocol

- Change entities → `make migration-generate NAME=AddX` (diffs entities ↔ the
  **current** DB, so keep your local DB migrated first) → **review the SQL** →
  `make migrate`. Commit the migration file.
- Never enable `synchronize`. Never hand-edit applied migrations; add a new one.
- A permission is NOT a schema change — it auto-seeds (§5). No migration for it.
- **Run migrations as the APP db role, never the superuser.**
  `pnpm --filter @turbohesap/backend migration:run|generate` reads `DATABASE_URL`;
  if it is unset it falls back to the `postgres` superuser and the new tables end up
  **owned by postgres** → the app role (`turbohesap`) hits `permission denied for
  table` at runtime. Always pass the app role explicitly, e.g.
  `DATABASE_URL=postgres://turbohesap:turbohesap@localhost:5432/turbohesap pnpm
  --filter @turbohesap/backend migration:run` (the `make` targets already do this).
  Repair a mis-owned table as postgres: `ALTER TABLE <t> OWNER TO turbohesap`.
- **Review generated migrations and STRIP unrelated drift** before committing — a
  generate run picks up incidental diffs (e.g. CRM index renames) that don't belong
  to your change. Commit only the SQL for the feature at hand.

---

## 15. Definition of Done (tick every box)

- [ ] `shared` built; `core/api.ts` + `index.ts` (+ `app-modules.ts` for a new
      module) updated; no inline wire shapes.
- [ ] **Scope is complete** (rule 12): every resource the feature needs exists
      (incl. the transactions/movements ledger + computed balances for an accounts
      feature), or each deferral is explicitly listed and acknowledged.
- [ ] **No money/quantity stored as float** (§7.1): migration shows
      `numeric(…)`, entity uses the number transformer, currency field present,
      balances computed. Grep the migration for `double precision` → must be none
      on money columns.
- [ ] **Branch scoping decided** (§7.2): operational entities have `branchId` or a
      stated reason they're global.
- [ ] Backend builds **and** unit tests pass; **new service logic has `*.spec.ts`
      coverage** (uniqueness, balance math, validation branches).
- [ ] Entity changes have a committed, reviewed migration; `make migrate` ran.
- [ ] Every route has the right `@RequirePermissions` (or `@Public()`); the same
      key is mirrored in the UI; audited entities registered in `audited-entities.ts`.
- [ ] **Every new/changed endpoint exercised over HTTP with a real token** (§13),
      including 401/400 negative checks; results reported.
- [ ] Frontend `vite build` + `tsc -b` pass; tables use DataGrid; list pages have
      no redundant header band; dialogs save-on-submit; **list rows link to a
      detail page** (rule 13) that shows audit + files + related records.
- [ ] **Mobile built** (rule 2): module config + list/detail screens, permission
      gated; `typecheck` passes (+ `expo export` if RN deps/imports changed). If
      mobile was deferred, it was user-approved and is stated.
- [ ] `AGENTS.md` / skills / `agy.md` updated if conventions changed.

If any box is unchecked, the task is **not done** — say exactly what remains.

---

## 16. Forbidden (do not do these)

- ❌ Inline a DTO / wire shape in backend or a client instead of `shared`.
- ❌ Add a route without a permission decision (`@RequirePermissions` or `@Public()`).
- ❌ Change schema via `synchronize` or without a migration.
- ❌ Build a bespoke HTML `<table>` for a web list — use DataGrid.
- ❌ Roll your own upload/storage — use the files API + FileManager/ImageManager.
- ❌ Create a new table for a small enumerated list — use lookups.
- ❌ Claim "done" without the §13 HTTP token tests.
- ❌ Leave a build/typecheck red and move on.
- ❌ Store money/quantity as `double precision`/`float`/`real` (§7.1).
- ❌ Ship master-data tables only and omit the transactions/movements + balances
  the feature exists for (rule 12), without explicitly reporting the deferral.
- ❌ Skip the mobile layer of a user-facing module without explicit user approval
  (rule 2).
- ❌ Ship a list + edit-dialog with **no detail page** for an entity that has
  audit history, attachments, or child records (rule 13).
- ❌ Add backend service logic with **no `*.spec.ts`** test.
- ❌ Put a static collection route under another controller's `:id` parent — it
  gets shadowed and the literal segment is parsed as the param (§7.3).
- ❌ Trust client-supplied prices/tax for money-bearing lines — the server
  re-resolves them; client values are permission-gated overrides only (§7.4).
- ❌ Run migrations as the `postgres` superuser (unset `DATABASE_URL`) — it leaves
  tables owned by postgres and the app gets `permission denied` (§14).
- ❌ Make a module's `home` a full-screen surface — its sidebar admin pages become
  unreachable; `home` must be an in-shell dashboard (§11).
- ❌ Hardcode permission strings, colours (mobile), or `@Column({ name })`.
- ❌ Commit/push unless explicitly asked.

---

## 17. Canonical references (copy these shapes)

| You want to… | Read / copy |
| ------------ | ----------- |
| add a module end-to-end | skill `create-module`; the **`iam`** module (full CRUD) |
| shared contract shape | `shared/src/modules/iam/*`, `shared/src/core/api.ts` |
| backend module shape | `backend/src/modules/inventory/*` |
| permissions | `shared/src/modules/*/**.permissions.ts`, `backend/src/permissions.catalog.ts`, `backend/src/common/` guards |
| a web grid page | `frontend/src/modules/org/pages/branches-page.tsx`; tree: `…/inventory/pages/categories-page.tsx`; advanced: `…/inventory/pages/products-page.tsx` |
| a web detail page | `frontend/src/modules/inventory/pages/{product,category}-detail-page.tsx` |
| a create/edit dialog | `frontend/src/modules/inventory/components/category-dialog.tsx` |
| the DataGrid | `frontend/src/components/data-grid/*` |
| files / images (web) | `frontend/src/modules/files/components/file-manager.tsx`; backend `backend/src/modules/files/*` |
| files / images (mobile) | `mobile/src/components/image/*` |
| settings (per-user state) | `backend/src/modules/settings/*`, `frontend/src/components/data-grid/use-grid-state.ts` |
| lookups | `backend/src/modules/lookups/*`, `shared/src/modules/lookups/*` |
| mobile screen | `mobile/src/modules/inventory/*`, `mobile_design.md` |
| **the most complete full-stack module (all advanced patterns)** | **`contacts` (CRM)** across all four packages — copy it for anything non-trivial |
| kanban / drag-drop board (web) | `frontend/src/modules/contacts/pages/pipeline-board-page.tsx` (`@dnd-kit`); mobile fallback: `…/PipelineBoardScreen.tsx` + `StageChangePicker.tsx` |
| analytics dashboard (charts/KPIs) | `frontend/src/modules/contacts/pages/crm-dashboard-page.tsx`; backend `…/contacts/crm-analytics.service.ts` |
| in-app notifications + scheduler | `backend/.../contacts/notifications.service.ts` (`@Cron`), entity `notification.entity.ts`; web `components/notification-bell.tsx`; mobile `NotificationBell.tsx` |
| per-entity custom fields | shared `CrmFieldDef`(=inventory `CategoryFieldDef`); backend `crm-fields.service.ts` + `entities/crm-field-def.entity.ts` + `attributes jsonb` column; web reuse `inventory/components/{field-def-builder,dynamic-attribute-fields}.tsx` |
| bulk actions / CSV import | backend `contacts.service.ts` `bulk()`/`importContacts()`; web `components/bulk-actions-bar.tsx`, `pages/contacts-import-page.tsx` |
| integrations (email/Telegram/WhatsApp/SMS) | `backend/.../contacts/integrations.service.ts` (adapters + secret masking); entity `integration-connection.entity.ts`; web `pages/integrations-settings-page.tsx` (tabbed) |
| **AI — pluggable provider layer** | `backend/.../contacts/ai/ai-provider.ts` (`runAi`); provider catalog + model variants in shared `AI_PROVIDERS` (`integrations.dto.ts`). **To add an AI agent see §19.** |
| a full-screen / template-independent surface | `frontend/src/routes/_pos.tsx` (gated own-chrome layout) + public `pos.login.tsx`; module config `home` stays in-shell (§11, §18.6) |
| server-authoritative pricing + settle/post-to-ledger | `backend/src/modules/pos/pos-orders.service.ts` (one `manager.transaction`, `reverseSource`); shared math `shared/src/modules/pos/pos-pricing.helpers.ts`; mirrors `invoices.service`. See `docs/pos.md` |

> Work like the agent before you and the agent after you will read your diff and
> have to extend it. Same shapes, same gates, same tests. Every time.

---

## 18. The complete registration map — every file you must touch

> The #1 source of defects is a **missing registration**: code compiles in
> isolation but the feature is invisible/dead because a wiring point was skipped.
> When adding a resource/feature, go through **every** box for each layer you
> touch. Paths use `<mod>` = module, `<res>` = resource.

### 18.1 shared (`shared/src/modules/<mod>/`)
- [ ] `<res>.dto.ts` (+ `*.helpers.ts` for pure cross-platform logic).
- [ ] `<res>.service.ts` (interface) and `<res>.client.ts` (axios impl).
- [ ] `<mod>.permissions.ts` — add the key constant(s).
- [ ] `<mod>/index.ts` — re-export the new DTO/service/client files.
- [ ] `shared/src/index.ts` — re-exports the module folder (only for a NEW module).
- [ ] `shared/src/core/api.ts` — add the client to the module's interface block
      **and** construct it in `createTurbohesapApi` (BOTH places).
- [ ] `shared/src/core/app-modules.ts` — only when adding a NEW module.
- [ ] Rebuild: `pnpm --filter @turbohesap/shared build` before anything consumes it.

### 18.2 backend (`backend/src/modules/<mod>/`)
- [ ] `entities/<res>.entity.ts` — `@Entity('<table>')` extends `BaseEntity`;
      money/qty via `decimalTransformer` (§7.1).
- [ ] `dto/*.dto.ts` — class-validator classes `implements` the shared requests.
- [ ] `<res>.service.ts` (+ `to<Res>Dto`) and `<res>.controller.ts`
      (`@RequirePermissions` per route, `@CurrentUser()` where needed).
- [ ] `<mod>.permissions.ts` — `PermissionDef[]` (Turkish descriptions).
- [ ] `backend/src/permissions.catalog.ts` — spread the module's defs in (so they
      auto-seed; admin auto-granted; non-admin roles need explicit grants).
- [ ] `<mod>.module.ts` — add the entity to `TypeOrmModule.forFeature([...])`,
      and the service to `providers`, the controller to `controllers`. (Cross-module
      entity, e.g. `User`, is added to `forFeature` here too.)
- [ ] `backend/src/app.module.ts` — register the module (NEW module only).
- [ ] `backend/src/modules/iam/audit/audited-entities.ts` — add business entities to
      `ENTITY_MODULE_MAP`; add high-churn/secret entities to `IGNORED_AUDIT_ENTITIES`.
- [ ] Migration (`make migration-generate NAME=… && make migrate`) + review SQL.
- [ ] `*.spec.ts` for new service logic. Build + test + **§13 HTTP token tests.**

### 18.3 frontend / web (`frontend/src/modules/<mod>/`)
- [ ] `pages/<res>-page.tsx` (DataGrid list, no PageHeader band) and
      `pages/<res>-detail-page.tsx` (PageHeader + audit + files + related; rule 13).
- [ ] `components/<res>-dialog.tsx` (save-on-submit) + any sub-dialogs.
- [ ] `routes/_authed/<mod>/<res>.index.tsx` and `<res>.$id.tsx` (thin route files).
- [ ] `modules/<mod>/module.config.ts` — nav items (icon + `to` + `permission`).
- [ ] `frontend/src/modules/registry.ts` — register the module (NEW module only).
- [ ] Verify with `vite build` (regenerates `routeTree.gen.ts`) **then** `tsc -b`.
      A new route only type-resolves in `navigate({to})` AFTER the vite build.

### 18.4 mobile (`mobile/src/modules/<mod>/`)
- [ ] Screen files: `<Res>Screen.tsx` (list), `<Res>DetailScreen.tsx`,
      `<Res>FormScreen.tsx` (+ sheets/pickers as needed).
- [ ] `mobile/src/navigation/screens.tsx` — import each screen **and** add its
      `'<mod>.<res>'` key → component to the map (BOTH).
- [ ] `mobile/src/modules/<mod>/module.config.ts` — `items` nav entries
      (`key`, `title`, Feather `icon`, `description`, `permission`).
- [ ] `mobile/src/modules/registry.ts` — register the module (NEW module only).
- [ ] Dashboard parity: a `MODULE_DASHBOARDS` entry / `<Mod>Dashboard.tsx` if the
      web module has a dashboard (do not skip the dashboard on either platform).
- [ ] Verify `pnpm --filter @turbohesap/mobile typecheck`.

### 18.5 "new feature in an EXISTING module" vs "new module"
- **New resource/feature in an existing module:** do 18.1–18.4 but SKIP the
  "NEW module only" lines (`shared/src/index.ts`, `app-modules.ts`,
  `app.module.ts`, `registry.ts`) — those already exist.
- **New module:** do every line, including the "NEW module only" registrations.

### 18.6 Worked example — the POS module (a full-screen, multi-resource module)
POS spans all four layers via the same contracts-first pattern; copy it for any
large module with a full-screen surface, server-side pricing, and a settle/post
flow. Reference **`docs/pos.md`**.
- **shared** (`shared/src/modules/pos/`): `register.dto.ts`, `session.dto.ts`,
  `order.dto.ts`, `table.dto.ts`, `pos.permissions.ts`, `pos-pricing.helpers.ts`,
  and `{registers,sessions,orders,tables}.{service,client}.ts`. Wired into
  `shared/src/core/api.ts` as `api.pos.{registers,sessions,orders,tables}` and
  listed in `shared/src/core/app-modules.ts`.
- **backend** (`backend/src/modules/pos/`): entities
  `pos_registers` / `pos_sessions` / `pos_orders` / `pos_order_lines` /
  `pos_order_line_modifiers` / `pos_payments` / `pos_floors` / `pos_tables`;
  service+controller per registers/sessions/orders/tables; `pos.permissions.ts`;
  registered in `app.module.ts`, `permissions.catalog.ts`, and `audited-entities.ts`.
- **inventory modifiers** (master-data lives in **inventory**, not pos):
  `ProductModifierGroup` / `Option` / `Link` entities +
  `product-modifiers.{service,controller}`; routes `/inventory/modifier-groups`,
  `/inventory/products/:id/modifiers`, `/inventory/modifier-map` (own path, §7.3);
  shared `inventory/product-modifier.*` + `api.inventory.modifiers`; perms
  `inventory.modifiers.read` / `inventory.modifiers.write`.
- **PIN auth**: `User.isPosUser` + `User.posPinHash` (`select:false`, bcrypt);
  endpoints `/auth/pos-login` (`@Public()`, throttled), `/auth/pos-switch`,
  `/auth/pos-pin`; web + mobile auth-context/provider gained `posLogin` / `posSwitch`.
- **POS permission group "POS"**: `pos.registers.read/write`, `pos.sell`,
  `pos.session.open/close`, `pos.discount.line/override`, `pos.price.override`,
  `pos.refund`, `pos.void`, `pos.drawer.open`, `pos.reprint`, `pos.reports`,
  `pos.kitchen.view/bump`, `pos.tables.manage`, `pos.settings`, `pos.users.pin`.
- **Settle posts everything in ONE `manager.transaction`** (stock + finance
  `kasa/banka` + cari), mirroring `invoices.service`; reversal via
  `StockMovementsService.reverseSource(em, 'pos', id)` plus deleting the finance /
  contact transaction ids stored back on `PosPayment`
  (`financeTransactionId` / `contactTransactionId`).
- **Full-screen surface**: the terminal lives under `_pos.tsx` (own chrome), login
  at `/pos/login`, but `home` is the in-shell `/pos/dashboard` (§11).

---

## 19. Adding an AI provider / agent (pluggable)

The AI layer is provider-abstracted; **adding an agent must not touch business
logic.** One entry point `runAi(config, prompt, maxTokens)` in
`backend/src/modules/contacts/ai/ai-provider.ts` dispatches by `config.provider`.

To add a provider (e.g. a new vendor):
1. **shared** — append an entry to `AI_PROVIDERS` in
   `shared/src/modules/contacts/integrations.dto.ts`: `{ value, label, defaultModel,
   defaultBaseUrl, needsApiKey, models: [{value,label}, …] }`, and add its `value`
   to the `AiProvider` union. Rebuild shared. (The web/mobile integration settings
   read `AI_PROVIDERS` automatically — provider + model-variant selects appear with
   no UI change.)
2. **backend** — if the vendor is **OpenAI-compatible** (`/chat/completions`),
   nothing else is needed (the `default` branch handles it via `defaultBaseUrl`).
   If it has a bespoke API, add one branch to the `switch` in `runAi` (see the
   `anthropic` / `gemini` branches) and, if helpful, an env-key fallback in
   `ENV_KEYS`.
3. Test: configure it under Entegrasyonlar (or set its env key), hit
   `POST /api/contacts/integrations/ai/draft-email` and confirm it routes to that
   vendor (a wrong key returns **that vendor's** 4xx, not Anthropic's), and that an
   unconfigured provider returns a graceful **400**.

Never hardcode a vendor URL/model in a service — read it from `AI_PROVIDERS` +
the `ai` integration `config`. Secrets (`apiKey`) are masked on read and preserved
on re-save (see `SECRET_KEYS` + the merge in `IntegrationsService.upsert`).

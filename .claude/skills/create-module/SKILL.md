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

> **Read first:** `AGENTS.md` §3 (API convention), §4 (shared layer), §7 (roles &
> permissions), and `frontend/src/components/components.md`. The **canonical
> reference implementation is the `iam` module** (full CRUD across all layers) and
> `genel` (a nav-only module). Copy their shape.
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
Review the generated SQL. Without this, the new table never gets created (no
`synchronize` fallback). See AGENTS.md §5.1.

---

## 3. Frontend — the UI (`frontend/src/modules/<mod>/`)

```ts
// module.config.ts
import { <Icon> } from 'lucide-react'
import { <Mod>Permissions } from '@turbohesap/shared'
import type { AppModule } from '@/modules/types'
export const <mod>Module: AppModule = {
  key: '<mod>', label: '<Label>', icon: <Icon>, home: '/<mod>/<res>',
  nav: [{ items: [
    { title: '<Res Label>', icon: <Icon>, to: '/<mod>/<res>', permission: <Mod>Permissions.<res>Read },
  ]}],
}
```
- **Page** `pages/<res>-page.tsx`: data via `import { api } from '@/lib/api'` →
  `api.<mod>.<res>.list()/...` (TanStack Query,
  `enabled: hasPermission(<Mod>Permissions.<res>Read)`); wrap the return in
  `<PermissionRequired permission={<Mod>Permissions.<res>Read}>`; gate write buttons
  with `useAuth().hasPermission(<Mod>Permissions.<res>Write)` or `<Can>`; surface
  server errors with `toApiError(e).message`. **Reuse `components.md` primitives**
  (Table, Dialog, Button…). Copy `modules/iam/pages/users-page.tsx`.
- **Route (thin)** `frontend/src/routes/_authed/<mod>/<res>.tsx`:
  ```tsx
  import { createFileRoute } from '@tanstack/react-router'
  import { <Res>Page } from '@/modules/<mod>/pages/<res>-page'
  export const Route = createFileRoute('/_authed/<mod>/<res>')({ component: <Res>Page })
  ```

**Register (1 edit):** `frontend/src/modules/registry.ts` → import `<mod>Module`
and add it to `APP_MODULES`.

Regenerate routes + build: `pnpm --filter @turbohesap/frontend exec vite build`
(the TanStack plugin rewrites `routeTree.gen.ts`), then `pnpm --filter @turbohesap/frontend exec tsc -b`.

---

## 4. Mobile

Nothing module-specific is required: `@turbohesap/mobile` already calls
`createTurbohesapApi`, so `api.<mod>.<res>.*` is available the moment shared is
rebuilt. Add a screen under `mobile/src/...` only if the module needs mobile UI
(use the same `api.<mod>.<res>` calls; gate with the permission list from
`api.auth.permissions()`).

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
Expected: new permissions auto-seeded (boot logs "N yeni izin veritabanına
eklendi"), `201` on create, list returns the row, and a user **without** the
permission gets `403`. The module icon appears in the left rail.

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
| frontend | `src/modules/registry.ts` | `<mod>Module` in `APP_MODULES` |

Miss one and the symptom is: route 404 (app.module), no permissions (catalog),
client undefined (api.ts), module absent from rail (registry/app-modules),
**table missing / query fails (no migration)**.

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

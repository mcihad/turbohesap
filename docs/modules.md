# Modules

TurboHesap is organized into **feature modules**. Each module groups related
resources and is mounted under a stable URL prefix.

## Convention

- **API:** every endpoint is `/api/<module>/<resource>`.
- **Backend:** a module lives at `backend/src/modules/<module>/` as a NestJS
  module (controllers, services, entities, dto), wired into `app.module.ts`. A
  controller is declared `@Controller('<module>/<resource>')`.
- **Contracts:** the module's DTOs, service interface, and axios client live in
  `shared/src/` (`@turbohesap/shared`) so the web and mobile clients call it the
  same way (`api.<resource>.<method>()`).

## Current modules

| Module | Resources / endpoints |
| ------ | --------------------- |
| `auth` | `POST /api/auth/login` · `refresh` · `logout` · `GET /api/auth/me` |
| `iam`  | `/api/iam/users` · `/api/iam/roles` · `/api/iam/permissions` (CRUD, permission-protected) |

System endpoint (not a module): `GET /api/health`.

## Adding a module

1. **Contracts** in `shared/src/`: DTO model(s) in `models/`, a service interface
   in `services/`, an axios client in `clients/`, and register it in
   `createTurbohesapApi()`. Rebuild shared (`make build-shared`).
2. **Backend** in `backend/src/modules/<module>/`: entities, service(s), and a
   controller `@Controller('<module>/<resource>')`. Protect routes with
   `@RequirePermissions('<module>.<resource>.<action>')` and add those keys to
   the permission catalog (`src/modules/iam/iam.constants.ts`) so they seed and
   get granted to `admin`. Import the module in `app.module.ts`.
3. **Frontend/mobile**: call `api.<resource>.<method>()`; gate UI with
   `useAuth().hasPermission(...)`.

## Ports & configuration

The backend listens on **`:5800`** by default. All settings come from the root
**`.env`** (see [`../AGENTS.md`](../AGENTS.md) §9).

# Documentation

Longer-form documentation for KentOS Console lives here. Start with the
top-level guides:

- **[`../AGENTS.md`](../AGENTS.md)** — whole-system architecture: how the shared
  contracts (`@turbohesap/shared`), the React frontend, the NestJS backend, and the
  Expo mobile app fit together, plus build/run/config and conventions.
- **[`../DESIGN.md`](../DESIGN.md)** — the frontend design-system contract:
  tokens, colors, layout, and component standards (paths there are relative to
  `frontend/`).
- **[`modules.md`](./modules.md)** — feature modules: the
  `/api/<module>/<resource>` convention and how to add a module across
  `shared`, the backend, and the clients.
- **[`auth.md`](./auth.md)** — local authentication (username/password → JWT),
  refresh-token rotation, RBAC (users/roles/permissions), and the guards.
- **[`lookups.md`](./lookups.md)** — the generic key/value reference-data system
  (`/api/lookups`) and the reusable **`LookupSelect`** component (web + mobile):
  data model, API, permissions, usage, and recipes.
- **[`pos.md`](./pos.md)** — the point-of-sale module: PIN auth, modifiers,
  registers/sessions/orders, split & multi-tender payments, the settle→stock→
  kasa→cari flow, permissions, and the desktop-client integration guide.

## Planned documents

As the backend grows, this directory will collect:

- API reference (endpoints, request/response shapes).
- Database schema and migrations.
- Deployment / operations notes.

Add new docs as Markdown files in this folder and link them from here.

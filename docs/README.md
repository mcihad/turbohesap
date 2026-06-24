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

## Planned documents

As the backend grows, this directory will collect:

- API reference (endpoints, request/response shapes).
- Database schema and migrations.
- Deployment / operations notes.

Add new docs as Markdown files in this folder and link them from here.

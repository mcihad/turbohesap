# Documentation

Longer-form documentation for KentOS Console lives here. Start with the
top-level guides:

- **[`../AGENTS.md`](../AGENTS.md)** — whole-system architecture: how the
  frontend, the Go backend, and the single-binary embed pipeline fit together,
  plus build/run/config and conventions.
- **[`../DESIGN.md`](../DESIGN.md)** — the frontend design-system contract:
  tokens, colors, layout, and component standards (paths there are relative to
  `frontend/`).
- **[`modules.md`](./modules.md)** — the module manifest (`kentos.module.json`),
  the `/api/v1/<name>/metadata` endpoint, and claiming a module name with the
  `init-module` skill.
- **[`auth.md`](./auth.md)** — Keycloak (OIDC) login: the backend `/api/auth/*`
  flow, frontend token handling/route gating, and the required Keycloak client
  settings.

## Planned documents

As the backend grows, this directory will collect:

- API reference (endpoints, request/response shapes).
- Database schema and migrations.
- Deployment / operations notes.

Add new docs as Markdown files in this folder and link them from here.

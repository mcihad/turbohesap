# Modules

Every app built from this template is a **module**. A module is the NestJS
service plus its identity manifest. This page explains the manifest, the metadata
endpoint, and how to claim a module name.

## The manifest — `kentos.module.json`

The manifest is a **single file** at **`backend/kentos.module.json`**. The NestJS
manifest loader (`src/module/manifest.ts`) reads it from the filesystem at
startup and serves it verbatim from the API. There is no second copy and no sync
step — edit this one file and restart.

```json
{
  "name": "kentos-project-template",
  "displayName": "KentOS Console",
  "description": "…",
  "version": "0.1.0",
  "icon": "layout-dashboard",
  "address": "https://kentos.example.com",
  "roles": ["admin", "user"],
  "api": { "version": "v1" },
  "author": "",
  "tags": ["template"]
}
```

| Field         | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `name`        | Module slug. **Also the Keycloak client ID.** Drives the metadata route. Keep it stable; `^[a-z][a-z0-9-]*$`. |
| `displayName` | Human-readable title.                                                   |
| `description` | One-line summary.                                                       |
| `version`     | Module version.                                                         |
| `icon`        | lucide icon name.                                                       |
| `address`     | **Full public URL** of the module, e.g. `https://kentos.sivas.bel.tr` or `https://sivas.bel.tr/kentos`. |
| `roles`       | Roles the module defines/uses.                                          |
| `api.version` | API version segment used in the metadata route.                         |

Extra fields you add are returned as-is by the metadata endpoint.

## Metadata endpoint

```
GET /api/<api.version>/<name>/metadata
```

Returns the manifest JSON. With the template defaults:

```
GET /api/v1/kentos-project-template/metadata
```

The path is derived from the manifest, so it follows the module name after a
rename.

## Claiming a module name

Use the **`init-module`** skill (in Claude Code: `init module <name>`). It stamps
the manifest `name`, the frontend's `VITE_MODULE_NAME`, and the mobile app's
`EXPO_PUBLIC_MODULE_NAME`, then verifies the workspaces build. Because `name` is
also the Keycloak client ID, choose it deliberately. Afterwards, fill in the
remaining manifest fields (`displayName`, `address`, `roles`, …) by hand.

## Ports & configuration

The backend listens on **`:5800`** by default. All settings come from the root
**`.env`** (see [`../AGENTS.md`](../AGENTS.md) §8) — including `PORT` and
`STATIC_CACHE_MAX_AGE` (the short, ≤1h browser cache for static assets).

# Authentication & Authorization

TurboHesap uses **local authentication**: users live in PostgreSQL with
bcrypt-hashed passwords, and the backend issues **JWTs** (a short-lived access
token + a rotating, revocable refresh token). Authorization is **RBAC**: users
have roles, roles grant permissions.

## Flow

```
Browser/App         Backend (/api/auth)              PostgreSQL
   │  POST /api/auth/login {username,password}            │
   │ ─────────────────►  bcrypt verify ────────────────► users
   │  {accessToken, refreshToken, user} ◄── sign JWTs, store refresh row
   │  store tokens (localStorage / AsyncStorage)          │
   │
   │  Authorization: Bearer <accessToken>  on every call  │
   │  POST /api/auth/refresh {refreshToken}               │
   │ ─────────────────►  verify + rotate ──────────────► refresh_tokens
   │  {accessToken, refreshToken} ◄── revoke old, issue new pair
```

## Backend — `src/modules/auth` + `/api/auth/*`

| Endpoint | Purpose |
| -------- | ------- |
| `POST /api/auth/login {username, password}` | Verify credentials, return tokens + the current user. |
| `POST /api/auth/refresh {refreshToken}` | Rotate: revoke the presented refresh token, return a fresh pair. |
| `POST /api/auth/logout {refreshToken}` | Revoke the refresh token (best effort). |
| `GET /api/auth/me` | The verified caller (identity + roles). |
| `GET /api/auth/permissions` | The caller's effective permission keys (resolved from roles). |

- **Access token** (secret `JWT_ACCESS_SECRET`, TTL `JWT_ACCESS_TTL`) carries
  `sub`, `username`, `roles` — **roles only, not permissions**, so the token stays
  small no matter how many permissions exist. The client fetches its permission
  list separately via `GET /api/auth/permissions` (JWT-authenticated) after login.
- **Refresh token** (secret `JWT_REFRESH_SECRET`, TTL `JWT_REFRESH_TTL`) carries
  only a `jti` that maps to a row in `refresh_tokens`; a token is valid only
  while its row exists, is not revoked, and has not expired. Refresh rotates it.
- Passwords are hashed with bcrypt; the `passwordHash` column is never selected
  into API output.

## Authorization (RBAC)

Model: `User` ↔ `Role` ↔ `Permission` (many-to-many); each role also belongs to a
module. Permission keys follow `<module>.<resource>.<action>` (e.g.
`iam.users.read`, `iam.users.write`). Each module declares its permissions in
`<module>.permissions.ts`, aggregated in `src/permissions.catalog.ts` and
auto-seeded on boot.

### Backend — global guards (enforced server-side)

Two global guards run on every route: `JwtAuthGuard` (auth; opt out with
`@Public()`) then `PermissionsGuard` (authz). To protect a route, **just add the
decorator** — no per-controller `@UseGuards` needed:

```ts
@RequirePermissions('iam.users.write')   // caller must hold ALL listed permissions
@Post()
create(@Body() dto: CreateUserDto) { … }

// the verified principal (roles only; permissions are not in the token):
@Get('me')
me(@CurrentUser() user: AuthUser) { … }   // { sub, username, roles }
```

`PermissionsGuard` resolves the caller's effective permissions **from the DB**
(`AccessService.permissionKeys(userId)`) per request — not from the token. So the
same check that the `GET /api/auth/permissions` endpoint reports is what the guard
enforces, and editing a role's permissions takes effect on the next request.
Missing/expired token → `401`; valid token without the permission → `403`.

### Frontend — `useAuth()`

Tokens + current user are in `localStorage`; the permission list is fetched
separately (`api.auth.permissions()`) right after login/refresh and cached
(`lib/auth/tokens.ts`). `useAuth()` (from `lib/auth/auth-context.ts`) exposes:

```tsx
const { user, permissions, login, logout, refresh,
        hasRole, hasAnyRole, hasAllRoles,
        hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

await login(username, password)            // then permissions are fetched
if (hasPermission('iam.users.write')) { /* show the “new user” button */ }
```

`routes/login.tsx` is a local username/password form; the pathless `_authed`
layout guards app pages; `SessionWatcher` prompts to extend the session ~30s
before the access token expires. Client-side gating (nav/rail filtering, `<Can>`,
`<PermissionRequired>`) is **UX only** — the backend enforces the same keys.

## Seeding

On first boot `SeedService` upserts the permission catalog, the system roles
(`admin` = all permissions, `user` = minimal), and an admin user from
`SEED_ADMIN_*` (default **`admin` / `Admin123!`**). Idempotent — safe on every boot.

## Configuration (`.env`)

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/turbohesap
JWT_ACCESS_SECRET=…            # change in production
JWT_REFRESH_SECRET=…           # change in production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=Admin123!
SEED_ADMIN_EMAIL=admin@turbohesap.local
```

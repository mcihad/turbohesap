# Authentication (Keycloak)

KentOS modules authenticate against **Keycloak** using OIDC **Authorization Code
+ PKCE** with a **confidential client**. The client secret lives only on the
NestJS backend; the browser never sees it. Frontend and backend are same-origin
(one process), so the web `/api/auth/*` calls need no CORS.

The OIDC **client_id is the module name** (`kentos.module.json` "name"), which is
also the **Keycloak client ID**.

## Flow

```
Browser            Backend (/api/auth)             Keycloak
   │  GET /api/auth/login?redirect=/dashboard          │
   │ ─────────────────►  build PKCE+state+nonce        │
   │  303 redirect ◄───  (state stored server-side)    │
   │ ───────────────────────────────────────────────► authorize
   │  login UI + consent, then redirect back           │
   │ ◄─────────────────────────────────────────────── /auth/callback?code&state
   │  POST /api/auth/callback {code,state}             │
   │ ─────────────────►  exchange (secret+verifier) ─► token endpoint
   │  {tokens, redirect} ◄─  verify nonce ◄──────────  tokens
   │  store tokens in localStorage, go to redirect     │
```

Refresh and logout follow the same pattern: the browser calls
`POST /api/auth/refresh` / `POST /api/auth/logout`, and the backend talks to
Keycloak with the secret.

## Backend — `src/auth/*` + `/api/auth/*`

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/auth/login?redirect=…` | 303 to Keycloak; stashes PKCE/state/nonce keyed by `state`. |
| `POST /api/auth/callback {code, state}` | Validate state, exchange code, verify id_token nonce, return tokens + `redirect`. |
| `POST /api/auth/refresh {refreshToken}` | Return a fresh token set. |
| `POST /api/auth/logout {idToken, refreshToken}` | Revoke at Keycloak, return `logoutUrl`. |

`KeycloakService` reads discovery once from
`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration` and
caches it. Keycloak's token response is snake_case and parsed by a private
`KeycloakTokens` type; **our API output is camelCase** (mapped through the
`AuthTokens` DTO from `@kentos/shared`). The DTOs themselves live in
`@kentos/shared`, so the web and mobile clients consume the exact same shapes.

## Frontend — `src/lib/auth/*`

- **Storage:** tokens live in `localStorage` (`tokens.ts`). Roles come from the
  **access token** (`realm_access` + this client's `resource_access`); identity
  from the lightweight **id token**.
- **State:** `AuthProvider` / `useAuth` (`auth-provider.tsx` / `auth-context.ts`).
- **Routing:** `__root` provides auth context only; the pathless **`_authed`**
  layout guards every app page and renders the shell + `SessionWatcher`. `/login`
  and `/auth/callback` render bare. `/` → `/dashboard` when authenticated; the
  guard sends unauthenticated users to `/login`.
- **Session watcher** (`session-watcher.tsx`): ~30s before the access token
  expires it shows a sticky toast with an **"Oturumu uzat"** button that
  refreshes; if ignored until expiry the session is dropped and the user returns
  to `/login`.
- **Profile page** (`/profile`, `routes/_authed/profile.tsx`): shows the id-token
  identity claims, realm + client roles (grouped, current module flagged), and
  the id/access/refresh tokens (masked, copyable, with decoded claims). Helpers:
  `realmRolesOf` / `clientRolesOf` / `currentClientId` in `tokens.ts`.

## Authorization (roles)

Roles come from the access token: **realm roles** (`realm_access.roles`) plus
**this module's client roles** (`resource_access[<module-name>].roles`). The
module name is the Keycloak client id, so client roles are scoped to the module.

### Backend — `KeycloakAuthGuard` + `@Roles()`

`KeycloakAuthGuard` (`src/common/keycloak-auth.guard.ts`) requires a valid access
token (Bearer header), **verified against Keycloak's JWKS** (jose — signature,
issuer, expiry), and, when `@Roles(...)` is present, that the caller has at least
one of them. With no `@Roles()` it just requires a valid token.

```ts
// any valid token:
@UseGuards(KeycloakAuthGuard)
@Get('me')
me(@CurrentUser() user: Claims) { … }

// at least one of these roles:
@UseGuards(KeycloakAuthGuard)
@Roles('Manager', 'Admin')
@Get('reports')
reports() { … }
```

The verified claims are stashed on the request and read with `@CurrentUser()`.
`GET /api/me` is a working example. Forged/expired/missing tokens → `401`; valid
token without the role → `403`.

### Frontend — `hasAnyRole` / `<RolesRequired>`

Same semantics, two styles (use whichever fits):

```tsx
// imperative
const { hasAnyRole, hasAllRoles } = useAuth()
if (hasAnyRole(['Manager', 'Admin'])) { /* … */ }

// declarative (show/hide UI)
<RolesRequired anyOf={['Manager', 'Admin']} fallback={null}>
  <Button>Raporu sil</Button>
</RolesRequired>
<RolesRequired allOf={['Manager', 'User']}>…</RolesRequired>
```

`anyOf` and `allOf` combine with AND. A live demo is on the **/components** page.
Note: client-side gating is **UX only** — always enforce with
`KeycloakAuthGuard` + `@Roles()` on the backend route too.

## Configuration (`.env`)

```
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sivasbeltr
KEYCLOAK_CLIENT_SECRET=        # confidential client secret (backend only)
# KEYCLOAK_REDIRECT_URI=       # optional; else <request-base>/auth/callback
```

## Keycloak client setup (realm `sivasbeltr`)

Create a client whose **Client ID = the module name**:

- **Client authentication: ON** (confidential) → put the secret in `KEYCLOAK_CLIENT_SECRET`.
- **Standard flow** enabled.
- **Valid redirect URIs:** `http://localhost:5800/auth/callback` (+ your prod `address` + `/auth/callback`).
- **Valid post-logout redirect URIs:** `http://localhost:5800/login` (+ prod).
- **Web origins:** the app origin (e.g. `http://localhost:5800`).

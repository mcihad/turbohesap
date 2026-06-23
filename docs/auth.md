# Authentication (Keycloak)

KentOS modules authenticate against **Keycloak** using OIDC **Authorization Code
+ PKCE** with a **confidential client**. The client secret lives only on the Go
backend; the browser never sees it. Frontend and backend are same-origin (one
binary), so the `/api/auth/*` calls need no CORS.

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

## Backend — `internal/auth` + `/api/auth/*`

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/auth/login?redirect=…` | 303 to Keycloak; stashes PKCE/state/nonce keyed by `state`. |
| `POST /api/auth/callback {code, state}` | Validate state, exchange code, verify id_token nonce, return tokens + `redirect`. |
| `POST /api/auth/refresh {refreshToken}` | Return a fresh token set. |
| `POST /api/auth/logout {idToken, refreshToken}` | Revoke at Keycloak, return `logoutUrl`. |

Discovery is read once from
`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration` and
cached. Keycloak's token response is snake_case and parsed by a private struct;
**our API output is camelCase** (mapped through a DTO).

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

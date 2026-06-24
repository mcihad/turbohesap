# @kentos/mobile

The KentOS mobile app — **Expo** (React Native) — built on the same
**`@kentos/shared`** contract layer as the web frontend. Models, service
interfaces, and the axios client implementations are identical; only the
platform wiring differs (an absolute API base URL and AsyncStorage-backed
tokens, see `src/lib/api.ts`).

## Run

```bash
pnpm install                       # from the repo root (installs all workspaces)
pnpm --filter @kentos/shared build # mobile imports the compiled contracts
cp mobile/.env.example mobile/.env # then set EXPO_PUBLIC_API_BASE_URL
pnpm --filter @kentos/mobile start # Expo dev server (press a / i / w)
```

> Rebuild `@kentos/shared` (or run `make dev-shared`) whenever you change the
> contracts — Metro consumes its compiled `dist`.

## Configuration

Expo only exposes `EXPO_PUBLIC_`-prefixed variables to the app. Set them in
`mobile/.env`:

| Variable                   | Purpose                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base. On a device use the machine's LAN IP, e.g. `http://192.168.1.20:5800/api` — `localhost` is the phone itself. |
| `EXPO_PUBLIC_MODULE_NAME`  | Module name (`kentos.module.json` "name") used for the metadata path. |

## Auth note

`api.auth.loginUrl()` opens the backend-mediated Keycloak flow in the system
browser. Completing it on mobile needs a deep link back into the app (the
`kentos://` scheme is already declared in `app.json`); wire
`expo-auth-session` / `Linking` to capture the `code`/`state` and call
`api.auth.exchangeCode(...)`, then persist the tokens via `src/lib/tokens.ts`.
The demo screen only kicks off the redirect.

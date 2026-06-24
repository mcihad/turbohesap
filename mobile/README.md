# @turbohesap/mobile

The TurboHesap mobile app — **Expo** (React Native) — built on the same
**`@turbohesap/shared`** contract layer as the web frontend. Models, service
interfaces, and the axios client implementations are identical; only the
platform wiring differs (an absolute API base URL and AsyncStorage-backed
tokens, see `src/lib/api.ts`).

## Run

```bash
pnpm install                       # from the repo root (installs all workspaces)
pnpm --filter @turbohesap/shared build # mobile imports the compiled contracts
cp mobile/.env.example mobile/.env # then set EXPO_PUBLIC_API_BASE_URL
pnpm --filter @turbohesap/mobile start # Expo dev server (press a / i / w)
```

> Rebuild `@turbohesap/shared` (or run `make dev-shared`) whenever you change the
> contracts — Metro consumes its compiled `dist`.

## Configuration

Expo only exposes `EXPO_PUBLIC_`-prefixed variables to the app. Set them in
`mobile/.env`:

| Variable                   | Purpose                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base. On a device use the machine's LAN IP, e.g. `http://192.168.1.20:5800/api` — `localhost` is the phone itself. |

## Auth note

Login is **local** (username/password): `api.auth.login(username, password)`
returns the tokens + user; persist the tokens via `src/lib/tokens.ts`
(AsyncStorage). The demo screen (`App.tsx`) signs in and shows the current user.

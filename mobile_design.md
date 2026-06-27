# MOBILE DESIGN SYSTEM — TurboHesap

> This document is the **single source of truth** for the **mobile** app
> (`@turbohesap/mobile`, Expo / React Native). It is the RN counterpart of the
> web **`DESIGN.md`**: where DESIGN.md governs the Vite/Tailwind SPA, this file
> governs the native app. The two share the **same data contracts**
> (`@turbohesap/shared`), the **same permission keys**, and the **same visual
> language** (violet brand, OKLCH-derived palette, 4px grid, 10px radius) — but
> the mobile app is built mobile-first with native primitives, a bottom-tab
> shell, and touch-sized controls.
>
> Golden rule (identical to web): **never hardcode a colour/space/radius/size in
> a screen.** Pull colours from the active theme (`useTheme()`), and spacing /
> radius / type from the token scales. If you type `#fff`, `16`, or
> `borderRadius: 10` inline, stop — there is a token for it.

> **📁 Where this lives.** `mobile/` in the pnpm monorepo. Unless noted, every
> path below is **relative to `mobile/`** (e.g. `src/theme/tokens.ts` →
> `mobile/src/theme/tokens.ts`). See **`AGENTS.md`** for the whole-system
> architecture and **`DESIGN.md`** for the web design system.

---

## 1. Stack & Conventions

| Concern        | Choice                                                            |
| -------------- | ---------------------------------------------------------------- |
| Runtime        | Expo SDK 56 · React Native 0.85 · React 19                       |
| Language       | TypeScript (strict)                                              |
| Styling        | RN `StyleSheet`/inline styles driven by **TS design tokens**     |
| Icons          | `@expo/vector-icons` → **Feather** (the family lucide forks)     |
| Safe area      | `react-native-safe-area-context`                                |
| Storage        | `@react-native-async-storage/async-storage`                     |
| Navigation     | **custom** tab + stack (no react-navigation/expo-router) — `src/navigation` |
| Data           | `useAsync` hook (`src/lib/use-async.ts`) — no TanStack Query      |
| API            | `@turbohesap/shared` via `src/lib/api.ts` (absolute baseUrl)     |

### Why no navigation library
The app deliberately avoids `react-navigation`/`expo-router` and their native
modules (`react-native-screens`, `react-native-gesture-handler`). In the
pnpm + Expo Go setup this keeps the dependency surface tiny and the app robust.
The `src/navigation` folder implements a small, predictable **tab + per-tab
stack** model instead (Section 6). If the app later needs deep-linking or shared
element transitions, swap this layer for expo-router — nothing else needs to
change because screens only depend on the `useNav()` contract.

### Code conventions
- **Mobile-first, touch-first.** Minimum tap target **44×44**; primary buttons
  are `h-44`+, list rows are `≥56` tall. Test at the smallest phone (~360pt).
- **One component, one file** under `src/components`; re-export from
  `src/components/index.ts`. Reuse before building — check the catalog (Section
  5) first.
- **Tokens over literals.** `t.spacing[4]`, `t.radius.lg`, `t.colors.primary`,
  `t.elevation('md')` — never `16`, `10`, `'#6D34D6'`, raw shadow objects.
- **Text only via `<Text>`** (`src/components/Text.tsx`) — never RN's bare
  `Text`, so every label is themed + on the type ramp.
- **Colours come from `useTheme().colors`** — light & dark are both first-class;
  a screen written against tokens is automatically correct in both.

---

## 2. File Map

```
mobile/
├─ App.tsx                       ← providers: SafeArea → Theme → Auth → RootNavigator
├─ index.ts                      ← registerRootComponent(App)
├─ app.json                      ← Expo config (name "TurboHesap")
├─ .env.example                  ← EXPO_PUBLIC_API_BASE_URL
└─ src/
   ├─ theme/
   │  ├─ tokens.ts               ← TOKEN SOURCE OF TRUTH (palette, spacing, radius, type, elevation)
   │  └─ theme-context.tsx       ← ThemeProvider, useTheme(), useThemeControls() (mode + persist)
   ├─ lib/
   │  ├─ api.ts                  ← createTurbohesapApi (absolute baseUrl + AsyncStorage token)
   │  ├─ tokens.ts               ← session storage (tokens/user/permissions) + JWT + initials/displayName
   │  ├─ use-async.ts            ← data-fetching hook (loading/error/refetch/enabled)
   │  ├─ datetime.ts             ← formatRelative / formatDateTime (tr)
   │  └─ auth/
   │     ├─ auth-context.tsx     ← AuthState + useAuth() (same surface as web)
   │     ├─ auth-provider.tsx    ← login/logout/refresh + permission fetch + persistence
   │     ├─ access.ts            ← permission-driven module/nav filtering
   │     └─ can.tsx              ← <Can> + usePermitted() (inline gate)
   ├─ components/                ← UI PRIMITIVES (Section 5) + index.ts barrel
   ├─ navigation/
   │  ├─ nav-context.tsx         ← tab + per-tab stack state, useNav()
   │  ├─ RootNavigator.tsx       ← splash / login / shell switch
   │  ├─ AppShell.tsx            ← accessible tabs + active screen + TabBar + Android back
   │  ├─ TabBar.tsx              ← bottom navigation
   │  ├─ ModuleHome.tsx          ← generic module landing (permission-filtered nav list)
   │  └─ screens.tsx             ← SCREEN REGISTRY (key → component)
   ├─ modules/
   │  ├─ types.ts                ← MobileModule / MobileNavItem
   │  ├─ registry.ts             ← APP_MODULES (genel, iam) + visibleModules(can)
   │  ├─ genel/                  ← DashboardScreen, AnalyticsScreen
   │  └─ iam/                    ← Users / UserDetail / Roles / Permissions / Audit / Errors
   └─ screens/
      ├─ LoginScreen.tsx
      └─ ProfileScreen.tsx
```

---

## 3. The Token System (`src/theme/tokens.ts`)

Tokens are plain TS — React Native can't read CSS variables or `oklch()`. The
web's OKLCH semantic palette is **translated to hex/rgba** here; everything else
(scales, ramps) mirrors DESIGN.md §3.

### 3.1 Colour — semantic contract (`ColorTokens`)
Components reference **only** these names, never raw colours. Each surface has a
paired `*Foreground`. Two palettes (`palettes.light` / `palettes.dark`) are
selected by the theme engine.

| Token | Role | Light | Dark |
| ----- | ---- | ----- | ---- |
| `background` / `foreground` | app canvas / default text | `#FBFBFD` / `#1E1E29` | `#15151C` / `#ECECEF` |
| `card` / `cardForeground` | raised panels | `#FFFFFF` | `#1E1E27` |
| `surface` | tiles/inputs at rest (distinct from card) | `#F5F5F8` | `#24242E` |
| `primary` / `primaryForeground` | brand actions | `#6D34D6` / `#FFFFFF` | `#9D6CF2` / `#16101F` |
| `primarySoft` | tinted fill behind primary content | `#EFE9FC` | `#2A2240` |
| `secondary` / `…Foreground` | secondary buttons | `#F1F1F5` | `#2A2A35` |
| `muted` / `mutedForeground` | subtle surface / meta text | `#F4F4F7` / `#6E6E7E` | `#24242E` / `#9E9EAE` |
| `accent` / `accentForeground` | hover/active tints | `#EFE9FC` / `#5A27C2` | `#2E2640` / `#C9B6F5` |
| `destructive` / `success` / `warning` / `info` (+ `*Foreground`) | status | `#E0454A` · `#1A9E6B` · `#D9962B` · `#2E74E6` | `#F0565B` · `#34D399` · `#FBBF40` · `#5B9BFF` |
| `border` / `inputBorder` | hairlines / field borders | `#E8E8EF` / `#DEDEE7` | `rgba(255,255,255,.10)` / `…16` |
| `ring` | focus / active accent | = primary | = primary |
| `overlay` | modal backdrop | `rgba(20,20,30,.45)` | `rgba(0,0,0,.6)` |

> To re-tint the brand, change `primary` / `primarySoft` / `accent` / `ring` in
> **both** palettes — same idea as the web colour presets (DESIGN.md §4.3).

### 3.2 Spacing — 4px grid (`spacing`)
`spacing[n]` = 4·n (with half-steps `.5`, `1.5`, `2.5`, `3.5`). Prefer
`1·4 · 1.5·6 · 2·8 · 2.5·10 · 3·12 · 4·16 · 5·20 · 6·24 · 8·32`. Standard page
gutter = `spacing[4]` (16). Use these, never raw numbers.

### 3.3 Radius (`radius`)
Base 10 (DESIGN.md §3.3): `xs 4 · sm 6 · md 8 · lg 10 · xl 14 · 2xl 18 · 3xl 24 ·
full 999`. Conventions: inputs/buttons `md`; cards/sheets `xl`; brand mark
`2xl`; avatars/pills/badges `full` (badges use `sm`).

### 3.4 Type ramp (`type`)
Sizes (px): `2xs 11 · xs 12 · sm 13 · base 15 · lg 17 · xl 20 · 2xl 24 · 3xl 30 ·
4xl 36`. Leading `tight 1.2 / normal 1.45 / relaxed 1.6`. Weights `400/500/600/
700`. **Always go through `<Text variant=…>`** (Section 5) — don't size text by
hand.

### 3.5 Elevation (`elevation(level, scheme)`)
Returns an RN shadow fragment by role: `sm` (cards), `md` (raised buttons,
brand mark, floating), `lg`/`xl` (sheets/modals). Bound to the scheme via the
theme so dark elevations read correctly. Use `t.elevation('sm')` — never inline
`shadowColor/shadowRadius`.

### 3.6 Motion (`duration`)
`fast 120 · normal 200 · slow 320` (ms), mirroring DESIGN.md §3.6.

---

## 4. Theme Engine (`src/theme/theme-context.tsx`)

The RN counterpart of DESIGN.md §5. A `ThemeProvider` resolves the active scheme
and exposes the token bundle.

- **Mode:** `'light' | 'dark' | 'system'`. `system` follows
  `Appearance` (OS) live.
- **Persistence:** the chosen mode is saved under AsyncStorage key
  `turbohesap-theme-mode` and restored on launch.
- **`useTheme(): Theme`** → `{ scheme, colors, spacing, radius, type, duration,
  elevation }`. This is what every component consumes.
- **`useThemeControls()`** → `{ theme, mode, setMode, toggle }` for the profile
  screen's theme picker and the header light/dark toggle.

```ts
const t = useTheme()
<View style={{ backgroundColor: t.colors.card, padding: t.spacing[4], borderRadius: t.radius.xl }} />
```

---

## 5. Component Catalog (`src/components/*`)

Import from the barrel: `import { Button, Card, Screen } from '../components'`.
Every primitive is token-driven and theme-aware.

| Component | Role |
| --------- | ---- |
| **`Text`** | The one typography primitive. `variant`: display/h1/h2/title/body/label/caption/overline/mono. `tone`: default/muted/primary/destructive/success/warning/onPrimary. Optional `weight`. |
| **`Icon`** | Feather wrapper. `name` is type-checked against the Feather glyph map; defaults size 20, colour = foreground. |
| **`Button`** | Variants `default`(primary)/`secondary`/`outline`/`ghost`/`destructive`; sizes `sm`(36)/`default`(44)/`lg`(52). `icon`, `loading`, `fullWidth`. |
| **`Card`** | Raised surface: `rounded-xl border bg-card` + `sm` shadow. `padded`, `elevation`. |
| **`Badge`** | Status pill. Tones default/primary/success/warning/info/destructive/muted; `solid` for emphasis. `withAlpha()` helper for tinted fills. |
| **`Avatar`** | Initials in a tinted circle. `size`, `tone`. |
| **`Input`** | Labelled field (48 tall) with optional leading `icon`, `password` reveal toggle, `error`. Focus lifts border to `ring`. |
| **`ListRow`** + **`Divider`** | Standard tappable row: leading icon-chip / `leading` node, title + subtitle, `trailing`, auto chevron when `onPress`. |
| **`ListCard`** (`Section.tsx`) | Wraps rows in one card with hairline dividers. |
| **`Section`** | Overline title (+ optional action) over content. |
| **`Screen`** | Page shell: themed bg, safe-area, pinned `header`, scroll body with page gutter + pull-to-refresh, optional sticky `footer`. The PageWrapper analogue. |
| **`Header`** + **`HeaderAction`** | Screen top bar: back affordance, title (+ subtitle, `large`), right actions slot. |
| **`StatCard`** | Dashboard metric tile: icon chip, big value, label, optional delta badge. |
| **`EmptyState`** | Centred icon + message + optional action — empty lists, errors, the no-permission page. |
| **`SegmentedControl`** | Pill switch (single select) — used for the theme mode picker. |
| **`Skeleton`** / **`SkeletonRows`** | Pulsing loading placeholders. |
| **`PermissionRequired`** | Page-level permission guard → "Yetkiniz yok" screen (Section 7). |

### Universal standards (every primitive)
- Pressables dim on press (`opacity`/background) and expose `hitSlop` where
  small. Disabled = `opacity 0.5` + no press.
- Touch targets ≥ 44. Rows ≥ 56. Icons 16 in buttons, 20 standalone, 22 in tabs.
- Borders are 1px hairlines using `colors.border` / `colors.inputBorder`.

---

## 6. Navigation (`src/navigation/*`)

A **two-level** model: a **home launcher** of modules, and — once you enter a
module — a **per-module bottom tab bar** of that module's Panel (dashboard) +
resources. This mirrors the web's app-launcher → module section → page flow.

```
RootNavigator                        // splash | LoginScreen | AppShell  (by auth status)
└─ AppShell                          // ModuleNavProvider: tracks the active module
   ├─ activeModuleKey == null   →  HomeScreen          // launcher: module grid/list + search
   ├─ activeModuleKey == PROFILE → ProfileScreen        // standalone, with a module-switcher
   └─ a module key             →  ModuleShell(moduleKey)
        └─ NavigationProvider (keyed by module)         // per-tab stacks (useNav)
           ├─ <active screen>        // renderScreen(nav.current.key)
           └─ TabBar                 // Panel + resources, ≤5 slots + "…" overflow sheet
```

- **`module-nav-context.tsx`** (`useModuleNav`) holds `activeModuleKey`, the
  permission-filtered `modules`, and `enterModule(key | null)`. `null` = the home
  launcher, `PROFILE_KEY` = profile, else a module key.
- **`HomeScreen`** — the launcher (app root after sign-in): a **module search**, a
  **grid/list toggle**, and the accessible modules as tiles (+ a Profil tile and a
  header avatar). Tapping a module `enterModule(key)`s into it. Modules are
  permission-filtered (`visibleModules`), the same gate as the web rail.
- **Inside a module** the bottom **`TabBar`** shows `Panel` + the module's
  permission-filtered resources. At most **5 slots**; if there are more, the last
  is a **"Diğer" (…)** button that opens a sheet with the overflow tabs.
- **Module dashboard (Panel tab):** the generic **`ModuleDashboardScreen`** (a hero
  + quick-link cards that `switchTab` to a resource) — unless the module sets
  `dashboardScreen` for its own (e.g. `genel` → the rich `DashboardScreen`). Its
  app bar has a **left module-switcher icon** (like the web sidebar brand button)
  opening **`ModuleSwitcher`** → jump to any module / Home / Profil.
- **`nav-context.tsx`** is unchanged: per-tab stacks. `useNav()` exposes `current`,
  `canGoBack`, `navigate`, `goBack`, `switchTab` (re-tap = pop to root), `setTitle`.
  Resource list screens are tab roots (`onBack` hidden via `nav.canGoBack`, `large`
  title); pushing a detail/form shows a back button.
- **Android back:** pop the stack → else go to the `Panel` tab → else fall through.
- **Screen registry (`screens.tsx`)** maps a screen `key` → component; the generic
  `module.dashboard` key → `ModuleDashboardScreen`.

### Adding a module / screen
1. Build the screen(s) under `src/modules/<module>/` (wrap in `PermissionRequired`
   if gated; fetch with `useAsync({ enabled: hasPermission(KEY) })`).
2. Register each `'<module>.<name>': () => <Screen/>` in `navigation/screens.tsx`.
3. Add the module to `modules/registry.ts` with its `items` (each a resource → a
   bottom tab, with a `permission`); optionally set `dashboardScreen` for a custom
   Panel. The launcher + tab bar pick it up automatically.

---

## 7. Auth & Permissions (same system as web)

The mobile app uses the **exact RBAC system** described in `AGENTS.md` §7 — same
keys (`@turbohesap/shared`, e.g. `IamPermissions.usersRead`), same "UX layer,
server is the boundary" rule.

- **`auth-provider.tsx`** mirrors the web provider: `login` stores tokens + user,
  then fetches the permission list **separately** via `GET /api/auth/permissions`
  (the token carries roles only). On launch a stored-but-expired access token is
  resolved via `refresh`. Everything is persisted in AsyncStorage
  (`turbohesap-auth` / `-user` / `-permissions`).
- **`useAuth()`** exposes the same surface as web: `hasPermission`,
  `hasAnyPermission`, `hasAllPermissions`, `hasRole`, `hasAnyRole`,
  `hasAllRoles`, plus `user`, `roles`, `permissions`, `login`, `logout`,
  `refresh`, `status`.
- **Gating (UX only):**
  - **Navigation** — `access.ts` filters module nav items and hides modules with
    nothing visible, so the **TabBar and module home only show permitted
    destinations** (= the web rail/sidebar behaviour).
  - **Inline** — `<Can permission="…">…</Can>` (`can.tsx`) renders children only
    when permitted.
  - **Page guard** — `<PermissionRequired permission="…">` shows a friendly
    "Yetkiniz yok" screen for deep links the user can't access.
  - **Queries** — gate fetches with `useAsync(fn, deps, { enabled:
    hasPermission(KEY) })` so no request fires without access.
- **Always mirror the same key on the server route** (`@RequirePermissions`). The
  backend re-checks every protected endpoint, so a tampered client still gets
  `403`. Visibility here is presentation only.

---

## 8. Screens (current)

Full **CRUD parity with the web**: lists have a write-gated **"+"** header action,
detail screens an **edit** action + a **delete** (confirmed), and create/edit run
through full-screen **form screens** (`*.form`, gated by the matching `*.write`).

| Tab | Screen (key) | Permission | Notes |
| --- | ------------ | ---------- | ----- |
| Genel | `genel.dashboard` | — | greeting, live health pill, stat cards, quick links, theme toggle |
| Genel | `genel.analytics` | — | illustrative metrics + View-based bar/`distribution` charts |
| Satış | `sales.channels` (root) / `.detail` / `.form` | `sales.channels.read` / `.write` | channels list → full detail; create/edit form (genel/iletişim/adres) |
| Organizasyon | `org.branches` (root) / `.detail` / `.form` | `org.branches.read` / `.write` | branches list → full detail; form (genel/iletişim/adres/yetkili/vergi) |
| Listeler | `lookups.lists` (root) / `lookups.list` / `lookups.item.form` | `lookups.read` / `.write` | lists overview (groups+counts) → a list's items → item form (new list / new item / edit) |
| Envanter | `inventory.products` / `.detail` / `.form` | `inventory.products.read` / `.write` / `.delete` | products list → detail → form (CategoryPicker + unit LookupSelect + prices); delete gated by the separate `.delete` perm |
| Envanter | `inventory.categories` / `inventory.category.detail` / `.form` / `.field` | `inventory.categories.read` / `.write` | category **tree** (indented list) → detail (info + custom field list) → core-fields form + per-field form (type-specific config) |
| Yönetim | `iam.home` | (any iam read) | module landing — filtered nav list |
| Yönetim | `iam.users` / `.detail` / `.form` | `iam.users.read` / `.write` | list → detail (roles **tap → role detail**, authorized branches, meta) → edit/delete; form with role + **branch** checklists |
| Yönetim | `iam.roles` / `.detail` / `.form` | `iam.roles.read` / `.write` | list → detail (permissions grouped by module + users with role) → edit/delete; form with module select + permission checklist |
| Yönetim | `iam.permissions` / `.detail` | `iam.permissions.read` | catalog grouped by `group`; detail → roles that grant it |
| Yönetim | `iam.audit` / `.detail` | `iam.audit.read` | paged entries → **detail with full field-level diff** (old → new) |
| Yönetim | `iam.errors` / `.detail` | `iam.errors.read` (+`.write`/`.delete`) | paged list → detail (message, stack trace, triage status change, delete) |
| Profil | `profile` | (signed-in) | identity, roles, effective permissions, theme mode, sign-out |

> Single-resource modules (Satış, Organizasyon) open their tab **directly on the
> list** (the list is the tab root; the back arrow is hidden via `nav.canGoBack`).
> Multi-resource modules (Yönetim) root at a `ModuleHome` nav list.

> The web-only **`components`** gallery module is intentionally not mirrored on
> mobile.

### 8.1 Forms & mutations
- **Form kit** (`src/components/form.tsx`): `FormTextArea`, `FormSwitchRow`,
  `FormSelect` (modal picker), `Checklist` (searchable multi-select); single-line
  fields reuse `<Input label=… />`; read-only detail uses `Field`/`FieldGrid`
  (`Detail.tsx`).
- **`LookupSelect`** (`src/components/LookupSelect.tsx`) — a reusable, data-aware
  picker bound to a named lookup list (`lookups` module): give it a `list` (e.g.
  `"birim"`) and it auto-fetches the items, stores the chosen item's `key`, and —
  with `lookups.write` — offers an inline **"+ Yeni ekle"** in the modal to create
  a value on the spot. The RN twin of the web `LookupSelect`; use it in any form
  that needs a managed key/value choice.
- **`useSubmit()`** (`src/lib/use-submit.ts`) wraps a create/update/delete call
  with a busy flag and surfaces failures via a native `Alert` (shared `ApiError`
  message); `confirmDestructive()` is the delete confirm dialog. There is **no
  client-side cache to invalidate** — on success the form `goBack()`s and the
  list/detail screen **remounts on return** (see §6) and refetches.

---

## 9. Build, run, develop

From the root **`Makefile`**:

| Command | What it does |
| ------- | ------------ |
| `make dev-mobile` | Start the Expo dev server (Metro) |
| `make mobile-ios` | Open in the iOS simulator |
| `make mobile-android` | Open on Android |
| `make mobile-typecheck` | `tsc --noEmit` for the mobile workspace |

Config: `mobile/.env` (copy from `.env.example`), `EXPO_PUBLIC_API_BASE_URL`.
On a real device, `localhost` is the phone — point it at your machine's LAN
address (e.g. `http://192.168.1.20:5800/api`). Metro is monorepo-aware
(`metro.config.js`) and resolves `@turbohesap/shared` from the workspace.

### Acceptance checks
- [ ] Login works against the running backend; session survives relaunch; expired
      access token auto-refreshes on launch.
- [ ] TabBar shows only modules the user has permission for; an admin sees Genel
      + Yönetim + Profil.
- [ ] A user lacking `iam.*` sees only Genel + Profil; deep-navigating to a gated
      screen shows "Yetkiniz yok".
- [ ] Light/dark/system all correct; toggle persists across relaunch.
- [ ] Pull-to-refresh on lists; Android hardware back pops the stack.
- [ ] `make mobile-typecheck` passes clean.

---

## 10. Do / Don't

**Do**
- Read colours from `useTheme().colors`; spacing/radius/type from the scales.
- Put every label in `<Text variant=…>`; every icon in `<Icon name=…>`.
- Gate UI with the **same permission keys** as the backend route.
- Reuse catalog primitives; add new ones to `components/index.ts` + this doc.

**Don't**
- Hardcode hex/px/raw radii/shadows in screens.
- Use RN's bare `Text`/`View` colours instead of tokens.
- Rely on client-side permission checks for security (server enforces).
- Add a heavy navigation/native dependency without a clear need (Section 1).

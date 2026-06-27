# Lookups — generic key/value reference lists + `LookupSelect`

The **lookups** module is a generic, app-wide **reference-data** system: named
lists (e.g. `birim`/unit, `renk`/colour) of **key/value** items that you manage in
one place and select anywhere via the reusable **`LookupSelect`** component. It is
the same idea as a database "option set" / "enum table", but fully user-managed at
runtime — no code change to add a new value.

- **Contracts:** `@turbohesap/shared` → `shared/src/modules/lookups/`
- **Backend:** `backend/src/modules/lookups/` → `/api/lookups/*`
- **Web component:** `frontend/src/components/lookup-select.tsx` (`LookupSelect`)
- **Mobile component:** `mobile/src/components/LookupSelect.tsx` (`LookupSelect`)
- **Management UI:** Web `/lookups/items` (module **Tanım Listeleri**); Mobile the
  **Listeler** tab.

---

## 1. Data model

One row = one item in a named list:

| Field | Meaning |
| ----- | ------- |
| `id` | uuid |
| `list` | the list/group name, free text (e.g. `"birim"`) — items are grouped by this |
| `key` | stable code, **unique within the list** (e.g. `"KG"`) — this is what callers store |
| `value` | display label (e.g. `"Kilogram"`) |
| `sortOrder` | ascending order within the list |
| `isActive` | inactive items are hidden from pickers (but kept for history) |

A "list" exists as long as ≥1 item carries that `list` name — creating an item
with a new `list` value creates the list.

> **Key vs value (important):** a selection stores the **`key`** (e.g. `"KG"`) and
> displays the **`value`** (e.g. `"Kilogram"`). Bind your form field to the key.

### Key derivation
On create, if `key` is omitted the backend derives a Turkish-aware **slug** from
`value` (uppercase ASCII): `"Açık Yeşil"` → `ACIK_YESIL`. Collisions within the
same list are auto-suffixed (`TON`, `TON_2`, …), so the inline quick-add from a
select never fails.

---

## 2. API (`/api/lookups`)

| Method & path | Permission | Purpose |
| ------------- | ---------- | ------- |
| `GET /api/lookups/items?list=birim` | `lookups.read` | items of a list (sorted) — omit `list` for **all** items (management) |
| `GET /api/lookups/lists` | `lookups.read` | distinct lists with counts (`{ list, count }[]`) |
| `GET /api/lookups/items/:id` | `lookups.read` | one item |
| `POST /api/lookups/items` | `lookups.write` | create `{ list, value, key?, sortOrder?, isActive? }` |
| `PATCH /api/lookups/items/:id` | `lookups.write` | update (any field, incl. moving `list`) |
| `DELETE /api/lookups/items/:id` | `lookups.write` | delete |

All access via `@turbohesap/shared`:

```ts
api.lookups.list('birim')   // LookupItemDto[]
api.lookups.lists()         // LookupListInfo[]
api.lookups.create({ list: 'birim', value: 'Ton' })
api.lookups.update(id, { value: 'Tonne', isActive: false })
api.lookups.remove(id)
```

## 3. Permissions

| Key | Grants |
| --- | ------ |
| `lookups.read` | see/select lookup values (needed by `LookupSelect` **and** any form using it) |
| `lookups.write` | add/edit/delete items — the inline "+" on the select, and the management CRUD |

Both are typed constants: `LookupsPermissions.read` / `.write`
(`@turbohesap/shared`). The backend enforces them (global `PermissionsGuard`); the
clients mirror the same keys for UX. **Any form that embeds a `LookupSelect`
requires the user to hold `lookups.read`** (the select fetches the list); assign it
to the relevant roles via `/iam/roles` (admin has it automatically).

A default **`birim`** list (Adet, Kilogram, Gram, Litre, Metre, Metrekare, Paket,
Kutu) is seeded on first boot so the feature is usable out of the box (idempotent).

---

## 4. `LookupSelect` — the reusable component

Bind it to a list; it auto-fetches, lets the user pick (stores the `key`), and —
with `lookups.write` — offers an inline **"+"** to add a value on the spot.

### Web (`frontend/src/components/lookup-select.tsx`)

```tsx
import { LookupSelect } from '@/components/lookup-select'

function ProductForm() {
  const [unit, setUnit] = React.useState<string | null>(null)
  return (
    <LookupSelect
      list="birim"              // which list to bind to
      value={unit}              // the selected item's `key` (or null)
      onChange={setUnit}        // receives the chosen `key`
      placeholder="Birim seçin" // optional
      allowCreate                // optional, default true — show the inline "+"
    />
  )
}
```

Props: `list` (required), `value` (key | null), `onChange(key)`, `placeholder?`,
`allowCreate?` (default `true`), `disabled?`, `className?`.

Behaviour:
- Fetches `api.lookups.list(list)` (TanStack Query, key `['lookups','items',list]`),
  gated by `lookups.read` — without the permission the select is disabled.
- Shows **active** items (plus the current value even if it was deactivated).
- The **"+"** button (only when `lookups.write`) opens a tiny dialog: type a value
  → `api.lookups.create({ list, value })` → the query is invalidated and the new
  item is auto-selected.

### Mobile (`mobile/src/components/LookupSelect.tsx`)

```tsx
import { LookupSelect } from '../../components'

<LookupSelect list="birim" label="Birim" value={unit} onChange={setUnit} />
```

Same contract; a modal picker with an inline **"+ Yeni ekle"** row (gated by
`lookups.write`). After create it refetches and selects the new item. Forms return
to a list/detail screen which remounts and refetches (no client cache), so values
added inline appear immediately.

---

## 5. Recipes

**Add a new list** — just create its first item:
```ts
await api.lookups.create({ list: 'renk', value: 'Kırmızı' }) // key → KIRMIZI
```
…or use the management UI: **Tanım Listeleri → Yeni liste** (web) / **Listeler →
"+"** (mobile).

**Use a lookup value elsewhere** — store the `key` on your entity (e.g. a product's
`unit = "KG"`). To display it, fetch the list once and map key→value, or just show
the key. (A future enhancement could embed the resolved label in the owning DTO.)

**Reference a lookup list from a category custom field** — the inventory category
field-definition type `lookup` carries a `lookupList` (a list name); the later
dynamic product form renders that field as a `LookupSelect list={lookupList}`.

---

## 6. Extending

- **New permission semantics?** Edit `LookupsPermissions` (shared) +
  `LOOKUPS_PERMISSION_DEFS` (backend) — they auto-seed.
- **New seeded list?** Add to `LookupsService.onApplicationBootstrap()` (idempotent
  per list).
- **Audit:** every lookup item Insert/Update/Delete is recorded automatically
  (`LookupItem` → module `lookups` in `ENTITY_MODULE_MAP`), visible in
  **Yönetim → Denetim Kayıtları**.

> Keep `key` stable once referenced by other data — change `value`/`isActive`
> freely, but renaming a `key` that products (or other rows) store will orphan
> those references.

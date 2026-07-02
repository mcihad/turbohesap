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

---

## 7. Code prefixes — auto-numbering counters (`CodePrefixInput`)

A small, generic **"prefix + running counter"** system for generating codes
like a stok kodu (`ST-0007`, `STK-00042`). Lives alongside lookup items in the
same backend module (`/api/lookups/code-prefixes`), since it's the same kind
of app-wide reference/config data — but it's a separate resource with its own
shared contracts, entity, and web component.

- **Contracts:** `shared/src/modules/lookups/code-prefix.dto.ts` /
  `code-prefixes.service.ts` / `code-prefixes.client.ts`
- **Backend:** `backend/src/modules/lookups/{entities/code-prefix.entity.ts,
  code-prefixes.service.ts, code-prefixes.controller.ts}`
- **Web:** `frontend/src/components/code-prefix/{use-code-prefix.ts,
  code-prefix-input.tsx}` (`useCodePrefix`, `<CodePrefixInput>`)
- **Mobile:** `mobile/src/lib/use-code-prefix.ts` +
  `mobile/src/components/CodePrefixInput.tsx` — same contract and increment-
  timing rules as web, ported to RN (bottom-sheet `Modal` picker mirroring
  `LookupSelect`, no TanStack Query — plain `useAsync`/`useState`)
- **Admin UI:** `/lookups/code-prefixes` (module **Kod Önekleri**)

### `<CodePrefixInput>` UI — prefix and number are two separate segments

The left segment (a button) shows **only the prefix** (e.g. `"ST-"`); the
right segment (a text field) shows **only the numeric remainder** (e.g.
`"0007"`). The prefix text is never duplicated into the number box — this
applies identically whether the field is actively being auto-assigned
(creating a new record) or displaying a locked/existing value (editing one).
For a locked or already-populated value, the component finds the
**longest** configured prefix the value starts with (contexts can have
overlapping prefixes, e.g. `"ST-"` and `"ST-POS-"` — matching the first
instead of the most specific one would misparse `"ST-POS-0001"` as prefix
`"ST-"` + number `"POS-0001"`). If no configured prefix matches at all (e.g.
legacy data predating any prefix), the button shows `"—"` and the full raw
value falls into the number box unsplit — still editable, nothing is lost.

### Data model

One row = one prefix, scoped to a usage `context`:

| Field | Meaning |
| ----- | ------- |
| `context` | usage context (e.g. `"inventory.products"`) — different forms offer different prefix choices. Must be one of the values registered in `CodePrefixContexts` (see below); the DB column itself is a plain string, the registry is what makes it discoverable |
| `prefix` | the literal prefix text, e.g. `"ST-"` |
| `padding` | zero-padding width for the number, e.g. `4` → `"0007"` |
| `nextNumber` | the next number to be issued (not yet consumed) |
| `incrementOnSave` | `false` = consume the moment the prefix is picked ("kaydetmeden artır"); `true` = defer consuming until the parent form actually saves ("kaydettikten sonra artır") |
| `isActive` | inactive prefixes can't be picked or consumed (400) |
| `previewCode` | **computed, never stored** — `prefix` + `nextNumber` zero-padded, for display |

`(context, prefix)` is unique.

### The context registry — how admins discover valid contexts

`context` is just a string column, so without a registry there was no way for
an admin adding a prefix in **Kod Önekleri** to know which context strings
actually mean anything (a typo'd context is a dangling prefix nothing ever
reads). `shared/src/modules/lookups/code-prefix-contexts.ts` is the single
source of truth — a `CodePrefixContexts` const (mirrors the `*Permissions`
convention) plus a label map:

```ts
export const CodePrefixContexts = {
  inventoryProducts: 'inventory.products',
  contactsContacts: 'contacts.contacts',
  invoicesInvoices: 'invoices.invoices',
  ordersDeliveries: 'orders.deliveries',
} as const

export const CODE_PREFIX_CONTEXT_LABELS: Record<CodePrefixContext, string> = {
  [CodePrefixContexts.inventoryProducts]: 'Ürün / Stok kodu',
  [CodePrefixContexts.contactsContacts]: 'Cari kodu',
  [CodePrefixContexts.invoicesInvoices]: 'Fatura no',
  [CodePrefixContexts.ordersDeliveries]: 'İrsaliye no',
}
```

`inventoryProducts` and `contactsContacts` are actually wired into
`<CodePrefixInput>` (product form, contact form — web and mobile).
`invoicesInvoices` and `ordersDeliveries` are registered so admins can
pre-configure prefixes, but are **deliberately not wired into a form** — see
the callout below.

> **Why fatura/irsaliye don't get `<CodePrefixInput>`.** Unlike a stok kodu
> or cari kodu (arbitrary manual codes with no legal shape requirement), the
> invoice number and irsaliye number are a KDV-mevzuatı **gapless sequential
> document number**, assigned by the backend at `issue()`/confirm() time via
> a transaction + `MAX(number)+1` (see `invoices.service.ts issue()`) — there
> is no manual number input field on either form today. Wiring the generic
> `consume()`-on-pick mechanic into that field would either conflict with
> that backend-owned sequence, or — if `incrementOnSave=true` is used to try
> to defer consumption to the issue moment — still risk a permanent gap if a
> draft that already picked/peeked a number is later abandoned. This was a
> deliberate scope decision, not an oversight; revisit only alongside changes
> to the invoice/irsaliye numbering engine itself.

The admin page's "Bağlam" field is a `<Select>` populated from this map (not
free text), so only registered, typo-proof contexts can be picked. **Whenever
you wire `<CodePrefixInput context="...">` into a new form, add the matching
entry here first** — that's what makes it selectable in the admin UI.

### Atomic `consume` — the actual correctness guarantee

```sql
UPDATE lookup_code_prefixes
   SET next_number = next_number + 1, updated_at = now()
 WHERE id = $1
 RETURNING next_number - 1 AS number, prefix, padding
```

A single Postgres statement: the implicit row lock for the duration of that
one `UPDATE` is what makes two concurrent `consume()` calls race-free — no
application-level lock or transaction wrapper needed. **This is a fix, not
just a feature**: every other auto-numbering scheme already in this codebase
(`invoices.service.ts issue()`'s transaction+MAX+1, and the plain
`count()+1` used by production order numbers, contacts `nextCode()`, POS
registers, and fixed assets) is *not* race-free the way this is. Those are
out of scope to migrate here — this section documents the pattern so future
numbering needs can use `consume()` instead of reinventing `count()+1`.

`GET /:id/peek` is the non-mutating counterpart — it formats the *current*
`nextNumber` without advancing it, safe to call repeatedly (e.g. for live
preview while `incrementOnSave=true`).

### `incrementOnSave` — a frontend timing choice, not a backend behavior

The backend never branches on this flag — `consume`/`peek` behave identically
regardless. It only controls **when the web component calls `consume`**:

- `incrementOnSave=false`: `consume` fires immediately when a prefix is
  picked. The code is locked in right away — even if the user abandons the
  form afterward, the number is spent (a deliberate trade: a stable,
  immediately-visible code over a perfectly gap-free sequence).
- `incrementOnSave=true`: picking a prefix only `peek`s (display only);
  `consume` is deferred until the parent form's own save request, via
  `finalize()` (below).

### API

| Method & path | Permission | Purpose |
| ------------- | ---------- | ------- |
| `GET /api/lookups/code-prefixes?context=` | `lookups.codePrefixes.read` | list prefixes, optionally filtered to a context |
| `GET /api/lookups/code-prefixes/:id` | `lookups.codePrefixes.read` | one prefix |
| `GET /api/lookups/code-prefixes/:id/peek` | `lookups.codePrefixes.read` | non-mutating preview `{ code }` |
| `POST /api/lookups/code-prefixes/:id/consume` | `lookups.codePrefixes.read` | atomically issue the next code `{ code }` |
| `POST /api/lookups/code-prefixes` | `lookups.codePrefixes.write` | create a prefix definition |
| `PATCH /api/lookups/code-prefixes/:id` | `lookups.codePrefixes.write` | update (incl. manually correcting `nextNumber`) |
| `DELETE /api/lookups/code-prefixes/:id` | `lookups.codePrefixes.write` | delete |

`codePrefixesRead` deliberately covers `consume` — generating a code (e.g.
picking a stok kodu prefix while adding a product) is a routine action for
any user filling out a form, not an admin task. `codePrefixesWrite` gates
CRUD of the prefix *definitions* themselves (admin-only, in **Kod Önekleri**).

### Remembering the last-picked prefix per context

Reuses the existing **Settings** subsystem (`/api/settings`, per-user jsonb
key/value — the same one DataGrid layouts use) — zero new backend code:

```ts
api.settings.set(`codePrefix:${context}`, { prefixId })
api.settings.get<{ prefixId: string }>(`codePrefix:${context}`)
```

`useCodePrefix` reads this on mount to auto-select the remembered prefix (if
it still exists and is active), and writes it on every pick.

### `<CodePrefixInput>` — integrate into a new form

**Step 0:** add the context to the registry (`shared/src/modules/lookups/code-prefix-contexts.ts`):
```ts
export const CodePrefixContexts = {
  inventoryProducts: 'inventory.products',
  someModuleSomeResource: 'someModule.someResource', // ← add this
} as const
// …and its label in CODE_PREFIX_CONTEXT_LABELS
```

**Step 1:** wire the component, using the constant (not a string literal).
There are two shapes depending on whether editing an existing record should
**lock** the code or just leave it **as-is until re-picked**:

```tsx
import { CodePrefixContexts } from '@turbohesap/shared'
import { CodePrefixInput, type CodePrefixInputHandle } from '@/components/code-prefix/code-prefix-input'

function MyFormDialog({ editing }: { editing: SomeDto | null }) {
  const codeRef = React.useRef<CodePrefixInputHandle>(null)
  const [code, setCode] = React.useState('')

  const save = useMutation({
    mutationFn: async () => {
      // Only resolve on create — on edit the field is locked, nothing to finalize.
      const finalCode = editing ? code : await (codeRef.current?.finalize() ?? Promise.resolve(code))
      return api.someModule.someResource.create({ ...payload, code: finalCode })
    },
  })

  return (
    <CodePrefixInput
      ref={codeRef}
      context={CodePrefixContexts.someModuleSomeResource}
      value={code}
      onChange={setCode}
      disabled={!!editing} // e.g. product form: code is permanently locked once created
    />
  )
}
```

If instead the code should stay **editable even when editing** (e.g. cari
kodu can be corrected by hand after creation), don't lock it with `disabled`
— use `autoAssign` instead, which only controls whether the hook
auto-restores/auto-consumes a fresh code on mount:

```tsx
<CodePrefixInput
  ref={codeRef}
  context={CodePrefixContexts.someModuleSomeResource}
  value={code}
  onChange={setCode}
  autoAssign={!editing} // only auto-pick a prefix when creating; editing leaves the existing value alone
/>
```

`autoAssign` defaults to `!disabled`, so the `disabled`-only form above needs
no change. With `autoAssign={false}` (editing), the field stays fully
interactive — the user can retype the number, or reopen the prefix picker to
explicitly assign a different prefix (which *does* then peek/consume,
because that's a deliberate user action, not something that happens just
from opening the form). Opening an edit dialog must never silently burn a
counter value — see `frontend/src/modules/contacts/components/contact-dialog.tsx`
for the reference of this pattern.

Contexts can also be registered **ahead of** the `<CodePrefixInput>` wiring —
`invoicesInvoices` ('Fatura no') and `ordersDeliveries` ('İrsaliye no') are in
the registry so admins can pre-configure prefixes for them in **Kod
Önekleri**, but deliberately have no `<CodePrefixInput>` wired in (see the
callout above). `contactsContacts` ('Cari kodu') *is* wired, using the
`autoAssign={!editing}` shape above.

### Mobile

`mobile/src/components/CodePrefixInput.tsx` mirrors the web component 1:1 —
same props (`context`, `value`, `onChange`, `editable`, `autoAssign`,
`ref`-exposed `finalize()`), same number-only split/longest-prefix-match
logic. The picker is a bottom-sheet `Modal` (matching `LookupSelect`'s
pattern) instead of a `Popover`. `mobile/src/lib/use-code-prefix.ts` is the
hook port — logically identical to the web `useCodePrefix`, just built on
`useAsync`/`useState`/`useRef` instead of TanStack Query (mobile has none),
with `list.refetch()` standing in for query invalidation. See
`mobile/src/modules/inventory/ProductFormScreen.tsx` and
`mobile/src/modules/contacts/ContactFormScreen.tsx` for the reference
integrations (disabled-lock and autoAssign-only shapes respectively).

Mobile also has the admin CRUD for prefix DEFINITIONS (previously web-only):
`mobile/src/modules/lookups/{CodePrefixesScreen,CodePrefixFormScreen}.tsx`,
reached from the **Tanımlar → Kod Önekleri** nav item
(`lookups.codePrefixes.read`). It mirrors the web
`code-prefixes-page.tsx` — list + create/edit form (context `FormSelect`,
prefix/padding/nextNumber inputs, incrementOnSave/isActive switches).

`finalize()` is idempotent and safe to call once per submit:
- If the user hand-typed the code directly, it's returned as-is — `consume`
  is never called (manual entry always overrides auto-numbering, same as a
  plain text `code` input always did).
- If the selected prefix already consumed a code (the `incrementOnSave=false`
  path), that value is returned unchanged.
- Otherwise (the `incrementOnSave=true` path, not yet consumed), `consume` is
  called now and the result returned.

See `frontend/src/modules/inventory/components/product-form-dialog.tsx` for
the reference integration (stok kodu, context `"inventory.products"`).

### Extending

- **New permission semantics?** Edit `LookupsPermissions` (shared) +
  `LOOKUPS_PERMISSION_DEFS` (backend) — they auto-seed alongside the item
  permissions.
- **Audit:** create/update/delete of a `CodePrefix` definition is recorded
  (`CodePrefix` → module `lookups` in `ENTITY_MODULE_MAP`); the `nextNumber`
  bump from every `consume()` call is excluded from the diff
  (`NOISE_AUDIT_FIELDS`) — same bookkeeping-not-a-business-change reasoning
  as the `lastLoginAt` bump on login.
- **Mobile:** not implemented — this feature is web-only for now.

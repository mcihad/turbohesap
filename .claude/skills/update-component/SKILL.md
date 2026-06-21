---
name: update-component
description: Safely modify an existing component in this design-system template (KentOS Console) — change styles, add a variant/prop, fix behavior, or refactor a component in src/components. Use when asked to edit/update/tweak/fix/restyle an existing component. Preserves the token system, the component API, and DESIGN.md consistency.
---

# Update a component

Change the component **without breaking its contract or the design language**.

## 0. Read first (required)
1. **`DESIGN.md`** §1 (conventions) and the relevant §14 entry for this
   component (focus rings, variants, slots, the exact look it must keep).
2. The component file itself, fully.
3. **Find every usage before changing the API:**
   ```bash
   grep -rn "ComponentName" src --include=*.tsx
   ```

## 1. Preserve these (do not regress)
- The **`data-slot`** attributes.
- The **public API shape**: prop names, variant names, exported members. If you
  must rename/remove, update *all* call sites found in step 0.3.
- **No `forwardRef`**; keep `React.ComponentProps<…>` + `{...props}`.
- The standard interaction states (§14): `focus-visible:ring-[3px]
  ring-ring/50`, `disabled:opacity-50 disabled:pointer-events-none`,
  `aria-invalid:*` on form controls.
- Existing `cva` structure for variants — add to the variants map, don't fork it.

## 2. Token discipline (from DESIGN.md §3–4)
- Express every change through tokens: semantic colors (`bg-*`, `text-*`,
  `border-*`), `rounded-*`, `shadow-*`, spacing/size utilities, `text-*`.
- **Never** introduce a hardcoded hex/rgb, a px radius, or a raw box-shadow.
  If a value seems missing, it usually belongs in `src/index.css` as a token —
  add/adjust the token there, not inline in the component.
- Use `cn()` so overrides via `className` keep winning.

## 3. Adding a variant or prop (typical task)
- New visual variant → add a key to the existing `cva` `variants` map; keep
  `defaultVariants` stable. Demo it in `src/routes/components.tsx`.
- New behavior prop → extend the props type; give it a safe default so existing
  call sites are unaffected.

## 4. Verify (required, must pass)
```bash
pnpm exec tsc -b      # zero errors — catches broken call sites
pnpm lint             # zero errors
pnpm build            # succeeds
```
If you changed something visible, also sanity-check the relevant demo on the
**/components** route (`pnpm dev`).

## 5. Keep DESIGN.md true
If the change alters a documented standard (a variant set, a size, a focus/title
style, a default), update the matching **DESIGN.md** entry in the same change so
the doc still reproduces the real component 1:1.

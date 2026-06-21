---
name: create-component
description: Create a new React component for this design-system template (Acme Console) — a shadcn/ui-style primitive in src/components/ui or a composed feature component. Use when asked to add/build/create a component, button variant, card, dialog, widget, or any new reusable UI. Enforces the token system and conventions in DESIGN.md so the result is visually consistent.
---

# Create a component

You are adding a component to a **token-driven** design system. The look is
defined entirely by tokens; your job is to compose them, never to invent values.

## 0. Read first (required)
1. **`DESIGN.md`** — especially §1 (conventions), §3–4 (tokens/colors),
   §14 (component standards). It is the contract.
2. An existing sibling that resembles what you're building, e.g.
   `src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `switch.tsx`.
   Match its shape exactly.

## 1. Decide location
- **Generic, reusable primitive** (button, input, badge, table…) →
  `src/components/ui/<name>.tsx` (kebab-case file, PascalCase exports).
- **Composed / app-specific** (a shell part, a feature widget) →
  `src/components/<feature>/<name>.tsx` or `src/components/layout/` if it's part
  of the shell. Compose from `ui/*` primitives — don't re-style raw elements.

## 2. Hard rules (non-negotiable — from DESIGN.md §1)
- Import and use **`cn()`** from `@/lib/utils` for all class composition.
- Put **`data-slot="<name>"`** on the root element.
- **No `forwardRef`** (React 19): `function X(props: React.ComponentProps<'div'>)`
  and spread `{...props}` (and `ref` if needed).
- Multi-variant? Use **`cva`** from `class-variance-authority` and export the
  variants map (e.g. `xVariants`), like `button.tsx`.
- Wrapping a Radix primitive? Install it first
  (`pnpm add @radix-ui/react-<thing>`) and mirror the structure in `dialog.tsx`.
- Icons: `lucide-react`, default `size-4`.
- **Tokens only.** Never hardcode hex/rgb, px radii, or raw shadows.
  - Color: `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`,
    `text-primary-foreground`, `bg-destructive`, `bg-success`… (§4.1).
  - Radius: `rounded-md|lg|xl|full` (§3.3). Inputs/buttons `rounded-md`,
    cards/popovers `rounded-xl`.
  - Shadow: `shadow-xs|sm|md|lg|xl|2xl` (§3.4).
  - Spacing/size: standard scale utilities (`gap-2`, `p-3`, `size-9`…).
  - Type: `text-2xs|xs|sm|base|lg…`, `font-medium|semibold`.
- Interactive elements MUST include the standard states (§14):
  - Focus: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
    (+ `focus-visible:border-ring` on bordered inputs).
  - Disabled: `disabled:opacity-50 disabled:pointer-events-none`.
  - Form controls: `aria-invalid:border-destructive aria-invalid:ring-destructive/30`.
- Overlays (anything that pops/portals): animate with
  `data-[state=open]:animate-in fade-in-0 zoom-in-95` /
  `data-[state=closed]:animate-out …` and portal to body.

## 3. Skeletons

**Simple element**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Thing({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="thing"
      className={cn('rounded-xl border bg-card p-4 text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

export { Thing }
```

**Variants (cva)**
```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const thingVariants = cva('inline-flex items-center rounded-md text-sm', {
  variants: {
    variant: { default: 'bg-primary text-primary-foreground', outline: 'border bg-background' },
    size: { default: 'h-9 px-4', sm: 'h-8 px-3' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

function Thing({ className, variant, size, ...props }:
  React.ComponentProps<'button'> & VariantProps<typeof thingVariants>) {
  return <button data-slot="thing" className={cn(thingVariants({ variant, size, className }))} {...props} />
}

export { Thing, thingVariants }
```

**Radix wrapper** — copy the prop/slot pattern from `src/components/ui/dialog.tsx`
or `popover.tsx` (Root/Trigger/Portal/Content + `data-slot` on each).

## 4. Wire it up
- Export every public part from the file.
- If it's a theme-aware feature component, read theme via `useTheme()`
  (`@/lib/theme/use-theme`) and layout state via `useLayout()`
  (`@/lib/layout/use-layout`) — don't add new global state.
- Add a demo to `src/routes/components.tsx` (a `<Section title=…>`) when it's a
  reusable primitive, so it stays in the living reference.

## 5. Verify (required, must pass)
```bash
pnpm exec tsc -b      # zero errors
pnpm lint             # zero errors
pnpm build            # succeeds
```
Note: strict TS (`noUnusedLocals`/`noUnusedParameters`) — remove unused imports.

## 6. Keep DESIGN.md true
If you added a **reusable primitive** or a new pattern, add a short entry to
**DESIGN.md §14** (and the file map / stack table if you added a dependency).
DESIGN.md must always let another agent reproduce the exact UI.

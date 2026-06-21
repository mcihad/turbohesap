# KentOS Console — Design System Template

A token-driven application shell to build **all our apps** with one consistent,
fully themeable look and feel.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix) ·
TanStack Router + Query · lucide-react · cmdk · sonner.

## What's in the box

- **App shell**: fixed searchable/groupable **tree sidebar** (collapsible icon
  rail), **app launcher** (Office/Unity style), **app bar** with breadcrumb +
  centered **⌘K command palette**, theme/notifications/mode/user controls.
- **Page system**: `PageWrapper` (padded or edge-to-edge for maps), `PageHeader`
  with title + actions, optional fixed footer, and an always-present **AI chat**
  FAB bottom-right.
- **Theme engine**: 100% token-based. Customize colors, font family, font size,
  scale/density, spacing grid, radius, and elevation live — persisted locally,
  with light/dark/system modes and no flash on load.

## 📐 DESIGN.md is the contract

**[`DESIGN.md`](./DESIGN.md)** documents every token, color, dimension, and
component standard in enough detail to rebuild this system 1:1. Read it first.

## Develop

```bash
pnpm install
pnpm dev        # starts Vite; also generates src/routeTree.gen.ts
pnpm build      # tsc -b && vite build
pnpm preview    # serve the production build
pnpm lint
```

## Customize

| Want to change…        | Edit…                                  |
| ---------------------- | -------------------------------------- |
| Design tokens / colors | `src/index.css`                        |
| Theme presets/defaults | `src/lib/theme/presets.ts`             |
| Sidebar navigation     | `src/config/navigation.ts`             |
| App launcher tiles     | `src/config/apps.ts`                   |
| Add a page             | add a file under `src/routes/`         |

> Generated file `src/routeTree.gen.ts` is created by the TanStack Router plugin
> on `pnpm dev` — do not edit it by hand.

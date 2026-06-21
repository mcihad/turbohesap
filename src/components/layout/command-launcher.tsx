import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  LayoutGrid,
  Moon,
  Palette,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react'

import { NAVIGATION, type NavItem } from '@/config/navigation'
import { useLayout } from '@/lib/layout/use-layout'
import { useTheme } from '@/lib/theme/use-theme'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

interface FlatLink {
  title: string
  to: string
  icon?: LucideIcon
  group: string
}

function flatten(items: NavItem[], group: string, acc: FlatLink[]) {
  for (const item of items) {
    if (item.to) acc.push({ title: item.title, to: item.to, icon: item.icon, group })
    if (item.children) flatten(item.children, item.title, acc)
  }
}

export function CommandLauncher() {
  const navigate = useNavigate()
  const { commandOpen, setCommandOpen, setAppLauncherOpen, setCustomizerOpen, setAiOpen } =
    useLayout()
  const { toggleMode, resolvedMode } = useTheme()

  // Global ⌘K / Ctrl+K shortcut.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commandOpen, setCommandOpen])

  const links = React.useMemo(() => {
    const acc: FlatLink[] = []
    NAVIGATION.forEach((g) => flatten(g.items, g.label ?? 'Navigation', acc))
    return acc
  }, [])

  const run = (fn: () => void) => {
    setCommandOpen(false)
    fn()
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => setAppLauncherOpen(true))}>
            <LayoutGrid />
            <span>Open applications</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setAiOpen(true))}>
            <Sparkles />
            <span>Ask AI assistant</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setCustomizerOpen(true))}>
            <Palette />
            <span>Customize theme</span>
          </CommandItem>
          <CommandItem onSelect={() => run(toggleMode)}>
            {resolvedMode === 'dark' ? <Sun /> : <Moon />}
            <span>Toggle {resolvedMode === 'dark' ? 'light' : 'dark'} mode</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {links.map((link) => (
            <CommandItem
              key={link.to}
              value={`${link.group} ${link.title} ${link.to}`}
              onSelect={() => run(() => navigate({ to: link.to }))}
            >
              {link.icon ? <link.icon /> : <span className="size-4" />}
              <span>{link.title}</span>
              <CommandShortcut>{link.group}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

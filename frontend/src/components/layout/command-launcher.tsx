import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Moon, Palette, Sparkles, Sun, type LucideIcon } from 'lucide-react'

import { type NavItem } from '@/config/navigation'
import { APP_MODULES } from '@/modules/registry'
import { useLayout } from '@/lib/layout/use-layout'
import { useAuth } from '@/lib/auth/auth-context'
import { accessibleModules, filterNavByPermission } from '@/lib/auth/access'
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
  const { commandOpen, setCommandOpen, setCustomizerOpen, setAiOpen } =
    useLayout()
  const { hasPermission } = useAuth()
  const { toggleMode, resolvedMode } = useTheme()

  const modules = React.useMemo(
    () => accessibleModules(APP_MODULES, hasPermission),
    [hasPermission],
  )

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
    modules.forEach((m) =>
      filterNavByPermission(m.nav, hasPermission).forEach((g) =>
        flatten(g.items, g.label ?? m.label, acc),
      ),
    )
    return acc
  }, [modules, hasPermission])

  const run = (fn: () => void) => {
    setCommandOpen(false)
    fn()
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Bir komut yazın veya arama yapın..." />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

        <CommandGroup heading="Modüller">
          {modules.map((m) => (
            <CommandItem
              key={m.key}
              value={`modul ${m.label} ${m.key}`}
              onSelect={() => run(() => navigate({ to: m.home }))}
            >
              <m.icon />
              <span>{m.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Eylemler">
          <CommandItem onSelect={() => run(() => setAiOpen(true))}>
            <Sparkles />
            <span>Yapay zeka asistanına sor</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setCustomizerOpen(true))}>
            <Palette />
            <span>Temayı özelleştir</span>
          </CommandItem>
          <CommandItem onSelect={() => run(toggleMode)}>
            {resolvedMode === 'dark' ? <Sun /> : <Moon />}
            <span>{resolvedMode === 'dark' ? 'Açık' : 'Koyu'} moda geç</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Gezinti">
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

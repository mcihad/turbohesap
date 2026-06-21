import * as React from 'react'
import { Outlet } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import { LayoutContext } from '@/lib/layout/layout-context'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ThemeCustomizer } from '@/components/theme-customizer'
import { SidebarInner } from './sidebar'
import { AppBar } from './app-bar'
import { AppFooter } from './footer'
import { AiChat } from './ai-chat'
import { AppLauncher } from './app-launcher'
import { CommandLauncher } from './command-launcher'

const COLLAPSE_KEY = 'sidebar-collapsed'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [appLauncherOpen, setAppLauncherOpen] = React.useState(false)
  const [customizerOpen, setCustomizerOpen] = React.useState(false)
  const [aiOpen, setAiOpen] = React.useState(false)
  const [footerSlot, setFooterSlot] = React.useState<HTMLElement | null>(null)
  const [pageFooterActive, setPageFooterActive] = React.useState(false)

  React.useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const value = React.useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((v) => !v),
      mobileSidebarOpen,
      setMobileSidebarOpen,
      commandOpen,
      setCommandOpen,
      appLauncherOpen,
      setAppLauncherOpen,
      customizerOpen,
      setCustomizerOpen,
      aiOpen,
      setAiOpen,
      footerSlot,
      setFooterSlot,
      pageFooterActive,
      setPageFooterActive,
    }),
    [
      sidebarCollapsed,
      mobileSidebarOpen,
      commandOpen,
      appLauncherOpen,
      customizerOpen,
      aiOpen,
      footerSlot,
      pageFooterActive,
    ],
  )

  return (
    <LayoutContext.Provider value={value}>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Desktop sidebar (vertical, fixed) */}
        <aside
          className={cn(
            'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-[var(--ease-emphasized)] lg:block',
            sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
          )}
        >
          <SidebarInner collapsed={sidebarCollapsed} />
        </aside>

        {/* Mobile off-canvas sidebar */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-sidebar max-w-none gap-0 p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Application menu</SheetDescription>
            </SheetHeader>
            <SidebarInner onNavigate={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppBar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>

      {/* Floating + overlay surfaces */}
      <AiChat />
      <AppLauncher open={appLauncherOpen} onOpenChange={setAppLauncherOpen} />
      <CommandLauncher />

      {/* Theme customizer */}
      <Sheet open={customizerOpen} onOpenChange={setCustomizerOpen}>
        <SheetContent side="right" className="w-[22rem] max-w-none gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Customize theme</SheetTitle>
            <SheetDescription>
              Tune colors, typography, spacing, and elevation. Changes persist
              locally.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <ThemeCustomizer />
          </div>
        </SheetContent>
      </Sheet>
    </LayoutContext.Provider>
  )
}

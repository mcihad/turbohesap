import { Menu, Palette, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AppBreadcrumb } from './app-breadcrumb'
import { ModeToggle } from './mode-toggle'
import { Notifications } from './notifications'
import { UserMenu } from './user-menu'

export function AppBar() {
  const {
    toggleSidebar,
    setMobileSidebarOpen,
    setCommandOpen,
    setCustomizerOpen,
  } = useLayout()

  return (
    <header
      className={cn(
        'flex h-appbar shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md',
      )}
    >
      {/* Hamburger: collapses rail on desktop, opens sheet on mobile */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        className="lg:inline-flex hidden"
        onClick={toggleSidebar}
      >
        <Menu className="size-[1.15rem]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="size-[1.15rem]" />
      </Button>

      {/* Breadcrumb (left) */}
      <div className="hidden min-w-0 flex-1 items-center sm:flex">
        <AppBreadcrumb />
      </div>

      {/* Center search → command launcher */}
      <div className="flex flex-1 justify-center sm:flex-none sm:justify-end md:absolute md:left-1/2 md:-translate-x-1/2">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="group flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-72 md:w-80"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex flex-1 items-center justify-end gap-0.5 sm:flex-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Customize theme"
              onClick={() => setCustomizerOpen(true)}
            >
              <Palette className="size-[1.15rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Customize theme</TooltipContent>
        </Tooltip>
        <Notifications />
        <ModeToggle />
        <div className="mx-1 h-5 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  )
}

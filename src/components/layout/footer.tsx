import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'

/**
 * AppFooter — the bottom status bar of the content column.
 *
 * Height is driven by `--app-footer-height` (token) and matches the sidebar
 * footer. Its content is **externally manageable**: any page can take over the
 * footer by rendering `<PageFooter>…</PageFooter>` (see page.tsx), which portals
 * into this bar. When no page provides content, the default status strip shows.
 *
 * Because it lives outside the scroll area it is effectively "fixed": always
 * visible while content scrolls.
 */
export function AppFooter({ className }: { className?: string }) {
  const { setFooterSlot, pageFooterActive } = useLayout()

  return (
    <footer
      className={cn(
        'flex h-footer shrink-0 items-center border-t bg-background px-4 text-xs text-muted-foreground',
        className,
      )}
    >
      {/* Portal target for page-supplied footer content. */}
      <div ref={setFooterSlot} className="contents" />
      {!pageFooterActive && <DefaultFooter />}
    </footer>
  )
}

function DefaultFooter() {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Tüm sistemler aktif
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">v2.4.0</span>
      </div>
      <div className="flex items-center gap-3">
        <a href="#" className="transition-colors hover:text-foreground">
          Gizlilik
        </a>
        <a href="#" className="transition-colors hover:text-foreground">
          Koşullar
        </a>
        <span>© {new Date().getFullYear()} KentOS Inc.</span>
      </div>
    </div>
  )
}

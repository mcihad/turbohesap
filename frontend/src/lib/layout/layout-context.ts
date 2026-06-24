import { createContext } from 'react'

export interface LayoutContextValue {
  /** Desktop: icon-rail collapse state. */
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void

  /** Mobile: off-canvas sidebar sheet. */
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (v: boolean) => void

  /** Command launcher (⌘K) dialog. */
  commandOpen: boolean
  setCommandOpen: (v: boolean) => void

  /** Theme customizer sheet. */
  customizerOpen: boolean
  setCustomizerOpen: (v: boolean) => void

  /** AI chat dock. */
  aiOpen: boolean
  setAiOpen: (v: boolean) => void

  /** Portal target for page-supplied footer content (see <PageFooter />). */
  footerSlot: HTMLElement | null
  setFooterSlot: (el: HTMLElement | null) => void
  /** Whether a page is currently rendering custom footer content. */
  pageFooterActive: boolean
  setPageFooterActive: (v: boolean) => void
}

export const LayoutContext = createContext<LayoutContextValue | null>(null)

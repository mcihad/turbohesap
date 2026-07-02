import { useTheme } from '@/lib/theme/use-theme'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ position = 'bottom-center', ...props }: ToasterProps) {
  const { mode } = useTheme()

  return (
    <Sonner
      theme={mode as ToasterProps['theme']}
      position={position}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

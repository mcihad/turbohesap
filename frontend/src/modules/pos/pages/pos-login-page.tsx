import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Delete, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError } from '@turbohesap/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Full-screen POS login: username + a big touch keypad for the PIN. On success
// the standard session machinery (refresh, permissions) takes over.
export function PosLoginPage() {
  const { posLogin } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = React.useState('')
  const [pin, setPin] = React.useState('')

  const login = useMutation({
    mutationFn: () => posLogin(username.trim(), pin),
    onSuccess: () => navigate({ to: '/pos' }),
    onError: (e) => {
      setPin('')
      toast.error('Giriş başarısız', { description: toApiError(e).message })
    },
  })

  const press = (d: string) => setPin((p) => (p.length >= 8 ? p : p + d))
  const back = () => setPin((p) => p.slice(0, -1))

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!username.trim() || !pin) return
    login.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">POS Girişi</h1>
          <p className="text-sm text-muted-foreground">Kullanıcı adı ve PIN ile giriş yapın</p>
        </div>

        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Kullanıcı adı"
          autoFocus
          className="h-11"
        />

        {/* PIN dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-3 rounded-full border',
                i < pin.length ? 'bg-primary border-primary' : 'bg-transparent',
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <KeypadButton key={d} onClick={() => press(d)}>
              {d}
            </KeypadButton>
          ))}
          <KeypadButton onClick={back} aria-label="sil">
            <Delete className="size-5" />
          </KeypadButton>
          <KeypadButton onClick={() => press('0')}>0</KeypadButton>
          <Button
            type="submit"
            disabled={login.isPending || !username.trim() || !pin}
            className="h-14 text-base"
          >
            Giriş
          </Button>
        </div>
      </form>
    </div>
  )
}

function KeypadButton({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center justify-center rounded-md border bg-background text-xl font-semibold transition-colors hover:bg-accent active:scale-95"
      {...rest}
    >
      {children}
    </button>
  )
}

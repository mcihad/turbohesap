import { createFileRoute, Navigate } from '@tanstack/react-router'
import { LogIn, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status, login } = useAuth()

  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </span>
          <CardTitle className="text-xl">KentOS Konsolu</CardTitle>
          <CardDescription>
            Devam etmek için kurumsal hesabınızla giriş yapın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg" onClick={() => login('/dashboard')}>
            <LogIn />
            Giriş Yap
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

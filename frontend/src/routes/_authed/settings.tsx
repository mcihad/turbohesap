import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <PageWrapper className="max-w-3xl">
      <PageHeader
        title="Ayarlar"
        description="Çalışma alanı tercihlerinizi yönetin."
        actions={
          <Button onClick={() => toast.success('Ayarlar kaydedildi')}>
            Değişiklikleri kaydet
          </Button>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Kişisel bilgileriniz.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-name">Ad soyad</Label>
              <Input id="set-name" defaultValue="Cihad G." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-email">E-posta</Label>
              <Input id="set-email" type="email" defaultValue="cihad@kentos.io" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-tz">Saat dilimi</Label>
              <Select defaultValue="utc">
                <SelectTrigger id="set-tz" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Doğu Saat Dilimi</SelectItem>
                  <SelectItem value="ist">İstanbul</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-lang">Dil</Label>
              <Select defaultValue="en">
                <SelectTrigger id="set-lang" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bildirimler</CardTitle>
            <CardDescription>Nasıl iletişime geçilmesini istersiniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              ['E-posta özetleri', 'Haftalık aktivite özeti.', true],
              ['Ürün güncellemeleri', 'Yeni özellikler ve iyileştirmeler.', true],
              ['Güvenlik uyarıları', 'Önemli hesap uyarıları.', false],
            ].map(([title, desc, on], i) => (
              <div key={title as string}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch defaultChecked={on as boolean} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}

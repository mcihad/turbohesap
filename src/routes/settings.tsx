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

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <PageWrapper className="max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace preferences."
        actions={
          <Button onClick={() => toast.success('Settings saved')}>
            Save changes
          </Button>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-name">Full name</Label>
              <Input id="set-name" defaultValue="Cihad G." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-email">Email</Label>
              <Input id="set-email" type="email" defaultValue="cihad@acme.io" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-tz">Timezone</Label>
              <Select defaultValue="utc">
                <SelectTrigger id="set-tz" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern</SelectItem>
                  <SelectItem value="ist">Istanbul</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-lang">Language</Label>
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
            <CardTitle>Notifications</CardTitle>
            <CardDescription>How you want to be reached.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              ['Email digests', 'A weekly summary of activity.', true],
              ['Product updates', 'New features and improvements.', true],
              ['Security alerts', 'Important account warnings.', false],
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

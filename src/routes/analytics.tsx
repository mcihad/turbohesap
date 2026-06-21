import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Filter } from 'lucide-react'

import {
  PageFooter,
  PageFooterStat,
  PageHeader,
  PageWrapper,
} from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

const CHANNELS = [
  { name: 'Organik arama', value: 82 },
  { name: 'Doğrudan', value: 64 },
  { name: 'Yönlendirme', value: 47 },
  { name: 'Sosyal', value: 31 },
  { name: 'E-posta', value: 22 },
]

function AnalyticsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Analiz"
        description="Tüm kanallardaki trafik, etkileşim ve dönüşüm."
        actions={
          <>
            <Button variant="outline">
              <Calendar />
              Son 30 gün
            </Button>
            <Button variant="outline" size="icon" aria-label="Filtrele">
              <Filter />
            </Button>
          </>
        }
      />

      <Tabs defaultValue="traffic">
        <TabsList>
          <TabsTrigger value="traffic">Trafik</TabsTrigger>
          <TabsTrigger value="engagement">Etkileşim</TabsTrigger>
          <TabsTrigger value="conversion">Dönüşüm</TabsTrigger>
        </TabsList>
        <TabsContent value="traffic" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kanallar</CardTitle>
                <CardDescription>Kaynağa göre oturumlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CHANNELS.map((c) => (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{c.value}k</span>
                    </div>
                    <Progress value={c.value} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>En popüler sayfalar</CardTitle>
                <CardDescription>Bu dönemde en çok ziyaret edilenler</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {[
                    ['/', '24,512'],
                    ['/pricing', '12,043'],
                    ['/docs', '9,820'],
                    ['/blog/launch', '6,431'],
                    ['/contact', '3,902'],
                  ].map(([path, views]) => (
                    <li key={path} className="flex justify-between py-2.5">
                      <span className="font-mono text-xs">{path}</span>
                      <span className="text-muted-foreground">{views}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent
          value="engagement"
          className="mt-4 rounded-lg border p-8 text-center text-sm text-muted-foreground"
        >
          Etkileşim grafikleri burada gösterilecektir.
        </TabsContent>
        <TabsContent
          value="conversion"
          className="mt-4 rounded-lg border p-8 text-center text-sm text-muted-foreground"
        >
          Dönüşüm hunileri burada gösterilecektir.
        </TabsContent>
      </Tabs>

      {/* This page takes over the app footer with a thin stats strip. */}
      <PageFooter>
        <PageFooterStat label="Oturumlar" value="248.512" />
        <PageFooterStat label="Ort. süre" value="3dk 42sn" />
        <PageFooterStat label="Hemen çıkma" value="%38,2" />
        <PageFooterStat
          label="Güncellendi"
          value="şimdi"
          className="ml-auto"
        />
      </PageFooter>
    </PageWrapper>
  )
}

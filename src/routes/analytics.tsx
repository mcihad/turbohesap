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
  { name: 'Organic search', value: 82 },
  { name: 'Direct', value: 64 },
  { name: 'Referral', value: 47 },
  { name: 'Social', value: 31 },
  { name: 'Email', value: 22 },
]

function AnalyticsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Analytics"
        description="Traffic, engagement, and conversion across all channels."
        actions={
          <>
            <Button variant="outline">
              <Calendar />
              Last 30 days
            </Button>
            <Button variant="outline" size="icon" aria-label="Filter">
              <Filter />
            </Button>
          </>
        }
      />

      <Tabs defaultValue="traffic">
        <TabsList>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>
        <TabsContent value="traffic" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
                <CardDescription>Sessions by source</CardDescription>
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
                <CardTitle>Top pages</CardTitle>
                <CardDescription>Most visited this period</CardDescription>
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
          Engagement charts would render here.
        </TabsContent>
        <TabsContent
          value="conversion"
          className="mt-4 rounded-lg border p-8 text-center text-sm text-muted-foreground"
        >
          Conversion funnels would render here.
        </TabsContent>
      </Tabs>

      {/* This page takes over the app footer with a thin stats strip. */}
      <PageFooter>
        <PageFooterStat label="Sessions" value="248,512" />
        <PageFooterStat label="Avg. duration" value="3m 42s" />
        <PageFooterStat label="Bounce" value="38.2%" />
        <PageFooterStat
          label="Updated"
          value="just now"
          className="ml-auto"
        />
      </PageFooter>
    </PageWrapper>
  )
}

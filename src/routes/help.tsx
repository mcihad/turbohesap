import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, LifeBuoy, MessageCircle, Rocket } from 'lucide-react'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const Route = createFileRoute('/help')({
  component: HelpPage,
})

const RESOURCES = [
  { icon: Rocket, title: 'Getting started', desc: 'Set up your workspace in minutes.' },
  { icon: BookOpen, title: 'Documentation', desc: 'Guides, API, and references.' },
  { icon: MessageCircle, title: 'Community', desc: 'Ask questions and share tips.' },
  { icon: LifeBuoy, title: 'Support', desc: 'Reach our team directly.' },
]

function HelpPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Help & Docs"
        description="Find answers, guides, and ways to get in touch."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map((r) => (
          <Card key={r.title} className="cursor-pointer transition-colors hover:border-primary/40">
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <r.icon className="size-5" />
              </span>
              <CardTitle className="mt-2 text-base">{r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Frequently asked</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {[
              ['How do I customize the theme?', 'Click the palette icon in the app bar to open the customizer.'],
              ['Can I add new apps?', 'Edit src/config/apps.ts to register new app tiles.'],
              ['How is navigation defined?', 'The sidebar tree comes from src/config/navigation.ts.'],
            ].map(([q, a], i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}

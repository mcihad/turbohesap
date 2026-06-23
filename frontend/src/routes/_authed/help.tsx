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

export const Route = createFileRoute('/_authed/help')({
  component: HelpPage,
})

const RESOURCES = [
  { icon: Rocket, title: 'Başlangıç', desc: 'Çalışma alanınızı dakikalar içinde kurun.' },
  { icon: BookOpen, title: 'Dokümantasyon', desc: 'Kılavuzlar, API ve referanslar.' },
  { icon: MessageCircle, title: 'Topluluk', desc: 'Sorular sorun ve ipuçları paylaşın.' },
  { icon: LifeBuoy, title: 'Destek', desc: 'Ekibimize doğrudan ulaşın.' },
]

function HelpPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Yardım ve Dokümanlar"
        description="Sorularınızın yanıtlarını, rehberleri ve bizimle iletişime geçme yollarını bulun."
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
          <CardTitle>Sıkça sorulan sorular</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {[
              ['Temayı nasıl özelleştirebilirim?', 'Özelleştiriciyi açmak için uygulama çubuğundaki palet simgesine tıklayın.'],
              ['Yeni uygulamalar ekleyebilir miyim?', 'Yeni uygulama kartları kaydetmek için src/config/apps.ts dosyasını düzenleyin.'],
              ['Gezinti (Navigasyon) nasıl tanımlanır?', 'Kenar çubuğu ağacı src/config/navigation.ts dosyasından alınır.'],
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

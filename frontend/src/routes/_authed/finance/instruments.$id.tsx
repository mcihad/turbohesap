import { createFileRoute } from '@tanstack/react-router'
import { InstrumentDetailPage } from '@/modules/finance/pages/instrument-detail-page'

export const Route = createFileRoute('/_authed/finance/instruments/$id')({
  component: InstrumentDetailPage,
})

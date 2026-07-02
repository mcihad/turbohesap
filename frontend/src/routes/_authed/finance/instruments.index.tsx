import { createFileRoute } from '@tanstack/react-router'
import { InstrumentsPage } from '@/modules/finance/pages/instruments-page'

export const Route = createFileRoute('/_authed/finance/instruments/')({
  component: InstrumentsPage,
})

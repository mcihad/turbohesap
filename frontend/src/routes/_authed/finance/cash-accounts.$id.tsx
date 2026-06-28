import { createFileRoute } from '@tanstack/react-router'
import { CashAccountDetailPage } from '@/modules/finance/pages/cash-account-detail-page'

export const Route = createFileRoute('/_authed/finance/cash-accounts/$id')({
  component: CashAccountDetailPage,
})

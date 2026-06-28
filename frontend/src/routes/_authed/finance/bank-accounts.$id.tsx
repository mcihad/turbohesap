import { createFileRoute } from '@tanstack/react-router'
import { BankAccountDetailPage } from '@/modules/finance/pages/bank-account-detail-page'

export const Route = createFileRoute('/_authed/finance/bank-accounts/$id')({
  component: BankAccountDetailPage,
})

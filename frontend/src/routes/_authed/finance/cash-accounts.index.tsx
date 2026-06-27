import { createFileRoute } from '@tanstack/react-router'
import { CashAccountsPage } from '@/modules/finance/pages/cash-accounts-page'

export const Route = createFileRoute('/_authed/finance/cash-accounts/')({
  component: CashAccountsPage,
})

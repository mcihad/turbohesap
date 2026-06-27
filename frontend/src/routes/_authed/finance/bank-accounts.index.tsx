import { createFileRoute } from '@tanstack/react-router'
import { BankAccountsPage } from '@/modules/finance/pages/bank-accounts-page'

export const Route = createFileRoute('/_authed/finance/bank-accounts/')({
  component: BankAccountsPage,
})

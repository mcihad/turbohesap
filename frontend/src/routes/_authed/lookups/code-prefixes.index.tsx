import { createFileRoute } from '@tanstack/react-router'

import { CodePrefixesPage } from '@/modules/lookups/pages/code-prefixes-page'

export const Route = createFileRoute('/_authed/lookups/code-prefixes/')({
  component: CodePrefixesPage,
})

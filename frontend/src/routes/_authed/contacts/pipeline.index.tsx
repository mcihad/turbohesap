import { createFileRoute } from '@tanstack/react-router'

import { PipelineBoardPage } from '@/modules/contacts/pages/pipeline-board-page'

export const Route = createFileRoute('/_authed/contacts/pipeline/')({
  component: PipelineBoardPage,
})

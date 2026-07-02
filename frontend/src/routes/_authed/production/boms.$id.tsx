import { createFileRoute } from '@tanstack/react-router'

import { BomEditorPage } from '@/modules/production/pages/bom-editor-page'

export const Route = createFileRoute('/_authed/production/boms/$id')({
  component: BomEditorPage,
})

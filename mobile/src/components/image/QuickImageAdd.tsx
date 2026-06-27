// QuickImageAdd — a compact, drop-in "add a photo" section for any entity. Same
// pipeline as <ImageManager> (pick → edit → upload), rendered as a horizontal
// strip so it fits inside a card or a form section without taking the whole
// screen. Modular by design: pass it any entityType/entityId.

import * as React from 'react'

import { ImageManager } from './ImageManager'

export function QuickImageAdd({
  entityType,
  entityId,
  canWrite,
  title = 'Hızlı görsel ekle',
}: {
  entityType: string
  entityId: string | null | undefined
  canWrite: boolean
  title?: string
}) {
  return (
    <ImageManager
      entityType={entityType}
      entityId={entityId}
      canWrite={canWrite}
      title={title}
      layout="strip"
    />
  )
}

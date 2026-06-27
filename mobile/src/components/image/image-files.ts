// Glue between the editor and the polymorphic files API. Mirrors the web
// FileManager's upload contract (FormData fields: files, entityType, entityId,
// kind, sortOrder) — only the file part differs: React Native FormData takes a
// { uri, name, type } descriptor instead of a Blob.

import * as React from 'react'

import type { FileDto } from '@turbohesap/shared'

import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'

/** Public raw URL for an uploaded file (works directly in <Image source>). */
export function imageUrl(file: FileDto): string {
  return api.files.rawUrl(file.storedName)
}

let uploadCounter = 0

export interface UploadImageInput {
  entityType: string
  entityId: string
  /** Local file:// uri (typically the editor's baked output). */
  uri: string
  sortOrder?: number
}

/** Upload a single local image to an entity. Returns the created file rows. */
export async function uploadImage(input: UploadImageInput): Promise<FileDto[]> {
  const { entityType, entityId, uri, sortOrder = 0 } = input
  const name = `photo-${Date.now()}-${uploadCounter++}.jpg`
  const form = new FormData()
  // RN FormData file descriptor — cast since the DOM lib types expect a Blob.
  form.append('files', { uri, name, type: 'image/jpeg' } as unknown as Blob)
  form.append('entityType', entityType)
  form.append('entityId', entityId)
  form.append('kind', 'image')
  form.append('sortOrder', String(sortOrder))
  return api.files.upload(form)
}

export interface EntityImages {
  images: FileDto[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Load (and refetch) the image files attached to an entity. */
export function useEntityImages(
  entityType: string,
  entityId: string | null | undefined,
  enabled = true,
): EntityImages {
  const state = useAsync(
    () => api.files.list(entityType, entityId ?? ''),
    [entityType, entityId],
    { enabled: enabled && !!entityId },
  )
  const images = React.useMemo(
    () =>
      (state.data ?? [])
        .filter((f) => f.isImage)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.data],
  )
  return { images, loading: state.loading, error: state.error, refetch: state.refetch }
}

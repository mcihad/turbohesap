// Upload a baked feedback screenshot UNATTACHED (no entityType/entityId) — the
// backend links it to the Feedback record once `screenshotFileId` is supplied to
// api.feedback.create. Mirrors components/image/image-files.ts, but PNG + no owner.

import type { FileDto } from '@turbohesap/shared'

import { api } from '../../lib/api'

let counter = 0

/** Upload a local PNG file:// and return the created file rows. */
export async function uploadFeedbackScreenshot(uri: string): Promise<FileDto[]> {
  const name = `feedback-${Date.now()}-${counter++}.png`
  const form = new FormData()
  // RN FormData file descriptor — cast since the DOM lib types expect a Blob.
  form.append('files', { uri, name, type: 'image/png' } as unknown as Blob)
  form.append('kind', 'image')
  return api.files.upload(form)
}

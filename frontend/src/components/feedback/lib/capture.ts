// Screenshot capture helpers for the in-app feedback flow. We snapshot the live
// DOM to a PNG with `modern-screenshot`, then (optionally) let the user annotate
// it before uploading. The feedback UI itself must be captured-out — callers
// capture the page BEFORE opening any overlay, and we also skip elements marked
// with `data-feedback-ignore` (e.g. the floating button) as a safety net.

import { domToPng } from 'modern-screenshot'

/**
 * Capture the current page as a PNG data URL. Captures `#root` when present
 * (the app mount), falling back to `document.body`. Any element carrying the
 * `data-feedback-ignore` attribute is excluded from the snapshot.
 */
export async function captureScreenshot(): Promise<string> {
  const target =
    (document.getElementById('root') as HTMLElement | null) ?? document.body
  return domToPng(target, {
    // Cap the device pixel ratio so large/retina pages stay a reasonable size.
    scale: Math.min(window.devicePixelRatio || 1, 2),
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    filter: (node) =>
      !(
        node instanceof HTMLElement &&
        node.dataset?.feedbackIgnore !== undefined
      ),
  })
}

/** Convert a data URL into a File (for upload via FormData). */
export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], name, { type: blob.type || 'image/png' })
}

/** Flatten a canvas to a PNG File. */
export async function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  )
  if (!blob) throw new Error('Canvas dışa aktarılamadı')
  return new File([blob], name, { type: 'image/png' })
}

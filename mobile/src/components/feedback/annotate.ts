// Annotation model + the offscreen-surface bake pipeline for the feedback widget.
// Strokes/texts are collected in *display* coordinates (relative to the on-screen
// preview); baking scales them to the captured image's native pixel size, draws
// everything onto a Skia offscreen surface and writes a flattened PNG file://.
// Mirrors the pattern in components/image/edit-image.ts.

import * as FileSystem from 'expo-file-system/legacy'
import {
  ImageFormat,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkImage,
} from '@shopify/react-native-skia'

export interface Point {
  x: number
  y: number
}

export interface StrokeAnnotation {
  type: 'stroke'
  color: string
  width: number
  points: Point[]
}

export interface TextAnnotation {
  type: 'text'
  color: string
  size: number
  /** Baseline anchor, in display coordinates. */
  x: number
  y: number
  text: string
}

export type Annotation = StrokeAnnotation | TextAnnotation

/** Build a Skia path from a point list (used for the live preview + bake). */
export function pointsToPath(points: Point[], scale = 1) {
  const path = Skia.Path.Make()
  if (points.length === 0) return path
  path.moveTo(points[0].x * scale, points[0].y * scale)
  if (points.length === 1) {
    // A single tap → a tiny segment so the round cap renders as a dot.
    path.lineTo(points[0].x * scale + 0.1, points[0].y * scale)
  } else {
    for (let i = 1; i < points.length; i++) path.lineTo(points[i].x * scale, points[i].y * scale)
  }
  return path
}

let bakeCounter = 0

/**
 * Flatten the captured image + annotations to a PNG file. `dispW`/`dispH` are the
 * on-screen preview size the annotations were drawn against; pass the image's own
 * dimensions (and no annotations) for a plain re-encode of the raw screenshot.
 */
export async function bakeAnnotated(
  image: SkImage,
  annotations: Annotation[],
  dispW: number,
  dispH: number,
): Promise<string> {
  const w = image.width()
  const h = image.height()
  const scale = dispW > 0 ? w / dispW : 1

  const surface = Skia.Surface.MakeOffscreen(w, h)
  if (!surface) throw new Error('Ekran görüntüsü işlenemedi.')
  const canvas = surface.getCanvas()
  canvas.drawImage(image, 0, 0)

  for (const a of annotations) {
    const paint = Skia.Paint()
    paint.setAntiAlias(true)
    paint.setColor(Skia.Color(a.color))
    if (a.type === 'stroke') {
      paint.setStyle(PaintStyle.Stroke)
      paint.setStrokeWidth(a.width * scale)
      paint.setStrokeCap(StrokeCap.Round)
      paint.setStrokeJoin(StrokeJoin.Round)
      canvas.drawPath(pointsToPath(a.points, scale), paint)
    } else {
      paint.setStyle(PaintStyle.Fill)
      const font = Skia.Font(undefined, a.size * scale)
      canvas.drawText(a.text, a.x * scale, a.y * scale, paint, font)
    }
  }

  surface.flush()
  const snapshot = surface.makeImageSnapshot()
  const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100)
  const uri = `${FileSystem.cacheDirectory}feedback-${Date.now()}-${bakeCounter++}.png`
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 })
  return uri
}

// The image-edit bake pipeline. Two stages, applied in order:
//   1. Geometry (rotate → flip → crop → downscale) via expo-image-manipulator.
//   2. Colour (brightness/contrast/saturation/warmth) via an offscreen Skia
//      surface + colour-matrix filter, snapshotted back to a JPEG file.
// Each stage is skipped when it would be a no-op, so an untouched image is just
// re-encoded (or returned as-is). The result is a fresh file:// uri ready to
// upload.

import {
  FlipType,
  manipulateAsync,
  SaveFormat,
  type ActionResize,
} from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import { ImageFormat, Skia } from '@shopify/react-native-skia'

import { adjustToMatrix, IDENTITY_ADJUST, isIdentityAdjust, type ImageAdjust } from './color-matrix'

export interface CropRect {
  originX: number
  originY: number
  width: number
  height: number
}

export interface BakeOptions {
  uri: string
  /** Multiples of 90 (0, 90, 180, 270). */
  rotate?: number
  flipH?: boolean
  flipV?: boolean
  /** Crop rect in the post-rotate/flip pixel space, or null for no crop. */
  crop?: CropRect | null
  adjust?: ImageAdjust
  /** Longest-edge cap (px). Larger images are downscaled. Default 2000. */
  maxSize?: number
  /** JPEG quality 0–1. Default 0.86. */
  quality?: number
}

export interface BakedImage {
  uri: string
  width: number
  height: number
}

let bakeCounter = 0

/** Apply the editor's transforms and return a new image file. */
export async function bakeImage(opts: BakeOptions): Promise<BakedImage> {
  const {
    uri,
    rotate = 0,
    flipH = false,
    flipV = false,
    crop = null,
    adjust = IDENTITY_ADJUST,
    maxSize = 2000,
    quality = 0.86,
  } = opts

  // ── Stage 1: geometry ──────────────────────────────────────────────────────
  const actions: Parameters<typeof manipulateAsync>[1] = []
  const rot = ((rotate % 360) + 360) % 360
  if (rot !== 0) actions.push({ rotate: rot })
  if (flipH) actions.push({ flip: FlipType.Horizontal })
  if (flipV) actions.push({ flip: FlipType.Vertical })
  if (crop) actions.push({ crop })

  let geom = await manipulateAsync(uri, actions, {
    compress: quality,
    format: SaveFormat.JPEG,
  })

  // Downscale if the longest edge exceeds the cap.
  const longest = Math.max(geom.width, geom.height)
  if (longest > maxSize) {
    const scale = maxSize / longest
    const resize: ActionResize = {
      resize: { width: Math.round(geom.width * scale), height: Math.round(geom.height * scale) },
    }
    geom = await manipulateAsync(geom.uri, [resize], {
      compress: quality,
      format: SaveFormat.JPEG,
    })
  }

  // ── Stage 2: colour ────────────────────────────────────────────────────────
  if (isIdentityAdjust(adjust)) {
    return { uri: geom.uri, width: geom.width, height: geom.height }
  }

  const data = await Skia.Data.fromURI(geom.uri)
  const image = Skia.Image.MakeImageFromEncoded(data)
  if (!image) {
    // Colour stage failed to decode — fall back to the geometry-only result.
    return { uri: geom.uri, width: geom.width, height: geom.height }
  }

  const w = image.width()
  const h = image.height()
  const surface = Skia.Surface.MakeOffscreen(w, h)
  if (!surface) {
    return { uri: geom.uri, width: geom.width, height: geom.height }
  }

  const canvas = surface.getCanvas()
  const paint = Skia.Paint()
  paint.setAntiAlias(true)
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(adjustToMatrix(adjust)))
  canvas.drawImage(image, 0, 0, paint)
  surface.flush()

  const snapshot = surface.makeImageSnapshot()
  const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, Math.round(quality * 100))
  const outUri = `${FileSystem.cacheDirectory}th-edit-${Date.now()}-${bakeCounter++}.jpg`
  await FileSystem.writeAsStringAsync(outUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })

  return { uri: outUri, width: w, height: h }
}

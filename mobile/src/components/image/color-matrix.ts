// Pure colour-matrix math for the image editor. Produces a Skia-compatible 4×5
// colour matrix (20 numbers, row-major, RGBA) from a small set of human
// adjustments. Framework-agnostic so it can be unit-tested and reused by both
// the live preview (<ColorMatrix>) and the offscreen bake.

export interface ImageAdjust {
  /** -1 … 1 (0 = none). Added to each RGB channel. */
  brightness: number
  /** 0 … 2 (1 = none). Multiplier around the 0.5 mid-point. */
  contrast: number
  /** 0 … 2 (1 = none). 0 = greyscale, 2 = vivid. */
  saturation: number
  /** -1 … 1 (0 = none). + warms (more red, less blue), − cools. */
  warmth: number
}

export const IDENTITY_ADJUST: ImageAdjust = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  warmth: 0,
}

export function isIdentityAdjust(a: ImageAdjust): boolean {
  return (
    Math.abs(a.brightness) < 1e-3 &&
    Math.abs(a.contrast - 1) < 1e-3 &&
    Math.abs(a.saturation - 1) < 1e-3 &&
    Math.abs(a.warmth) < 1e-3
  )
}

// A 4×5 matrix as a flat 20-length array (Skia / Android ColorMatrix order).
export type ColorMatrix = number[]

const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
]

// Multiply two 4×5 matrices (treated as 5×5 with an implicit [0,0,0,0,1] row).
function multiply(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out = new Array<number>(20).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[row * 5 + k] * b[k * 5 + col]
      // The implicit 5th row of `b` is [0,0,0,0,1]; it only contributes to the
      // last (translation) column.
      if (col === 4) sum += a[row * 5 + 4]
      out[row * 5 + col] = sum
    }
  }
  return out
}

function saturationMatrix(s: number): ColorMatrix {
  // Rec.709 luma weights — luminance-preserving saturation.
  const lr = 0.2126
  const lg = 0.7152
  const lb = 0.0722
  const sr = (1 - s) * lr
  const sg = (1 - s) * lg
  const sb = (1 - s) * lb
  return [
    sr + s, sg, sb, 0, 0,
    sr, sg + s, sb, 0, 0,
    sr, sg, sb + s, 0, 0,
    0, 0, 0, 1, 0,
  ]
}

function contrastMatrix(c: number): ColorMatrix {
  // Scale around the 0.5 mid-point so mid-greys stay put.
  const t = 0.5 * (1 - c)
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ]
}

// Brightness (uniform add) combined with warmth (push red up / blue down).
function brightnessWarmthMatrix(b: number, w: number): ColorMatrix {
  const warm = w * 0.25
  return [
    1, 0, 0, 0, b + warm,
    0, 1, 0, 0, b,
    0, 0, 1, 0, b - warm,
    0, 0, 0, 1, 0,
  ]
}

/** Compose the adjustments into a single 4×5 colour matrix. */
export function adjustToMatrix(a: ImageAdjust): ColorMatrix {
  if (isIdentityAdjust(a)) return IDENTITY.slice()
  let m = saturationMatrix(a.saturation)
  m = multiply(contrastMatrix(a.contrast), m)
  m = multiply(brightnessWarmthMatrix(a.brightness, a.warmth), m)
  return m
}

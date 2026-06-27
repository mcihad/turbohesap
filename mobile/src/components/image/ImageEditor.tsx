// ImageEditor — a full-screen, theme-aware photo editor used before upload.
// Three tools: Kırp (aspect-ratio crop frame), Döndür (90° rotate + flip), Renk
// (live brightness/contrast/saturation/warmth via a Skia colour matrix). The
// colour adjustment is previewed on-GPU through <ColorMatrix> and baked through
// an offscreen Skia surface on apply (see edit-image.ts). No gesture-handler
// dependency — the crop is aspect-preset based.

import * as React from 'react'
import {
  ActivityIndicator,
  LayoutRectangle,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Canvas, ColorMatrix, Image as SkiaImage, useImage } from '@shopify/react-native-skia'

import { Button, Icon, type IconName, SegmentedControl, Text } from '..'
import { Slider } from '../Slider'
import { useTheme } from '../../theme/theme-context'
import { adjustToMatrix, IDENTITY_ADJUST, type ImageAdjust } from './color-matrix'
import { bakeImage, type BakedImage, type CropRect } from './edit-image'

type Tool = 'crop' | 'rotate' | 'color'

interface AspectOption {
  id: string
  label: string
  /** width / height, or null for the original ratio. */
  ratio: number | null
}

const ASPECTS: AspectOption[] = [
  { id: 'free', label: 'Orijinal', ratio: null },
  { id: '1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
]

export function ImageEditor({
  visible,
  uri,
  onCancel,
  onDone,
}: {
  visible: boolean
  uri: string | null
  onCancel: () => void
  onDone: (baked: BakedImage) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const image = useImage(uri ?? undefined)

  const [tool, setTool] = React.useState<Tool>('crop')
  const [rotate, setRotate] = React.useState(0)
  const [flipH, setFlipH] = React.useState(false)
  const [flipV, setFlipV] = React.useState(false)
  const [aspectId, setAspectId] = React.useState('free')
  const [adjust, setAdjust] = React.useState<ImageAdjust>(IDENTITY_ADJUST)
  const [box, setBox] = React.useState<LayoutRectangle | null>(null)
  const [baking, setBaking] = React.useState(false)

  // Reset all edits whenever a new image is opened.
  React.useEffect(() => {
    if (visible) {
      setTool('crop')
      setRotate(0)
      setFlipH(false)
      setFlipV(false)
      setAspectId('free')
      setAdjust(IDENTITY_ADJUST)
    }
  }, [visible, uri])

  const aspect = ASPECTS.find((a) => a.id === aspectId)?.ratio ?? null
  const matrix = React.useMemo(() => adjustToMatrix(adjust), [adjust])

  const onApply = async () => {
    if (!uri || !image) return
    setBaking(true)
    try {
      // Oriented dimensions (a 90/270° turn swaps width/height).
      const turned = rotate % 180 !== 0
      const ow = turned ? image.height() : image.width()
      const oh = turned ? image.width() : image.height()
      const crop = centeredCrop(ow, oh, aspect)
      const baked = await bakeImage({ uri, rotate, flipH, flipV, crop, adjust })
      onDone(baked)
    } finally {
      setBaking(false)
    }
  }

  // Crop guide overlay sized to the chosen aspect, centred over the preview.
  const guide = box && aspect ? fitRect(box.width, box.height, aspect) : null

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        {/* Top bar */}
        <View style={topBar}>
          <Pressable onPress={onCancel} hitSlop={10} style={{ padding: 6 }}>
            <Icon name="x" size={24} color="#fff" />
          </Pressable>
          <Text variant="title" weight="semibold" style={{ color: '#fff' }}>
            Görseli düzenle
          </Text>
          <Pressable onPress={onApply} hitSlop={10} disabled={baking} style={{ padding: 6 }}>
            {baking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Icon name="check" size={24} color={t.colors.primary} />
            )}
          </Pressable>
        </View>

        {/* Preview */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          onLayout={(e) => setBox(e.nativeEvent.layout)}
        >
          {!image || !box ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View
              style={{
                width: box.width,
                height: box.height,
                transform: [
                  { rotate: `${rotate}deg` },
                  { scaleX: flipH ? -1 : 1 },
                  { scaleY: flipV ? -1 : 1 },
                ],
              }}
            >
              <Canvas style={{ width: box.width, height: box.height }}>
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={box.width}
                  height={box.height}
                  fit="contain"
                >
                  <ColorMatrix matrix={matrix} />
                </SkiaImage>
              </Canvas>
            </View>
          )}

          {/* Crop frame guide (screen space) */}
          {guide ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: guide.width,
                height: guide.height,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.9)',
                borderRadius: 2,
              }}
            >
              <GridLines />
            </View>
          ) : null}
        </View>

        {/* Tool panel */}
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[4],
            paddingBottom: insets.bottom + t.spacing[3],
          }}
        >
          <View style={{ paddingHorizontal: t.spacing[5], minHeight: 132 }}>
            {tool === 'crop' ? (
              <ToolBlock title="Oran">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
                  {ASPECTS.map((a) => (
                    <Button
                      key={a.id}
                      title={a.label}
                      size="sm"
                      variant={aspectId === a.id ? 'default' : 'outline'}
                      onPress={() => setAspectId(a.id)}
                    />
                  ))}
                </View>
                <Text variant="caption" tone="muted" style={{ marginTop: t.spacing[2] }}>
                  Seçilen orana göre merkezden kırpılır.
                </Text>
              </ToolBlock>
            ) : null}

            {tool === 'rotate' ? (
              <ToolBlock title="Döndür & Çevir">
                <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                  <RotChip icon="rotate-ccw" label="Sol" onPress={() => setRotate((r) => (r + 270) % 360)} />
                  <RotChip icon="rotate-cw" label="Sağ" onPress={() => setRotate((r) => (r + 90) % 360)} />
                  <RotChip icon="repeat" label="Yatay" active={flipH} onPress={() => setFlipH((v) => !v)} />
                  <RotChip
                    icon="repeat"
                    label="Dikey"
                    active={flipV}
                    rotated
                    onPress={() => setFlipV((v) => !v)}
                  />
                </View>
              </ToolBlock>
            ) : null}

            {tool === 'color' ? (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                <AdjustRow
                  label="Parlaklık"
                  value={adjust.brightness}
                  min={-0.5}
                  max={0.5}
                  onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
                />
                <AdjustRow
                  label="Kontrast"
                  value={adjust.contrast}
                  min={0.5}
                  max={1.5}
                  onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
                />
                <AdjustRow
                  label="Doygunluk"
                  value={adjust.saturation}
                  min={0}
                  max={2}
                  onChange={(v) => setAdjust((a) => ({ ...a, saturation: v }))}
                />
                <AdjustRow
                  label="Sıcaklık"
                  value={adjust.warmth}
                  min={-1}
                  max={1}
                  onChange={(v) => setAdjust((a) => ({ ...a, warmth: v }))}
                />
                <Pressable
                  onPress={() => setAdjust(IDENTITY_ADJUST)}
                  style={{ alignSelf: 'flex-start', paddingVertical: t.spacing[1] }}
                >
                  <Text variant="caption" tone="primary">
                    Renkleri sıfırla
                  </Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>

          {/* Tool switcher */}
          <View style={{ paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3] }}>
            <SegmentedControl<Tool>
              value={tool}
              onChange={setTool}
              options={[
                { value: 'crop', label: 'Kırp' },
                { value: 'rotate', label: 'Döndür' },
                { value: 'color', label: 'Renk' },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Largest rect of `ratio` (w/h) centred in a box. */
function fitRect(boxW: number, boxH: number, ratio: number) {
  let w = boxW
  let h = w / ratio
  if (h > boxH) {
    h = boxH
    w = h * ratio
  }
  return { width: w, height: h }
}

/** Centred crop rect (in pixels) for an aspect, or null for no crop. */
function centeredCrop(w: number, h: number, ratio: number | null): CropRect | null {
  if (!ratio) return null
  const { width, height } = fitRect(w, h, ratio)
  return {
    originX: Math.round((w - width) / 2),
    originY: Math.round((h - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  }
}

const topBar = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingHorizontal: 14,
  paddingVertical: 10,
}

function ToolBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[2] }}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  )
}

function RotChip({
  icon,
  label,
  active,
  rotated,
  onPress,
}: {
  icon: IconName
  label: string
  active?: boolean
  rotated?: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: t.spacing[3],
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: active ? t.colors.primary : t.colors.border,
        backgroundColor: active ? t.colors.primarySoft : t.colors.card,
      }}
    >
      <View style={{ transform: rotated ? [{ rotate: '90deg' }] : undefined }}>
        <Icon name={icon} size={20} color={active ? t.colors.primary : t.colors.foreground} />
      </View>
      <Text variant="caption" tone={active ? 'primary' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  )
}

function AdjustRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const t = useTheme()
  return (
    <View style={{ marginBottom: t.spacing[2] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" tone="muted">
          {value.toFixed(2)}
        </Text>
      </View>
      <Slider value={value} min={min} max={max} onChange={onChange} />
    </View>
  )
}

function GridLines() {
  return (
    <>
      {[1, 2].map((i) => (
        <View
          key={`v${i}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(i * 100) / 3}%`,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.35)',
          }}
        />
      ))}
      {[1, 2].map((i) => (
        <View
          key={`h${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(i * 100) / 3}%`,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.35)',
          }}
        />
      ))}
    </>
  )
}

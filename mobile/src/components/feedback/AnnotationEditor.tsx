// AnnotationEditor — a full-screen markup tool over the captured screenshot.
// Renders the Skia image + freehand strokes in a <Canvas>; touches are collected
// via a dependency-free RN PanResponder (no react-native-gesture-handler). Tools:
// pen (Çiz) with colour + 3 widths, text (Metin) placed by tapping, undo, clear.
// On save it flattens everything to a PNG via bakeAnnotated() and returns the uri.

import * as React from 'react'
import {
  ActivityIndicator,
  type LayoutRectangle,
  Modal,
  PanResponder,
  Pressable,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Canvas, Image as SkiaImage, Path, type SkImage } from '@shopify/react-native-skia'

import { Icon, SegmentedControl, Text } from '..'
import { useTheme } from '../../theme/theme-context'
import {
  type Annotation,
  bakeAnnotated,
  pointsToPath,
  type Point,
  type StrokeAnnotation,
} from './annotate'

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#FFFFFF', '#111827']
const WIDTHS = [3, 6, 11]

type Mode = 'draw' | 'text'

/** Fit (w/h preserving aspect) inside a box. */
function fitInto(boxW: number, boxH: number, aspect: number) {
  let w = boxW
  let h = w / aspect
  if (h > boxH) {
    h = boxH
    w = h * aspect
  }
  return { width: w, height: h }
}

export function AnnotationEditor({
  visible,
  image,
  onCancel,
  onDone,
}: {
  visible: boolean
  image: SkImage | null
  onCancel: () => void
  onDone: (uri: string) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  const [anns, setAnns] = React.useState<Annotation[]>([])
  const [current, setCurrent] = React.useState<StrokeAnnotation | null>(null)
  const [mode, setMode] = React.useState<Mode>('draw')
  const [color, setColor] = React.useState(COLORS[0])
  const [width, setWidth] = React.useState(WIDTHS[1])
  const [text, setText] = React.useState('')
  const [box, setBox] = React.useState<LayoutRectangle | null>(null)
  const [baking, setBaking] = React.useState(false)

  // Reset whenever a fresh image is opened.
  React.useEffect(() => {
    if (visible) {
      setAnns([])
      setCurrent(null)
      setMode('draw')
      setColor(COLORS[0])
      setWidth(WIDTHS[1])
      setText('')
    }
  }, [visible, image])

  // Live config read by the (stable) PanResponder via refs to avoid stale closures.
  const cfg = React.useRef({ mode, color, width, text })
  cfg.current = { mode, color, width, text }

  const responder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent
        if (cfg.current.mode === 'draw') {
          setCurrent({ type: 'stroke', color: cfg.current.color, width: cfg.current.width, points: [{ x, y }] })
        }
      },
      onPanResponderMove: (e) => {
        if (cfg.current.mode !== 'draw') return
        const { locationX: x, locationY: y } = e.nativeEvent
        setCurrent((c) => (c ? { ...c, points: [...c.points, { x, y }] } : c))
      },
      onPanResponderRelease: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent
        if (cfg.current.mode === 'draw') {
          setCurrent((c) => {
            if (c) setAnns((a) => [...a, c])
            return null
          })
        } else {
          const value = cfg.current.text.trim()
          if (value) {
            setAnns((a) => [
              ...a,
              { type: 'text', color: cfg.current.color, size: 22, x, y, text: value },
            ])
          }
        }
      },
    }),
  ).current

  const disp = React.useMemo(() => {
    if (!image || !box) return null
    return fitInto(box.width, box.height, image.width() / image.height())
  }, [image, box])

  const undo = () => setAnns((a) => a.slice(0, -1))
  const clear = () => {
    setAnns([])
    setCurrent(null)
  }

  const onSave = async () => {
    if (!image || !disp) return
    setBaking(true)
    try {
      const uri = await bakeAnnotated(image, anns, disp.width, disp.height)
      onDone(uri)
    } finally {
      setBaking(false)
    }
  }

  const strokes = React.useMemo(
    () => [...anns.filter((a): a is StrokeAnnotation => a.type === 'stroke'), ...(current ? [current] : [])],
    [anns, current],
  )
  const texts = anns.filter((a) => a.type === 'text') as Extract<Annotation, { type: 'text' }>[]

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Pressable onPress={onCancel} hitSlop={10} style={{ padding: 6 }}>
            <Icon name="x" size={24} color="#fff" />
          </Pressable>
          <Text variant="title" weight="semibold" style={{ color: '#fff' }}>
            İşaretle
          </Text>
          <Pressable onPress={onSave} hitSlop={10} disabled={baking} style={{ padding: 6 }}>
            {baking ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={24} color={t.colors.primary} />}
          </Pressable>
        </View>

        {/* Canvas */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          onLayout={(e) => setBox(e.nativeEvent.layout)}
        >
          {!image || !disp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ width: disp.width, height: disp.height }} {...responder.panHandlers}>
              <Canvas style={{ width: disp.width, height: disp.height }}>
                <SkiaImage image={image} x={0} y={0} width={disp.width} height={disp.height} fit="fill" />
                {strokes.map((s, i) => (
                  <Path
                    key={i}
                    path={pointsToPath(s.points)}
                    color={s.color}
                    style="stroke"
                    strokeWidth={s.width}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                ))}
              </Canvas>
              {/* Text overlays (baked separately on save). */}
              {texts.map((tx, i) => (
                <Text
                  key={i}
                  style={{
                    position: 'absolute',
                    left: tx.x,
                    top: tx.y - tx.size,
                    color: tx.color,
                    fontSize: tx.size,
                    fontWeight: '700',
                  }}
                >
                  {tx.text}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Tool panel */}
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[4],
            paddingHorizontal: t.spacing[5],
            paddingBottom: insets.bottom + t.spacing[3],
            gap: t.spacing[3],
          }}
        >
          {/* Colours + widths */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 1,
                    borderColor: color === c ? t.colors.primary : t.colors.border,
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
              {WIDTHS.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setWidth(w)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: t.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: width === w ? t.colors.primary : t.colors.border,
                    backgroundColor: width === w ? t.colors.primarySoft : t.colors.card,
                  }}
                >
                  <View style={{ width: w + 2, height: w + 2, borderRadius: (w + 2) / 2, backgroundColor: t.colors.foreground }} />
                </Pressable>
              ))}
            </View>
          </View>

          {mode === 'text' ? (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Metin yazın, ardından görsele dokunun"
              placeholderTextColor={t.colors.mutedForeground}
              style={{
                height: 44,
                paddingHorizontal: t.spacing[3.5],
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.inputBorder,
                backgroundColor: t.colors.card,
                color: t.colors.foreground,
              }}
            />
          ) : null}

          {/* Mode + actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <View style={{ flex: 1 }}>
              <SegmentedControl<Mode>
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'draw', label: 'Çiz' },
                  { value: 'text', label: 'Metin' },
                ]}
              />
            </View>
            <ToolBtn icon="rotate-ccw" onPress={undo} disabled={anns.length === 0} />
            <ToolBtn icon="trash-2" onPress={clear} disabled={anns.length === 0 && !current} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ToolBtn({ icon, onPress, disabled }: { icon: 'rotate-ccw' | 'trash-2'; onPress: () => void; disabled?: boolean }) {
  const t = useTheme()
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.card,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={20} color={t.colors.foreground} />
    </Pressable>
  )
}

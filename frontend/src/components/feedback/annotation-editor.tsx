import * as React from 'react'
import {
  ArrowUpRight,
  Check,
  Highlighter,
  Pencil,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { canvasToFile } from './lib/capture'

type Tool = 'pen' | 'arrow' | 'rect' | 'text' | 'highlighter'

interface Pt {
  x: number
  y: number
}

type Shape =
  | { type: 'pen'; color: string; width: number; points: Pt[] }
  | { type: 'highlighter'; color: string; width: number; points: Pt[] }
  | { type: 'arrow'; color: string; width: number; from: Pt; to: Pt }
  | { type: 'rect'; color: string; width: number; from: Pt; to: Pt }
  | { type: 'text'; color: string; size: number; at: Pt; text: string }

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827', '#ffffff']

const TOOLS: { id: Tool; icon: typeof Pencil; label: string }[] = [
  { id: 'pen', icon: Pencil, label: 'Kalem' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Ok' },
  { id: 'rect', icon: Square, label: 'Dikdörtgen' },
  { id: 'highlighter', icon: Highlighter, label: 'Vurgulayıcı' },
  { id: 'text', icon: Type, label: 'Metin' },
]

/**
 * Fullscreen image annotation editor. Renders the captured screenshot on a
 * canvas and lets the user draw with pen/arrow/rect/highlighter/text in a chosen
 * colour, undo, or clear. On save the canvas (base image + shapes) is flattened
 * to a PNG `File` and returned via `onSave`.
 */
export function AnnotationEditor({
  imageSrc,
  onSave,
  onCancel,
}: {
  imageSrc: string
  onSave: (file: File, dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const imgRef = React.useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = React.useState(false)

  const [tool, setTool] = React.useState<Tool>('pen')
  const [color, setColor] = React.useState(COLORS[0])
  const [shapes, setShapes] = React.useState<Shape[]>([])
  const draftRef = React.useRef<Shape | null>(null)
  const drawingRef = React.useRef(false)
  const [textDraft, setTextDraft] = React.useState<{ at: Pt; value: string } | null>(null)

  // Load the base image once.
  React.useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
      }
      setReady(true)
    }
    img.src = imageSrc
  }, [imageSrc])

  // Redraw whenever shapes change (the draft is drawn imperatively during a drag
  // via a forced render, see `paint`).
  const paint = React.useCallback(
    (draft?: Shape | null) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      for (const s of shapes) drawShape(ctx, s)
      if (draft) drawShape(ctx, draft)
    },
    [shapes],
  )

  React.useEffect(() => {
    if (ready) paint(draftRef.current)
  }, [ready, shapes, paint])

  // Map a pointer event to canvas (image) coordinates.
  const toCanvas = (e: React.PointerEvent): Pt => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const width = scaleWidth(canvasRef.current)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready || textDraft) return
    const at = toCanvas(e)
    if (tool === 'text') {
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    if (tool === 'pen') draftRef.current = { type: 'pen', color, width, points: [at] }
    else if (tool === 'highlighter')
      draftRef.current = { type: 'highlighter', color, width: width * 5, points: [at] }
    else if (tool === 'arrow')
      draftRef.current = { type: 'arrow', color, width, from: at, to: at }
    else draftRef.current = { type: 'rect', color, width, from: at, to: at }
    paint(draftRef.current)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const at = toCanvas(e)
    const d = draftRef.current
    if (!d) return
    if (d.type === 'pen' || d.type === 'highlighter') d.points.push(at)
    else if (d.type === 'arrow' || d.type === 'rect') d.to = at
    paint(d)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (tool === 'text') {
      if (!textDraft) {
        setTextDraft({ at: toCanvas(e), value: '' })
      }
      return
    }
    if (!drawingRef.current) return
    drawingRef.current = false
    const d = draftRef.current
    draftRef.current = null
    if (d) setShapes((prev) => [...prev, d])
  }

  const commitText = () => {
    if (textDraft && textDraft.value.trim()) {
      setShapes((prev) => [
        ...prev,
        { type: 'text', color, size: width * 8, at: textDraft.at, text: textDraft.value },
      ])
    }
    setTextDraft(null)
  }

  const undo = () => setShapes((prev) => prev.slice(0, -1))
  const clear = () => setShapes([])

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(null)
    const file = await canvasToFile(canvas, 'feedback-screenshot.png')
    onSave(file, canvas.toDataURL('image/png'))
  }

  return (
    <div
      data-feedback-ignore
      className="fixed inset-0 z-[var(--app-z-overlay)] flex flex-col bg-black/85"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-neutral-900/95 px-3 py-2 text-white">
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {TOOLS.map((t) => (
            <ToolButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={tool === t.id}
              onClick={() => setTool(t.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Renk ${c}`}
              onClick={() => setColor(c)}
              className={cn(
                'size-6 rounded-full border border-white/30 transition-transform',
                color === c && 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label
            className="ml-1 grid size-6 cursor-pointer place-items-center rounded-full border border-white/30"
            title="Özel renk"
            style={{ backgroundColor: color }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-0 opacity-0"
            />
          </label>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          <ToolButton icon={Undo2} label="Geri al" onClick={undo} />
          <ToolButton icon={Trash2} label="Temizle" onClick={clear} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            <X className="size-4" />
            İptal
          </Button>
          <Button size="sm" onClick={() => void save()}>
            <Check className="size-4" />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Canvas surface */}
      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        <div className="relative mx-auto w-fit">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={cn(
              'max-w-full rounded-lg shadow-2xl',
              tool === 'text' ? 'cursor-text' : 'cursor-crosshair',
            )}
            style={{ touchAction: 'none' }}
          />
          {textDraft ? (
            <input
              autoFocus
              value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText()
                if (e.key === 'Escape') setTextDraft(null)
              }}
              placeholder="Metin yazın…"
              className="absolute rounded border-2 border-dashed bg-white/95 px-1 text-sm text-black outline-none"
              style={textInputStyle(canvasRef.current, textDraft.at, color)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Pencil
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/15 hover:text-white',
        active && 'bg-white/20 text-white',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

/** Line width relative to image size, so strokes look consistent across scales. */
function scaleWidth(canvas: HTMLCanvasElement | null): number {
  if (!canvas) return 3
  return Math.max(2, Math.round(canvas.width / 400))
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save()
  ctx.strokeStyle = s.type === 'text' ? s.color : s.color
  ctx.fillStyle = s.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.type === 'pen') {
    ctx.lineWidth = s.width
    strokePath(ctx, s.points)
  } else if (s.type === 'highlighter') {
    ctx.globalAlpha = 0.35
    ctx.lineWidth = s.width
    strokePath(ctx, s.points)
  } else if (s.type === 'rect') {
    ctx.lineWidth = s.width
    ctx.strokeRect(
      s.from.x,
      s.from.y,
      s.to.x - s.from.x,
      s.to.y - s.from.y,
    )
  } else if (s.type === 'arrow') {
    ctx.lineWidth = s.width
    drawArrow(ctx, s.from, s.to, s.width)
  } else if (s.type === 'text') {
    ctx.font = `600 ${s.size}px ui-sans-serif, system-ui, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(s.text, s.at.x, s.at.y)
  }
  ctx.restore()
}

function strokePath(ctx: CanvasRenderingContext2D, points: Pt[]) {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  if (points.length === 1) ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1)
  ctx.stroke()
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number) {
  const head = Math.max(10, width * 4)
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - head * Math.cos(angle - Math.PI / 6),
    to.y - head * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    to.x - head * Math.cos(angle + Math.PI / 6),
    to.y - head * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

/** Position the inline text input over the canvas at the click point. */
function textInputStyle(
  canvas: HTMLCanvasElement | null,
  at: Pt,
  color: string,
): React.CSSProperties {
  if (!canvas) return {}
  const ratio = canvas.clientWidth / canvas.width || 1
  return {
    left: at.x * ratio,
    top: at.y * ratio,
    borderColor: color,
    minWidth: 120,
  }
}

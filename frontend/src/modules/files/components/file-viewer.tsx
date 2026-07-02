import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  File as FileIcon,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'

import { type FileDto, toApiError } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/datetime'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/**
 * A standalone file/image viewer modal — top toolbar (zoom/rotate for images,
 * download, delete, fullscreen, close), a type-aware preview on the left
 * (image/PDF/fallback), and a metadata panel on the right. Needs only a
 * `FileDto` to work on its own; pass `files` (the entity's full list) to add
 * prev/next gallery navigation when opened from `FileManager` or similar.
 *
 * Fullscreen enlarges the dialog but keeps a visible margin + backdrop (a
 * maximized modal, not true edge-to-edge fullscreen).
 */
export function FileViewer({
  open,
  onOpenChange,
  file,
  files,
  onNavigate,
  canWrite = false,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileDto | null
  /** Optional sibling list (same entity) — enables prev/next navigation. */
  files?: FileDto[]
  /** Called with the file to show next, when the user navigates prev/next. */
  onNavigate?: (file: FileDto) => void
  /** Shows the delete action. */
  canWrite?: boolean
  /** Called after a successful delete (e.g. so the caller can also close). */
  onDeleted?: (file: FileDto) => void
}) {
  const qc = useQueryClient()
  const [fullscreen, setFullscreen] = React.useState(false)
  const [rotation, setRotation] = React.useState(0)
  const [zoom, setZoom] = React.useState(1)

  // Reset transient view state whenever the displayed file changes.
  React.useEffect(() => {
    setRotation(0)
    setZoom(1)
  }, [file?.id])

  const index = React.useMemo(
    () => (files && file ? files.findIndex((f) => f.id === file.id) : -1),
    [files, file],
  )
  const canPrev = !!files && index > 0
  const canNext = !!files && index >= 0 && index < files.length - 1
  const goPrev = React.useCallback(() => {
    if (files && canPrev) onNavigate?.(files[index - 1])
  }, [files, canPrev, index, onNavigate])
  const goNext = React.useCallback(() => {
    if (files && canNext) onNavigate?.(files[index + 1])
  }, [files, canNext, index, onNavigate])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, goPrev, goNext])

  const removeMutation = useMutation({
    mutationFn: (f: FileDto) => api.files.remove(f.id),
    onSuccess: (_data, f) => {
      toast.success('Dosya silindi')
      qc.invalidateQueries({ queryKey: ['files', f.entityType, f.entityId] })
      onDeleted?.(f)
      onOpenChange(false)
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  if (!file) return null
  const url = api.files.rawUrl(file.storedName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 sm:max-w-none',
          fullscreen
            ? 'inset-6 top-6 left-6 h-auto w-auto max-w-none translate-x-0 translate-y-0'
            : 'top-1/2 left-1/2 h-[min(85vh,720px)] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2',
        )}
      >
        <DialogTitle className="sr-only">{file.originalName}</DialogTitle>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-1 border-b bg-muted/30 px-3 py-2">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.originalName}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            {file.isImage ? (
              <>
                <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} title="Uzaklaştır">
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-10 text-center text-2xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} title="Yakınlaştır">
                  <ZoomIn className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setRotation((r) => r - 90)} title="Sola döndür">
                  <RotateCcw className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setRotation((r) => r + 90)} title="Sağa döndür">
                  <RotateCw className="size-4" />
                </Button>
              </>
            ) : null}
            <Button variant="ghost" size="icon-sm" asChild title="İndir">
              <a href={url} download={file.originalName} target="_blank" rel="noreferrer">
                <Download className="size-4" />
              </a>
            </Button>
            {canWrite ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                disabled={removeMutation.isPending}
                onClick={() => {
                  if (confirm(`"${file.originalName}" silinsin mi?`)) removeMutation.mutate(file)
                }}
                title="Sil"
              >
                {removeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            ) : null}
            <Button variant="ghost" size="icon-sm" onClick={() => setFullscreen((v) => !v)} title={fullscreen ? 'Küçült' : 'Tam ekran'}>
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} title="Kapat">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body: preview (left) + metadata (right) */}
        <div className="flex min-h-0 flex-1">
          {/* `overflow-auto` + flex-centering via `justify-content`/`align-items`
              can't be scrolled to reach content that overflows past the centered
              position (a well-known flex/overflow interaction) — center the
              child with its own `m-auto` instead, which degrades to 0 on the
              side that would overflow, so the full zoomed image stays reachable. */}
          <div className="relative flex min-w-0 flex-1 overflow-auto bg-muted/20 p-4">
            {files && files.length > 1 ? (
              <>
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={goPrev}
                  aria-label="Önceki dosya"
                  className="absolute top-1/2 left-2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-background/80 shadow-sm backdrop-blur focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={goNext}
                  aria-label="Sonraki dosya"
                  className="absolute top-1/2 right-2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-background/80 shadow-sm backdrop-blur focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            ) : null}
            <FilePreview file={file} url={url} rotation={rotation} zoom={zoom} />
          </div>

          <div className="w-64 shrink-0 space-y-4 overflow-y-auto border-l bg-card p-4">
            <MetaField label="Dosya adı" value={file.originalName} />
            <MetaField label="Tür" value={(file.extension || file.mimeType).toUpperCase()} />
            <MetaField label="Boyut" value={formatBytes(file.size)} />
            <MetaField label="Yüklendi" value={formatDateTime(file.createdAt)} />
            {file.updatedAt !== file.createdAt ? (
              <MetaField label="Güncellendi" value={formatDateTime(file.updatedAt)} />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FilePreview({
  file,
  url,
  rotation,
  zoom,
}: {
  file: FileDto
  url: string
  rotation: number
  zoom: number
}) {
  if (file.isImage) {
    // Zoom must grow the image's actual layout box (not just `transform:
    // scale`, which resizes visually but leaves the box — and therefore the
    // scroll container's overflow — untouched) so the container can scroll to
    // the parts that no longer fit. `m-auto` centers it while it fits and
    // degrades to 0 on the side that would overflow once it doesn't.
    return (
      <img
        src={url}
        alt={file.originalName}
        className={cn('m-auto transition-[width]', zoom === 1 && 'max-h-full max-w-full object-contain')}
        style={{
          transform: `rotate(${rotation}deg)`,
          width: zoom !== 1 ? `${zoom * 100}%` : undefined,
          height: zoom !== 1 ? 'auto' : undefined,
        }}
      />
    )
  }
  if (file.mimeType === 'application/pdf') {
    return <iframe src={url} title={file.originalName} className="size-full border-0" />
  }
  return (
    <div className="m-auto flex flex-col items-center gap-3 p-8 text-center">
      <FileIcon className="size-16 text-muted-foreground/50" />
      <p className="text-sm font-medium">{file.originalName}</p>
      <p className="text-xs text-muted-foreground">Bu dosya türü için önizleme yok.</p>
      <Button asChild size="sm" variant="outline">
        <a href={url} download={file.originalName} target="_blank" rel="noreferrer">
          <Download className="size-4" /> İndir
        </a>
      </Button>
    </div>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-sm break-words">{value}</p>
    </div>
  )
}

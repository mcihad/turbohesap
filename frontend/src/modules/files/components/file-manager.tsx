import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'

import { type FileDto, type FileKind, toApiError } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/datetime'
import { Badge } from '@/components/ui/badge'
import { FileViewer } from './file-viewer'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// A tinted file-type glyph keyed off the extension — gives the plain file list
// a quick visual read (pdf red, sheet green, archive amber, …).
function fileMeta(ext: string): { Icon: typeof FileText; className: string } {
  const e = ext.toLowerCase()
  if (['pdf'].includes(e)) return { Icon: FileText, className: 'bg-destructive/10 text-destructive' }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(e)) return { Icon: FileText, className: 'bg-info/10 text-info' }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return { Icon: FileSpreadsheet, className: 'bg-success/10 text-success' }
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(e)) return { Icon: FileArchive, className: 'bg-warning/10 text-warning' }
  if (['json', 'xml', 'html', 'js', 'ts', 'css', 'sql'].includes(e)) return { Icon: FileCode, className: 'bg-primary/10 text-primary' }
  return { Icon: FileIcon, className: 'bg-muted text-muted-foreground' }
}

// Generic media/file manager for any entity (polymorphic files API). `kind`
// switches the presentation: an image gallery (thumbnails, drag-to-reorder, cover
// badge) or a plain file list (download/delete). Both upload the same way.
export function FileManager({
  entityType,
  entityId,
  kind,
  canWrite,
  emptyHint,
}: {
  entityType: string
  entityId: string
  kind: FileKind
  canWrite: boolean
  emptyHint?: string
}) {
  const qc = useQueryClient()
  const key = ['files', entityType, entityId] as const
  const query = useQuery({
    queryKey: key,
    queryFn: () => api.files.list(entityType, entityId),
    enabled: !!entityId,
  })
  const items = (query.data ?? []).filter((f) => (kind === 'image' ? f.isImage : !f.isImage))
  const invalidate = () => qc.invalidateQueries({ queryKey: key })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const fd = new FormData()
      for (const f of files) fd.append('files', f)
      fd.append('entityType', entityType)
      fd.append('entityId', entityId)
      fd.append('kind', kind)
      fd.append('sortOrder', String(items.length))
      await api.files.upload(fd)
    },
    onSuccess: () => { toast.success(kind === 'image' ? 'Görsel yüklendi' : 'Dosya yüklendi'); invalidate() },
    onError: (e) => toast.error('Yükleme başarısız', { description: toApiError(e).message }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.files.remove(id),
    onSuccess: invalidate,
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const reorder = useMutation({
    mutationFn: async (ordered: FileDto[]) => {
      await Promise.all(
        ordered.map((f, i) => (f.sortOrder === i ? null : api.files.update(f.id, { sortOrder: i }))).filter(Boolean) as Promise<unknown>[],
      )
    },
    onSuccess: invalidate,
    onError: (e) => toast.error('Sıralama başarısız', { description: toApiError(e).message }),
  })

  const inputRef = React.useRef<HTMLInputElement>(null)
  const pick = () => inputRef.current?.click()
  const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) upload.mutate(files)
    e.target.value = ''
  }

  // Drag-to-upload + (images) drag-to-reorder.
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dropActive, setDropActive] = React.useState(false)
  const onDropFiles = (e: React.DragEvent) => {
    setDropActive(false)
    if (!canWrite) return
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length) {
      e.preventDefault()
      upload.mutate(files)
    }
  }
  const moveBefore = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const ids = items.map((f) => f.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    reorder.mutate(next)
  }
  const makeCover = (id: string) => {
    const next = [items.find((f) => f.id === id)!, ...items.filter((f) => f.id !== id)]
    reorder.mutate(next)
  }

  const busy = upload.isPending
  const [viewing, setViewing] = React.useState<FileDto | null>(null)

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" multiple accept={kind === 'image' ? 'image/*' : undefined} className="hidden" onChange={onPicked} />

      {canWrite ? (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          onDragOver={(e) => { e.preventDefault(); if (!dropActive) setDropActive(true) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false) }}
          onDrop={onDropFiles}
          className={cn(
            'group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors outline-none',
            'hover:border-primary/50 hover:bg-primary/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/50',
            dropActive && 'border-primary bg-primary/[0.06]',
            busy && 'pointer-events-none opacity-70',
          )}
        >
          <span
            className={cn(
              'grid size-11 place-items-center rounded-full bg-background text-muted-foreground shadow-xs transition-colors',
              'group-hover:text-primary',
              dropActive && 'text-primary',
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : dropActive ? (
              <UploadCloud className="size-5" />
            ) : kind === 'image' ? (
              <ImagePlus className="size-5" />
            ) : (
              <Upload className="size-5" />
            )}
          </span>
          <span className="text-sm font-medium text-foreground">
            {busy
              ? (kind === 'image' ? 'Görsel yükleniyor…' : 'Dosya yükleniyor…')
              : dropActive
                ? 'Bırakın, yüklensin'
                : (kind === 'image' ? 'Görselleri buraya bırakın' : 'Dosyaları buraya bırakın')}
          </span>
          <span className="text-2xs text-muted-foreground">
            ya da <span className="font-medium text-primary">bilgisayardan seçin</span>
            {kind === 'image' ? ' · JPG, PNG, WebP' : ''}
          </span>
        </button>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          {emptyHint ?? (kind === 'image' ? 'Henüz görsel yok.' : 'Henüz dosya yok.')}
        </p>
      ) : kind === 'image' ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((f, i) => (
            <div
              key={f.id}
              draggable={canWrite}
              onDragStart={() => setDragId(f.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => { if (dragId) e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); moveBefore(f.id) }}
              onClick={() => setViewing(f)}
              className={cn(
                'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted',
                dragId === f.id && 'opacity-50',
                canWrite && 'cursor-move',
              )}
            >
              <img src={api.files.rawUrl(f.storedName)} alt={f.originalName} className="size-full object-cover" />
              {i === 0 ? (
                <Badge className="absolute top-1 left-1 gap-1 px-1.5 py-0 text-2xs"><Star className="size-2.5" />Kapak</Badge>
              ) : null}
              {canWrite ? (
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); makeCover(f.id) }} title="Kapak yap" className="grid size-6 place-items-center rounded-md bg-white/85 text-foreground hover:bg-white">
                      <Star className="size-3.5" />
                    </button>
                  ) : null}
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove.mutate(f.id) }} title="Sil" className="grid size-6 place-items-center rounded-md bg-white/85 text-destructive hover:bg-white">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((f) => {
            const { Icon, className } = fileMeta(f.extension)
            return (
              <div
                key={f.id}
                onClick={() => setViewing(f)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/40"
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', className)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.originalName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                    <span className="rounded bg-muted px-1 py-0.5 font-medium uppercase">{f.extension || 'dosya'}</span>
                    {formatBytes(f.size)}
                    <span className="text-muted-foreground/50">·</span>
                    {formatRelative(f.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <a
                    href={api.files.rawUrl(f.storedName)}
                    download={f.originalName}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    title="İndir"
                  >
                    <Download className="size-4" />
                  </a>
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove.mutate(f.id) }}
                      className="grid size-8 place-items-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                      title="Sil"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FileViewer
        open={!!viewing}
        onOpenChange={(o) => { if (!o) setViewing(null) }}
        file={viewing}
        files={items}
        onNavigate={setViewing}
        canWrite={canWrite}
        onDeleted={() => setViewing(null)}
      />
    </div>
  )
}

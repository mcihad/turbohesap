import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { type FileDto, type FileKind, toApiError } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
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
  const onDropFiles = (e: React.DragEvent) => {
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

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" multiple accept={kind === 'image' ? 'image/*' : undefined} className="hidden" onChange={onPicked} />

      {canWrite ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropFiles}
          className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {kind === 'image' ? <ImagePlus className="size-4" /> : <Upload className="size-4" />}
            <span>{kind === 'image' ? 'Görselleri sürükleyin ya da seçin' : 'Dosyaları sürükleyin ya da seçin'}</span>
          </div>
          <Button size="sm" variant="outline" onClick={pick} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Seç
          </Button>
        </div>
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
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border bg-muted',
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
                    <button type="button" onClick={() => makeCover(f.id)} title="Kapak yap" className="grid size-6 place-items-center rounded-md bg-white/85 text-foreground hover:bg-white">
                      <Star className="size-3.5" />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => remove.mutate(f.id)} title="Sil" className="grid size-6 place-items-center rounded-md bg-white/85 text-destructive hover:bg-white">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.originalName}</p>
                <p className="text-2xs text-muted-foreground uppercase">{f.extension || f.mimeType} · {formatBytes(f.size)}</p>
              </div>
              <a href={api.files.rawUrl(f.storedName)} download={f.originalName} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent" title="İndir">
                <Download className="size-4" />
              </a>
              {canWrite ? (
                <button type="button" onClick={() => remove.mutate(f.id)} className="grid size-8 place-items-center rounded-md text-destructive hover:bg-accent" title="Sil">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ImageManager — the reusable, polymorphic image gallery for any entity
// (product, variant, category…). Mirrors the web FileManager: a thumbnail grid
// with add (camera/library → edit → upload), set-cover, reorder and delete, and
// tap-to-view full screen. The editing pipeline (crop/rotate/colour) runs in
// <ImageEditor>; uploads go through the shared files API.

import * as React from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native'
import { Image } from 'expo-image'

import type { FileDto } from '@turbohesap/shared'

import { Button, Icon, type IconName, Text } from '..'
import { api } from '../../lib/api'
import { useTheme } from '../../theme/theme-context'
import { ImageEditor } from './ImageEditor'
import { ImageViewer } from './ImageViewer'
import { imageUrl, uploadImage, useEntityImages } from './image-files'
import { pickFromCamera, pickFromLibrary } from './pick-image'
import type { BakedImage } from './edit-image'

export function ImageManager({
  entityType,
  entityId,
  canWrite,
  title,
  columns = 3,
  layout = 'grid',
}: {
  entityType: string
  entityId: string | null | undefined
  canWrite: boolean
  title?: string
  columns?: number
  /** 'grid' wraps tiles by `columns`; 'strip' is a compact horizontal scroller. */
  layout?: 'grid' | 'strip'
}) {
  const t = useTheme()
  const { images, loading, refetch } = useEntityImages(entityType, entityId)

  const [editUri, setEditUri] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [sourceOpen, setSourceOpen] = React.useState(false)
  const [actionFor, setActionFor] = React.useState<FileDto | null>(null)
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null)

  const urls = React.useMemo(() => images.map(imageUrl), [images])

  // ── add flow ────────────────────────────────────────────────────────────────
  const startPick = async (from: 'camera' | 'library') => {
    setSourceOpen(false)
    const uri = from === 'camera' ? await pickFromCamera() : await pickFromLibrary()
    if (uri) setEditUri(uri)
  }

  const onEdited = async (baked: BakedImage) => {
    setEditUri(null)
    if (!entityId) return
    setBusy(true)
    try {
      await uploadImage({ entityType, entityId, uri: baked.uri, sortOrder: images.length })
      refetch()
    } finally {
      setBusy(false)
    }
  }

  // ── per-image actions ─────────────────────────────────────────────────────────
  const persistOrder = async (ordered: FileDto[]) => {
    setBusy(true)
    try {
      await Promise.all(
        ordered
          .map((f, i) => (f.sortOrder === i ? null : api.files.update(f.id, { sortOrder: i })))
          .filter(Boolean) as Promise<unknown>[],
      )
      refetch()
    } finally {
      setBusy(false)
    }
  }

  const move = (file: FileDto, dir: -1 | 1) => {
    const i = images.findIndex((f) => f.id === file.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= images.length) return
    const next = images.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    void persistOrder(next)
  }

  const makeCover = (file: FileDto) => {
    const next = [file, ...images.filter((f) => f.id !== file.id)]
    void persistOrder(next)
  }

  const remove = async (file: FileDto) => {
    setBusy(true)
    try {
      await api.files.remove(file.id)
      refetch()
    } finally {
      setBusy(false)
    }
  }

  const gap = t.spacing[2]
  const noEntity = !entityId
  const strip = layout === 'strip'
  const tileWidth: number | `${number}%` = strip ? 104 : `${100 / columns}%`

  const tiles = (
    <>
      {images.map((file, i) => (
        <Thumb
          key={file.id}
          url={urls[i]}
          cover={i === 0}
          width={tileWidth}
          gap={gap}
          onPress={() => setViewerIndex(i)}
          onMenu={canWrite ? () => setActionFor(file) : undefined}
        />
      ))}

      {canWrite ? (
        <AddTile
          width={tileWidth}
          gap={gap}
          disabled={noEntity || busy}
          onPress={() => setSourceOpen(true)}
        />
      ) : null}

      {!canWrite && images.length === 0 ? (
        <Text variant="caption" tone="muted">
          Görsel yok.
        </Text>
      ) : null}
    </>
  )

  return (
    <View style={{ gap: t.spacing[3] }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="overline" tone="muted">
            {title}
          </Text>
          {busy ? <ActivityIndicator size="small" color={t.colors.primary} /> : null}
        </View>
      ) : null}

      {loading ? (
        <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      ) : strip ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>{tiles}</View>
        </ScrollView>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{tiles}</View>
      )}

      {noEntity ? (
        <Text variant="caption" tone="muted">
          Görsel eklemek için önce kaydedin.
        </Text>
      ) : null}

      {/* source picker */}
      <Sheet open={sourceOpen} onClose={() => setSourceOpen(false)} title="Görsel ekle">
        <SheetAction icon="camera" label="Kamera" onPress={() => void startPick('camera')} />
        <SheetAction icon="image" label="Galeriden seç" onPress={() => void startPick('library')} />
      </Sheet>

      {/* per-image actions */}
      <Sheet open={!!actionFor} onClose={() => setActionFor(null)} title="Görsel">
        <SheetAction
          icon="star"
          label="Kapak yap"
          onPress={() => {
            if (actionFor) makeCover(actionFor)
            setActionFor(null)
          }}
        />
        <SheetAction
          icon="chevron-left"
          label="Sola taşı"
          onPress={() => {
            if (actionFor) move(actionFor, -1)
            setActionFor(null)
          }}
        />
        <SheetAction
          icon="chevron-right"
          label="Sağa taşı"
          onPress={() => {
            if (actionFor) move(actionFor, 1)
            setActionFor(null)
          }}
        />
        <SheetAction
          icon="trash-2"
          label="Sil"
          destructive
          onPress={() => {
            const f = actionFor
            setActionFor(null)
            if (f) void remove(f)
          }}
        />
      </Sheet>

      <ImageEditor
        visible={!!editUri}
        uri={editUri}
        onCancel={() => setEditUri(null)}
        onDone={(b) => void onEdited(b)}
      />

      <ImageViewer
        visible={viewerIndex !== null}
        urls={urls}
        index={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  )
}

// ── pieces ──────────────────────────────────────────────────────────────────────

function Thumb({
  url,
  cover,
  width,
  gap,
  onPress,
  onMenu,
}: {
  url: string
  cover: boolean
  width: number | `${number}%`
  gap: number
  onPress: () => void
  onMenu?: () => void
}) {
  const t = useTheme()
  return (
    <View style={{ width, paddingRight: gap, paddingBottom: gap }}>
      <Pressable
        onPress={onPress}
        style={{
          aspectRatio: 1,
          borderRadius: t.radius.lg,
          overflow: 'hidden',
          backgroundColor: t.colors.muted,
          borderWidth: 1,
          borderColor: t.colors.border,
        }}
      >
        <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={150} />
        {cover ? (
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: t.radius.sm,
              backgroundColor: t.colors.primary,
            }}
          >
            <Text variant="caption" style={{ color: t.colors.primaryForeground, fontSize: 10 }}>
              Kapak
            </Text>
          </View>
        ) : null}
        {onMenu ? (
          <Pressable
            onPress={onMenu}
            hitSlop={8}
            style={{
              position: 'absolute',
              right: 6,
              top: 6,
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Icon name="more-horizontal" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  )
}

function AddTile({
  width,
  gap,
  disabled,
  onPress,
}: {
  width: number | `${number}%`
  gap: number
  disabled?: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <View style={{ width, paddingRight: gap, paddingBottom: gap }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          aspectRatio: 1,
          borderRadius: t.radius.lg,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: t.colors.inputBorder,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: t.colors.muted,
        }}
      >
        <Icon name="plus" size={22} color={t.colors.mutedForeground} />
        <Text variant="caption" tone="muted">
          Ekle
        </Text>
      </Pressable>
    </View>
  )
}

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose}>
        <View
          style={{
            marginTop: 'auto',
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            padding: t.spacing[4],
            gap: t.spacing[1],
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <Text variant="overline" tone="muted" style={{ marginBottom: t.spacing[1] }}>
            {title}
          </Text>
          {children}
          <Button title="Vazgeç" variant="ghost" onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  )
}

function SheetAction({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: IconName
  label: string
  destructive?: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        paddingVertical: t.spacing[3],
        paddingHorizontal: t.spacing[2],
      }}
    >
      <Icon name={icon} size={20} color={destructive ? t.colors.destructive : t.colors.foreground} />
      <Text variant="body" tone={destructive ? 'destructive' : 'default'}>
        {label}
      </Text>
    </Pressable>
  )
}

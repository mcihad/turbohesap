// DocumentFilterSheet — the mobile advanced filter (bottom sheet) for the evrak
// list: category tree, tag, expiry status, "sadece benim evraklarım" and (when
// the viewer holds documents.private.manage — no, privateReadAll) "kişiye özel
// olanları göster" toggles. Mirrors inventory's ProductFilterSheet shape.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { DocumentCategoryDto, DocumentExpiryStatus } from '@turbohesap/shared'

import { Button, Icon, Text } from '../../components'
import { FormSwitchRow } from '../../components/form'
import { useTheme } from '../../theme/theme-context'
import { EXPIRY_STATUS_LABELS, flattenCategories } from './labels'
import type { DocumentFilters } from './DocumentsListScreen'

const EXPIRY_OPTIONS: Array<{ value: DocumentExpiryStatus | null; label: string }> = [
  { value: null, label: 'Tümü' },
  { value: 'active', label: EXPIRY_STATUS_LABELS.active },
  { value: 'expiring_soon', label: EXPIRY_STATUS_LABELS.expiring_soon },
  { value: 'expired', label: EXPIRY_STATUS_LABELS.expired },
  { value: 'none', label: EXPIRY_STATUS_LABELS.none },
]

export function DocumentFilterSheet({
  open,
  onClose,
  categories,
  tags,
  filters,
  setFilters,
  canPrivateReadAll,
}: {
  open: boolean
  onClose: () => void
  categories: DocumentCategoryDto[]
  tags: string[]
  filters: DocumentFilters
  setFilters: React.Dispatch<React.SetStateAction<DocumentFilters>>
  canPrivateReadAll: boolean
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const flatCats = React.useMemo(() => flattenCategories(categories), [categories])

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: t.radius['2xl'], borderTopRightRadius: t.radius['2xl'], paddingTop: t.spacing[3], maxHeight: '92%' }}>
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <Text variant="title" weight="semibold">Filtrele</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[5] }}>
            <Group title="Kategori">
              <Boxed>
                <CheckRow first label="Tümü" active={!filters.categoryId} onPress={() => setFilters((f) => ({ ...f, categoryId: null }))} />
                {flatCats.map(({ cat, depth }) => (
                  <CheckRow
                    key={cat.id}
                    label={cat.name}
                    depth={depth}
                    active={filters.categoryId === cat.id}
                    onPress={() => setFilters((f) => ({ ...f, categoryId: cat.id }))}
                  />
                ))}
              </Boxed>
            </Group>

            {tags.length > 0 ? (
              <Group title="Etiket">
                <Boxed>
                  <CheckRow first label="Tümü" active={!filters.tag} onPress={() => setFilters((f) => ({ ...f, tag: null }))} />
                  {tags.map((tag) => (
                    <CheckRow key={tag} label={tag} active={filters.tag === tag} onPress={() => setFilters((f) => ({ ...f, tag }))} />
                  ))}
                </Boxed>
              </Group>
            ) : null}

            <Group title="Süre durumu">
              <Boxed>
                {EXPIRY_OPTIONS.map((opt, i) => (
                  <CheckRow
                    key={opt.value ?? 'all'}
                    first={i === 0}
                    label={opt.label}
                    active={filters.expiryStatus === opt.value}
                    onPress={() => setFilters((f) => ({ ...f, expiryStatus: opt.value }))}
                  />
                ))}
              </Boxed>
            </Group>

            <Group title="Sahiplik">
              <FormSwitchRow
                label="Sadece benim evraklarım"
                value={filters.mine}
                onValueChange={(v) => setFilters((f) => ({ ...f, mine: v }))}
              />
              {canPrivateReadAll ? (
                <FormSwitchRow
                  label="Kişiye özel olanları göster"
                  description="Sadece kişiye özel işaretli evrakları listele"
                  value={filters.isPrivate === true}
                  onValueChange={(v) => setFilters((f) => ({ ...f, isPrivate: v ? true : null }))}
                />
              ) : null}
            </Group>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], paddingBottom: insets.bottom + t.spacing[3], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            <Button
              title="Sıfırla"
              variant="ghost"
              size="sm"
              onPress={() => setFilters({ categoryId: null, tag: null, expiryStatus: null, mine: false, isPrivate: null })}
            />
            <View style={{ flex: 1 }} />
            <Button title="Uygula" size="sm" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function Boxed({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.lg, overflow: 'hidden' }}>{children}</View>
}

function CheckRow({
  label,
  active,
  onPress,
  first,
  depth = 0,
}: {
  label: string
  active: boolean
  onPress: () => void
  first?: boolean
  depth?: number
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2.5],
        paddingVertical: t.spacing[2.5],
        paddingRight: t.spacing[3],
        paddingLeft: t.spacing[3] + depth * 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.border,
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: t.radius.sm, borderWidth: active ? 0 : 1.5, borderColor: t.colors.inputBorder, backgroundColor: active ? t.colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {active ? <Icon name="check" size={15} color={t.colors.primaryForeground} /> : null}
      </View>
      <Text variant="label" weight={active ? 'semibold' : 'normal'} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[2] }}>
      <Text variant="overline" tone="muted">{title}</Text>
      {children}
    </View>
  )
}

// Count of active (non-default) filters, for the badge on the filter button.
export function documentFilterCount(f: DocumentFilters): number {
  let n = 0
  if (f.categoryId) n++
  if (f.tag) n++
  if (f.expiryStatus) n++
  if (f.mine) n++
  if (f.isPrivate) n++
  return n
}

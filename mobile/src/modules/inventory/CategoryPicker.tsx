// CategoryPicker — a modal category selector with depth indentation (the mobile
// counterpart of the web CategoryTreeSelect). Stores the category id (or null).

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { InventoryPermissions } from '@turbohesap/shared'

import { Icon, Text } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'
import { flattenCategories } from './labels'

export function CategoryPicker({
  value,
  onChange,
  label = 'Kategori',
}: {
  value: string | null | undefined
  onChange: (id: string | null) => void
  label?: string
}) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.categoriesRead)
  const [open, setOpen] = React.useState(false)
  const cats = useAsync(() => api.inventory.categories.list(), [], { enabled: canRead })
  const flat = React.useMemo(() => flattenCategories(cats.data ?? []), [cats.data])
  const current = (cats.data ?? []).find((c) => c.id === value)

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      <Text variant="label" tone="muted" weight="medium">
        {label}
      </Text>
      <Pressable
        onPress={() => canRead && setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          paddingHorizontal: t.spacing[3.5],
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.inputBorder,
          backgroundColor: t.colors.card,
          opacity: canRead ? 1 : 0.5,
        }}
      >
        <Text variant="body" tone={current ? 'default' : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
          {current ? current.name : 'Kategori yok'}
        </Text>
        <Icon name="chevron-down" size={18} color={t.colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.colors.card,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              paddingTop: t.spacing[3],
              paddingBottom: t.spacing[8],
              maxHeight: '75%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>
            <ScrollView>
              <Row label="Kategori yok" depth={0} selected={!value} onPress={() => { onChange(null); setOpen(false) }} muted />
              {flat.map(({ cat, depth }) => (
                <Row
                  key={cat.id}
                  label={cat.name}
                  depth={depth}
                  selected={cat.id === value}
                  onPress={() => { onChange(cat.id); setOpen(false) }}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function Row({
  label,
  depth,
  selected,
  onPress,
  muted,
}: {
  label: string
  depth: number
  selected: boolean
  onPress: () => void
  muted?: boolean
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: t.spacing[3.5],
        paddingHorizontal: t.spacing[5],
        paddingLeft: t.spacing[5] + depth * 16,
      }}
    >
      <Text variant="body" tone={muted ? 'muted' : selected ? 'primary' : 'default'} weight={selected ? 'semibold' : 'normal'}>
        {depth > 0 ? '↳ ' : ''}
        {label}
      </Text>
      {selected ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
    </Pressable>
  )
}

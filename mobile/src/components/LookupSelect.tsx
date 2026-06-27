// LookupSelect (mobile) — the RN counterpart of the web LookupSelect. Bind it to
// a named lookup list; it auto-fetches that list's items, opens a modal picker to
// choose one (stores the item's `key`), and — with `lookups.write` — offers an
// inline **"+ Yeni ekle"** to create a value on the spot.
//
//   <LookupSelect list="birim" label="Birim" value={unit} onChange={setUnit} />

import * as React from 'react'
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native'

import { LookupsPermissions, toApiError } from '@turbohesap/shared'

import { api } from '../lib/api'
import { useAuth } from '../lib/auth/auth-context'
import { useAsync } from '../lib/use-async'
import { useTheme } from '../theme/theme-context'
import { Button } from './Button'
import { Icon } from './Icon'
import { Text } from './Text'

export function LookupSelect({
  list,
  value,
  onChange,
  label,
  placeholder = 'Seçin',
  allowCreate = true,
}: {
  list: string
  value: string | null | undefined
  onChange: (key: string) => void
  label?: string
  placeholder?: string
  allowCreate?: boolean
}) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const canWrite = hasPermission(LookupsPermissions.write)
  const [open, setOpen] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [newValue, setNewValue] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const items = useAsync(() => api.lookups.list(list), [list], { enabled: canRead })
  const all = items.data ?? []
  const active = all.filter((i) => i.isActive || i.key === value)
  const current = all.find((i) => i.key === value)
  const currentLabel = current?.value ?? (value ? String(value) : undefined)

  function close() {
    setOpen(false)
    setAdding(false)
    setNewValue('')
  }

  async function add() {
    if (!newValue.trim() || busy) return
    setBusy(true)
    try {
      const item = await api.lookups.create({ list, value: newValue.trim() })
      items.refetch()
      onChange(item.key)
      close()
    } catch (e) {
      Alert.alert('Eklenemedi', toApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
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
        <Text variant="body" tone={currentLabel ? 'default' : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
          {canRead ? (currentLabel ?? placeholder) : 'Yetki yok'}
        </Text>
        <Icon name="chevron-down" size={18} color={t.colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
              <Text variant="overline" tone="muted">
                {label ?? list}
              </Text>
              {allowCreate && canWrite && !adding ? (
                <Pressable onPress={() => setAdding(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="plus" size={16} color={t.colors.primary} />
                  <Text variant="label" tone="primary" weight="semibold">
                    Yeni ekle
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {adding ? (
              <View style={{ paddingHorizontal: t.spacing[5], gap: t.spacing[2], paddingVertical: t.spacing[2] }}>
                <TextInput
                  value={newValue}
                  onChangeText={setNewValue}
                  autoFocus
                  placeholder="Yeni değer (örn. Kilogram)"
                  placeholderTextColor={t.colors.mutedForeground}
                  onSubmitEditing={add}
                  style={{
                    height: 48,
                    paddingHorizontal: t.spacing[3.5],
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: t.colors.ring,
                    backgroundColor: t.colors.background,
                    color: t.colors.foreground,
                    fontSize: t.type.size.base,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                  <Button title="Vazgeç" variant="outline" size="sm" onPress={() => { setAdding(false); setNewValue('') }} style={{ flex: 1 }} />
                  <Button title="Ekle" size="sm" loading={busy} disabled={!newValue.trim()} onPress={add} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <ScrollView>
                {active.length === 0 ? (
                  <Text variant="label" tone="muted" style={{ padding: t.spacing[5] }}>
                    {items.loading ? 'Yükleniyor…' : 'Bu listede öğe yok'}
                  </Text>
                ) : (
                  active.map((i) => {
                    const sel = i.key === value
                    return (
                      <Pressable
                        key={i.key}
                        onPress={() => {
                          onChange(i.key)
                          close()
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: t.spacing[5],
                          paddingVertical: t.spacing[3.5],
                        }}
                      >
                        <Text variant="body" weight={sel ? 'semibold' : 'normal'} tone={sel ? 'primary' : 'default'}>
                          {i.value}
                        </Text>
                        {sel ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                      </Pressable>
                    )
                  })
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

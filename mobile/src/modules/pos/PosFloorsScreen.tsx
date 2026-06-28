// POS kat (floor) & masa (table) yönetimi — restoran/masa servisi için. Katları
// ve her katın masalarını listeler; kat/masa ekle-düzenle-sil. Satış ekranındaki
// dine-in masa seçici bu tanımları kullanır. PosPermissions.tablesManage ile
// korunur.

import * as React from 'react'
import { Modal, Pressable, View } from 'react-native'

import { PosPermissions } from '@turbohesap/shared'

import {
  Button,
  Card,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  Icon,
  type IconName,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

type EditTarget =
  | { kind: 'floor'; id: string; name: string; isActive: boolean }
  | { kind: 'table'; id: string; name: string; seats: string; isActive: boolean }

export function PosFloorsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PosPermissions.tablesManage)
  const { submit, busy } = useSubmit()

  const floorsQ = useAsync(() => api.pos.tables.listFloors(), [], { enabled: canManage })
  const tablesQ = useAsync(() => api.pos.tables.listTables(), [], { enabled: canManage })
  const branchesQ = useAsync(() => api.org.branches.list(), [], { enabled: canManage })

  const floors = React.useMemo(
    () => [...(floorsQ.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [floorsQ.data],
  )
  const tablesFor = React.useCallback(
    (floorId: string) =>
      (tablesQ.data ?? [])
        .filter((tb) => tb.floorId === floorId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tablesQ.data],
  )

  const [newFloorName, setNewFloorName] = React.useState('')
  const [newFloorBranchId, setNewFloorBranchId] = React.useState<string | null>(null)
  const [newTableName, setNewTableName] = React.useState<Record<string, string>>({})
  const [editing, setEditing] = React.useState<EditTarget | null>(null)

  const refetch = () => {
    floorsQ.refetch()
    tablesQ.refetch()
  }

  const branchOptions = (branchesQ.data ?? []).map((b) => ({ value: b.id, label: b.name }))

  const createFloor = () => {
    const name = newFloorName.trim()
    if (!name) return
    const branchId =
      newFloorBranchId ?? (branchesQ.data?.length === 1 ? branchesQ.data[0].id : null)
    void submit(
      async () => {
        await api.pos.tables.createFloor({ name, branchId, sortOrder: floors.length })
        setNewFloorName('')
      },
      { onSuccess: refetch, errorTitle: 'Kat eklenemedi' },
    )
  }

  const createTable = (floorId: string) => {
    const name = (newTableName[floorId] ?? '').trim()
    if (!name) return
    void submit(
      async () => {
        await api.pos.tables.createTable({ floorId, name, sortOrder: tablesFor(floorId).length })
        setNewTableName((cur) => ({ ...cur, [floorId]: '' }))
      },
      { onSuccess: refetch, errorTitle: 'Masa eklenemedi' },
    )
  }

  const removeFloor = (id: string, name: string) =>
    confirmDestructive('Kat sil', `"${name}" katı ve masaları silinsin mi?`, () => {
      void submit(() => api.pos.tables.removeFloor(id).then(() => undefined), {
        onSuccess: refetch,
        errorTitle: 'Kat silinemedi',
      })
    })

  const removeTable = (id: string, name: string) =>
    confirmDestructive('Masa sil', `"${name}" masası silinsin mi?`, () => {
      void submit(() => api.pos.tables.removeTable(id).then(() => undefined), {
        onSuccess: refetch,
        errorTitle: 'Masa silinemedi',
      })
    })

  const saveEdit = () => {
    if (!editing) return
    const name = editing.name.trim()
    if (!name) return
    void submit(
      async () => {
        if (editing.kind === 'floor') {
          await api.pos.tables.updateFloor(editing.id, { name, isActive: editing.isActive })
        } else {
          await api.pos.tables.updateTable(editing.id, {
            name,
            seats: Number(editing.seats) || 0,
            isActive: editing.isActive,
          })
        }
      },
      {
        onSuccess: () => {
          setEditing(null)
          refetch()
        },
        errorTitle: 'Kaydedilemedi',
      },
    )
  }

  const loading = floorsQ.loading || tablesQ.loading

  return (
    <PermissionRequired
      permission={PosPermissions.tablesManage}
      title="Masalar / Katlar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Masalar / Katlar', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={refetch}
        refreshing={floorsQ.refreshing || tablesQ.refreshing}
      >
        {loading ? (
          <SkeletonRows count={6} />
        ) : floorsQ.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={floorsQ.error}
            actionLabel="Tekrar dene"
            onAction={refetch}
          />
        ) : (
          <>
            {floors.length === 0 ? (
              <EmptyState icon="grid" title="Kat yok" description="Aşağıdan ilk katı ekleyin." />
            ) : (
              floors.map((floor) => {
                const tables = tablesFor(floor.id)
                return (
                  <Section
                    key={floor.id}
                    title={floor.name}
                    action={
                      <View style={{ flexDirection: 'row', gap: t.spacing[0.5] }}>
                        <IconButton
                          icon="edit-2"
                          onPress={() => setEditing({ kind: 'floor', id: floor.id, name: floor.name, isActive: floor.isActive })}
                        />
                        <IconButton icon="trash-2" tone={t.colors.destructive} onPress={() => removeFloor(floor.id, floor.name)} />
                      </View>
                    }
                  >
                    {tables.length === 0 ? (
                      <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                        Bu katta masa yok.
                      </Text>
                    ) : (
                      <ListCard>
                        {tables.map((tb) => (
                          <ListRow
                            key={tb.id}
                            icon="square"
                            title={tb.name}
                            subtitle={`${tb.seats > 0 ? `${tb.seats} kişilik` : 'Kapasite belirsiz'}${tb.isActive ? '' : ' · pasif'}`}
                            trailing={
                              <View style={{ flexDirection: 'row', gap: t.spacing[0.5] }}>
                                <IconButton
                                  icon="edit-2"
                                  onPress={() =>
                                    setEditing({ kind: 'table', id: tb.id, name: tb.name, seats: String(tb.seats), isActive: tb.isActive })
                                  }
                                />
                                <IconButton icon="trash-2" tone={t.colors.destructive} onPress={() => removeTable(tb.id, tb.name)} />
                              </View>
                            }
                            chevron={false}
                          />
                        ))}
                      </ListCard>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                      <View style={{ flex: 1 }}>
                        <Input
                          placeholder="Yeni masa adı (örn. M1)"
                          value={newTableName[floor.id] ?? ''}
                          onChangeText={(v) => setNewTableName((cur) => ({ ...cur, [floor.id]: v }))}
                        />
                      </View>
                      <Button
                        title="Ekle"
                        icon="plus"
                        onPress={() => createTable(floor.id)}
                        loading={busy}
                        disabled={!(newTableName[floor.id] ?? '').trim()}
                        style={{ height: 48, alignSelf: 'flex-end' }}
                      />
                    </View>
                  </Section>
                )
              })
            )}

            <Section title="Yeni kat">
              {branchOptions.length > 1 ? (
                <FormSelect
                  label="Şube"
                  value={newFloorBranchId ?? branchOptions[0]?.value ?? ''}
                  onChange={setNewFloorBranchId}
                  options={branchOptions}
                />
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Kat adı"
                    placeholder="örn. Zemin Kat / Bahçe"
                    value={newFloorName}
                    onChangeText={setNewFloorName}
                  />
                </View>
                <Button title="Ekle" icon="plus" onPress={createFloor} loading={busy} disabled={!newFloorName.trim()} style={{ height: 48, alignSelf: 'flex-end' }} />
              </View>
            </Section>
          </>
        )}
      </Screen>

      {/* Edit sheet */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable onPress={() => setEditing(null)} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.colors.background,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              padding: t.spacing[4],
              gap: t.spacing[3],
            }}
          >
            <Text variant="title" weight="bold">
              {editing?.kind === 'floor' ? 'Katı düzenle' : 'Masayı düzenle'}
            </Text>
            {editing ? (
              <>
                <Input
                  label="Ad"
                  value={editing.name}
                  onChangeText={(v) => setEditing({ ...editing, name: v })}
                />
                {editing.kind === 'table' ? (
                  <Input
                    label="Kapasite (kişi)"
                    value={editing.seats}
                    onChangeText={(v) => setEditing({ ...editing, seats: v })}
                    keyboardType="number-pad"
                  />
                ) : null}
                <FormSwitchRow
                  label="Aktif"
                  value={editing.isActive}
                  onValueChange={(v) => setEditing({ ...editing, isActive: v })}
                />
                <Button title="Kaydet" fullWidth loading={busy} disabled={!editing.name.trim()} onPress={saveEdit} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </PermissionRequired>
  )
}

function IconButton({ icon, onPress, tone }: { icon: IconName; onPress: () => void; tone?: string }) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.muted : 'transparent',
      })}
    >
      <Icon name={icon} size={18} color={tone ?? t.colors.mutedForeground} />
    </Pressable>
  )
}

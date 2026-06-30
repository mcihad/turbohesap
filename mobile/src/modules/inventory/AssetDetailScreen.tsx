// AssetDetailScreen — full demirbaş detail. Tabs: Genel (info + status change),
// Zimmet (current holder + Zimmet Ver / İade Al / Devret + custody ledger), Bakım
// (maintenance ledger + quick add), Araç (KM/Yakıt logs + odometer + quick add —
// vehicles only), Medya (ImageManager). Custody actions are gated by
// inventory.assets.assign, status change + maintenance/vehicle adds by their perms.
// "Devret" routes to the QR handshake (TransferInitiateScreen).

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import {
  ASSET_MAINTENANCE_TYPE_LABELS,
  ASSET_RETIRED_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_STATUSES,
  ASSET_VEHICLE_LOG_KIND_LABELS,
  FilesPermissions,
  IamPermissions,
  InventoryPermissions,
  type AssetMaintenanceType,
  type AssetStatus,
  type AssetVehicleLogKind,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  type DetailTab,
  DetailTabs,
  EmptyState,
  Field,
  FieldGrid,
  FormDatePicker,
  FormSelect,
  HeaderAction,
  Icon,
  Input,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
  type SelectOption,
} from '../../components'
import { ImageManager } from '../../components/image'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate, formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { assetStatusTone } from './asset-labels'
import { money } from './labels'

export function AssetDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.assetsWrite)
  const canAssign = hasPermission(InventoryPermissions.assetsAssign)
  const canMaintain = hasPermission(InventoryPermissions.assetsMaintain)
  const canFiles = hasPermission(FilesPermissions.write)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const id = String(nav.current.params?.id ?? '')

  const asset = useAsync(() => api.inventory.assets.get(id), [id], {
    enabled: hasPermission(InventoryPermissions.assetsRead) && !!id,
  })
  const assignments = useAsync(() => api.inventory.assetAssignments.list({ assetId: id }), [id], {
    enabled: hasPermission(InventoryPermissions.assetsRead) && !!id,
  })
  const maintenance = useAsync(() => api.inventory.assetMaintenance.list({ assetId: id }), [id], {
    enabled: hasPermission(InventoryPermissions.assetsRead) && !!id,
  })
  const vehicleLogs = useAsync(() => api.inventory.assetVehicleLogs.list({ assetId: id }), [id], {
    enabled: hasPermission(InventoryPermissions.assetsRead) && !!id,
  })

  const { submit, busy } = useSubmit()
  const a = asset.data
  const [tab, setTab] = React.useState('genel')

  const [assignOpen, setAssignOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [maintOpen, setMaintOpen] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)

  const refetchAll = React.useCallback(() => {
    asset.refetch()
    assignments.refetch()
    maintenance.refetch()
    vehicleLogs.refetch()
  }, [asset, assignments, maintenance, vehicleLogs])

  if (!hasPermission(InventoryPermissions.assetsRead)) {
    return (
      <Screen header={{ title: 'Demirbaş', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: a?.name ?? 'Demirbaş',
        subtitle: a?.code,
        onBack: nav.goBack,
        right: a ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Asset', entityId: a.id, title: a.name }, 'Denetim geçmişi')}
              />
            ) : null}
            {canWrite ? <HeaderAction icon="repeat" onPress={() => setStatusOpen(true)} /> : null}
          </>
        ) : undefined,
      }}
      onRefresh={refetchAll}
      refreshing={asset.refreshing}
    >
      {asset.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : asset.error || !a ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={asset.error ?? 'Demirbaş bulunamadı.'} actionLabel="Tekrar dene" onAction={asset.refetch} />
      ) : (
        (() => {
          const tabs: DetailTab[] = [
            { value: 'genel', label: 'Genel', icon: 'info' },
            { value: 'zimmet', label: 'Zimmet', icon: 'user-check' },
            { value: 'bakim', label: 'Bakım', icon: 'tool' },
            ...(a.isVehicle ? [{ value: 'arac', label: 'Araç', icon: 'truck' } as DetailTab] : []),
            { value: 'medya', label: 'Medya', icon: 'image' },
          ]
          const active = tabs.some((x) => x.value === tab) ? tab : 'genel'

          return (
            <>
              <DetailTabs tabs={tabs} value={active} onChange={setTab} />

              {active === 'genel' ? (
                <>
                  <Section title="Genel">
                    <Card style={{ gap: t.spacing[4] }}>
                      <View style={{ flexDirection: 'row', gap: t.spacing[1.5], flexWrap: 'wrap' }}>
                        <Badge label={ASSET_STATUS_LABELS[a.status]} tone={assetStatusTone(a.status)} />
                        {a.isVehicle ? <Badge label="Araç" tone="info" /> : null}
                        {!a.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                      </View>
                      <FieldGrid>
                        <Field label="Kod" value={a.code} mono />
                        <Field label="Tür" value={a.assetTypeKey || '—'} />
                        <Field label="Marka" value={a.brand || '—'} />
                        <Field label="Model" value={a.model || '—'} />
                        <Field label="Seri No" value={a.serialNo || '—'} mono />
                        <Field label="Barkod" value={a.barcode || '—'} mono />
                        {a.isVehicle ? <Field label="Plaka" value={a.plate || '—'} mono /> : null}
                        {a.isVehicle ? <Field label="Şasi No" value={a.chassisNo || '—'} mono /> : null}
                        {a.statusReason ? <Field label="Durum nedeni" value={a.statusReason} full /> : null}
                      </FieldGrid>
                    </Card>
                  </Section>

                  <Section title="Edinim">
                    <Card>
                      <FieldGrid>
                        <Field label="Alış değeri" value={money(a.purchaseValue, a.currency)} />
                        <Field label="Alış tarihi" value={a.purchaseDate ? formatDate(a.purchaseDate) : '—'} />
                        <Field label="Garanti bitiş" value={a.warrantyEnd ? formatDate(a.warrantyEnd) : '—'} />
                        {a.isVehicle ? <Field label="Model yılı" value={a.modelYear == null ? '—' : String(a.modelYear)} /> : null}
                      </FieldGrid>
                    </Card>
                  </Section>

                  <Section title="Kayıt">
                    <Card>
                      <FieldGrid>
                        <Field label="Oluşturma" value={formatDateTime(a.createdAt)} />
                        <Field label="Güncelleme" value={formatDateTime(a.updatedAt)} />
                      </FieldGrid>
                    </Card>
                  </Section>

                  {canWrite ? (
                    <Button
                      title="Durum değiştir (kayıp / hurda / çıkış)"
                      variant="outline"
                      icon="repeat"
                      fullWidth
                      onPress={() => setStatusOpen(true)}
                      style={{ marginTop: t.spacing[2] }}
                    />
                  ) : null}
                </>
              ) : null}

              {active === 'zimmet' ? (
                <>
                  <Section title="Mevcut zimmet">
                    <Card style={{ gap: t.spacing[4] }}>
                      {a.currentEmployeeId ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                          <View style={{ width: 44, height: 44, borderRadius: t.radius.full, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="user" size={22} color={t.colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text variant="body" weight="semibold">
                              {a.currentEmployeeName ?? 'Personel'}
                            </Text>
                            <Text variant="caption" tone="muted">
                              Zimmetli
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text variant="body" tone="muted">
                          Bu demirbaş şu an kimseye zimmetli değil (depoda).
                        </Text>
                      )}

                      {canAssign ? (
                        a.currentEmployeeId ? (
                          <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                            <View style={{ flex: 1 }}>
                              <Button
                                title="İade Al"
                                variant="outline"
                                icon="corner-down-left"
                                fullWidth
                                loading={busy}
                                onPress={() =>
                                  confirmDestructive(
                                    'İade al',
                                    `"${a.name}" zimmetten alınsın mı? Demirbaş depoya döner.`,
                                    () => submit(async () => { await api.inventory.assetAssignments.returnAsset(a.id) }, { onSuccess: refetchAll, errorTitle: 'İade başarısız' }),
                                    'İade Al',
                                  )
                                }
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Button
                                title="Devret"
                                icon="send"
                                fullWidth
                                onPress={() => nav.navigate('inventory.transferInitiate', { assetId: a.id, assetName: a.name }, 'Zimmet devret')}
                              />
                            </View>
                          </View>
                        ) : (
                          <Button title="Zimmet Ver" icon="user-plus" fullWidth onPress={() => setAssignOpen(true)} />
                        )
                      ) : null}
                    </Card>
                  </Section>

                  <Section title="Zimmet geçmişi">
                    {(assignments.data ?? []).length === 0 ? (
                      <EmptyState icon="user-check" title="Kayıt yok" description="Henüz zimmet hareketi yok." />
                    ) : (
                      <ListCard>
                        {(assignments.data ?? []).map((z) => (
                          <ListRow
                            key={z.id}
                            icon="user"
                            title={z.employeeName}
                            subtitle={`${formatDate(z.assignedAt)}${z.returnedAt ? ` → ${formatDate(z.returnedAt)}` : ''}`}
                            trailing={<Badge label={z.status === 'active' ? 'Aktif' : z.status === 'returned' ? 'İade' : 'Devir'} tone={z.status === 'active' ? 'success' : 'muted'} />}
                          />
                        ))}
                      </ListCard>
                    )}
                  </Section>
                </>
              ) : null}

              {active === 'bakim' ? (
                <Section title="Bakım / Onarım" action={canMaintain ? <AddAction onPress={() => setMaintOpen(true)} /> : undefined}>
                  {(maintenance.data ?? []).length === 0 ? (
                    <EmptyState icon="tool" title="Bakım kaydı yok" description={canMaintain ? 'Yeni bakım kaydı ekleyin.' : 'Henüz bakım kaydı yok.'} />
                  ) : (
                    <ListCard>
                      {(maintenance.data ?? []).map((m) => (
                        <ListRow
                          key={m.id}
                          icon="tool"
                          title={ASSET_MAINTENANCE_TYPE_LABELS[m.type]}
                          subtitle={`${formatDate(m.date)}${m.description ? ` · ${m.description}` : ''}`}
                          trailing={<Text variant="label" weight="semibold">{money(m.cost, m.currency)}</Text>}
                        />
                      ))}
                    </ListCard>
                  )}
                </Section>
              ) : null}

              {active === 'arac' && a.isVehicle ? (
                <>
                  <Section title="Kilometre">
                    <Card>
                      <FieldGrid>
                        <Field label="Güncel KM" value={a.currentOdometer == null ? '—' : `${a.currentOdometer.toLocaleString('tr-TR')} km`} />
                        <Field label="Yakıt türü" value={a.fuelTypeKey || '—'} />
                      </FieldGrid>
                    </Card>
                  </Section>
                  <Section title="KM & Yakıt kayıtları" action={canMaintain ? <AddAction onPress={() => setLogOpen(true)} /> : undefined}>
                    {(vehicleLogs.data ?? []).length === 0 ? (
                      <EmptyState icon="truck" title="Kayıt yok" description={canMaintain ? 'Yeni KM/Yakıt kaydı ekleyin.' : 'Henüz kayıt yok.'} />
                    ) : (
                      <ListCard>
                        {(vehicleLogs.data ?? []).map((l) => (
                          <ListRow
                            key={l.id}
                            icon={l.kind === 'yakit' ? 'droplet' : 'navigation'}
                            title={`${ASSET_VEHICLE_LOG_KIND_LABELS[l.kind]} · ${l.odometer.toLocaleString('tr-TR')} km`}
                            subtitle={`${formatDate(l.date)}${l.liters != null ? ` · ${l.liters} L` : ''}`}
                            trailing={l.totalCost != null ? <Text variant="label" weight="semibold">{money(l.totalCost, l.currency)}</Text> : undefined}
                          />
                        ))}
                      </ListCard>
                    )}
                  </Section>
                </>
              ) : null}

              {active === 'medya' ? (
                <Section title="Fotoğraflar">
                  <Card>
                    <ImageManager entityType="Asset" entityId={a.id} canWrite={canFiles} title="Demirbaş fotoğrafları" />
                  </Card>
                </Section>
              ) : null}

              {/* Action sheets */}
              <AssignSheet
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                assetId={a.id}
                onDone={() => {
                  setAssignOpen(false)
                  refetchAll()
                }}
              />
              <StatusSheet
                open={statusOpen}
                onClose={() => setStatusOpen(false)}
                assetId={a.id}
                current={a.status}
                onDone={() => {
                  setStatusOpen(false)
                  refetchAll()
                }}
              />
              <MaintenanceSheet
                open={maintOpen}
                onClose={() => setMaintOpen(false)}
                assetId={a.id}
                onDone={() => {
                  setMaintOpen(false)
                  maintenance.refetch()
                }}
              />
              <VehicleLogSheet
                open={logOpen}
                onClose={() => setLogOpen(false)}
                assetId={a.id}
                onDone={() => {
                  setLogOpen(false)
                  vehicleLogs.refetch()
                  asset.refetch()
                }}
              />
            </>
          )
        })()
      )}
    </Screen>
  )
}

// ── "+ Ekle" inline section action ──────────────────────────────────────────
function AddAction({ onPress }: { onPress: () => void }) {
  const t = useTheme()
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] }}>
      <Icon name="plus" size={16} color={t.colors.primary} />
      <Text variant="label" weight="semibold" tone="primary">
        Ekle
      </Text>
    </Pressable>
  )
}

// ── Bottom-sheet shell (RN Modal) ──────────────────────────────────────────
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.card,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingHorizontal: t.spacing[4],
            paddingTop: t.spacing[3],
            paddingBottom: t.spacing[8],
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <Text variant="title" weight="bold" style={{ marginBottom: t.spacing[3] }}>
            {title}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: t.spacing[3] }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Zimmet Ver sheet ────────────────────────────────────────────────────────
function AssignSheet({ open, onClose, assetId, onDone }: { open: boolean; onClose: () => void; assetId: string; onDone: () => void }) {
  const [employeeId, setEmployeeId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const { submit, busy } = useSubmit()
  const employees = useAsync(() => api.hr.employees.list(), [], { enabled: open })
  const options = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Personel seçin…' }, ...(employees.data ?? []).map((e) => ({ value: e.id, label: e.fullName }))],
    [employees.data],
  )

  const save = () =>
    submit(
      async () => {
        await api.inventory.assetAssignments.assign({ assetId, employeeId, notes: notes || null })
      },
      { onSuccess: onDone, errorTitle: 'Zimmet verilemedi' },
    )

  return (
    <Sheet open={open} onClose={onClose} title="Zimmet Ver">
      <FormSelect label="Personel" value={employeeId} options={options} onChange={setEmployeeId} />
      <Input label="Not (opsiyonel)" value={notes} onChangeText={setNotes} placeholder="Teslim notu" />
      <Button title="Zimmetle" icon="user-plus" fullWidth loading={busy} disabled={!employeeId} onPress={save} />
    </Sheet>
  )
}

// ── Durum değiştir sheet ────────────────────────────────────────────────────
function StatusSheet({ open, onClose, assetId, current, onDone }: { open: boolean; onClose: () => void; assetId: string; current: AssetStatus; onDone: () => void }) {
  const [status, setStatus] = React.useState<AssetStatus>(current)
  const [reason, setReason] = React.useState('')
  const { submit, busy } = useSubmit()

  React.useEffect(() => {
    if (open) {
      setStatus(current)
      setReason('')
    }
  }, [open, current])

  const options = React.useMemo<SelectOption<AssetStatus>[]>(
    () => ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABELS[s] })),
    [],
  )
  const retiring = ASSET_RETIRED_STATUSES.includes(status)

  const save = () =>
    submit(
      async () => {
        await api.inventory.assets.changeStatus(assetId, { status, reason: reason || null })
      },
      { onSuccess: onDone, errorTitle: 'Durum değiştirilemedi' },
    )

  return (
    <Sheet open={open} onClose={onClose} title="Durum değiştir">
      <FormSelect label="Yeni durum" value={status} options={options} onChange={setStatus} />
      {retiring ? (
        <Text variant="caption" tone="warning">
          Bu durum demirbaşı aktif kullanımdan çıkarır ve varsa açık zimmeti kapatır.
        </Text>
      ) : null}
      <Input label="Neden (opsiyonel)" value={reason} onChangeText={setReason} placeholder="Açıklama" />
      <Button title="Kaydet" icon="check" fullWidth loading={busy} disabled={status === current} onPress={save} />
    </Sheet>
  )
}

// ── Bakım ekle sheet ────────────────────────────────────────────────────────
function MaintenanceSheet({ open, onClose, assetId, onDone }: { open: boolean; onClose: () => void; assetId: string; onDone: () => void }) {
  const [type, setType] = React.useState<AssetMaintenanceType>('bakim')
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [cost, setCost] = React.useState('')
  const [description, setDescription] = React.useState('')
  const { submit, busy } = useSubmit()

  React.useEffect(() => {
    if (open) {
      setType('bakim')
      setDate(new Date().toISOString())
      setCost('')
      setDescription('')
    }
  }, [open])

  const options = React.useMemo<SelectOption<AssetMaintenanceType>[]>(
    () => (Object.keys(ASSET_MAINTENANCE_TYPE_LABELS) as AssetMaintenanceType[]).map((k) => ({ value: k, label: ASSET_MAINTENANCE_TYPE_LABELS[k] })),
    [],
  )

  const save = () =>
    submit(
      async () => {
        await api.inventory.assetMaintenance.create({
          assetId,
          type,
          date,
          cost: cost ? Number(cost.replace(',', '.')) : 0,
          description: description || null,
        })
      },
      { onSuccess: onDone, errorTitle: 'Bakım eklenemedi' },
    )

  return (
    <Sheet open={open} onClose={onClose} title="Bakım kaydı ekle">
      <FormSelect label="Tür" value={type} options={options} onChange={setType} />
      <FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" />
      <Input label="Maliyet" value={cost} onChangeText={setCost} placeholder="0" keyboardType="numeric" />
      <Input label="Açıklama (opsiyonel)" value={description} onChangeText={setDescription} placeholder="Yapılan iş" />
      <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={save} />
    </Sheet>
  )
}

// ── KM/Yakıt ekle sheet ─────────────────────────────────────────────────────
function VehicleLogSheet({ open, onClose, assetId, onDone }: { open: boolean; onClose: () => void; assetId: string; onDone: () => void }) {
  const [kind, setKind] = React.useState<AssetVehicleLogKind>('km')
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [odometer, setOdometer] = React.useState('')
  const [liters, setLiters] = React.useState('')
  const [totalCost, setTotalCost] = React.useState('')
  const { submit, busy } = useSubmit()

  React.useEffect(() => {
    if (open) {
      setKind('km')
      setDate(new Date().toISOString())
      setOdometer('')
      setLiters('')
      setTotalCost('')
    }
  }, [open])

  const options = React.useMemo<SelectOption<AssetVehicleLogKind>[]>(
    () => (Object.keys(ASSET_VEHICLE_LOG_KIND_LABELS) as AssetVehicleLogKind[]).map((k) => ({ value: k, label: ASSET_VEHICLE_LOG_KIND_LABELS[k] })),
    [],
  )
  const num = (s: string) => (s ? Number(s.replace(',', '.')) : undefined)

  const save = () =>
    submit(
      async () => {
        await api.inventory.assetVehicleLogs.create({
          assetId,
          kind,
          date,
          odometer: num(odometer) ?? 0,
          liters: kind === 'yakit' ? num(liters) ?? null : null,
          totalCost: kind === 'yakit' ? num(totalCost) ?? null : null,
        })
      },
      { onSuccess: onDone, errorTitle: 'Kayıt eklenemedi' },
    )

  return (
    <Sheet open={open} onClose={onClose} title="KM / Yakıt kaydı ekle">
      <FormSelect label="Tür" value={kind} options={options} onChange={setKind} />
      <FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" />
      <Input label="Kilometre" value={odometer} onChangeText={setOdometer} placeholder="0" keyboardType="numeric" />
      {kind === 'yakit' ? (
        <>
          <Input label="Litre" value={liters} onChangeText={setLiters} placeholder="0" keyboardType="numeric" />
          <Input label="Tutar" value={totalCost} onChangeText={setTotalCost} placeholder="0" keyboardType="numeric" />
        </>
      ) : null}
      <Button title="Kaydet" icon="check" fullWidth loading={busy} disabled={!odometer} onPress={save} />
    </Sheet>
  )
}

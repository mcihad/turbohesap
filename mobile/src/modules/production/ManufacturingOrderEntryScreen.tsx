// Üretim Emri oluştur/düzenle. A "Kaynak" segmented control switches between
// Stoğa (make-to-stock → orders.create) and Siparişe (make-to-order →
// orders.createFromDemand). Editing (draft only) uses orders.update with the
// product fixed. BOM is optional (blank = the product's active reçete). Mirrors
// the OrderEntryScreen shell (Card + Section + sticky footer).

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  PRODUCTION_PRIORITY_LABELS,
  ProductionPermissions,
  OrgPermissions,
  type CreateFromDemandRequest,
  type CreateManufacturingOrderRequest,
  type ProductionPriority,
  type ProductionSourceMode,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Input,
  Screen,
  Section,
  SegmentedControl,
  type SegmentOption,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const SOURCE_OPTIONS: SegmentOption<ProductionSourceMode>[] = [
  { value: 'mts', label: 'Stoğa (MTS)' },
  { value: 'mto', label: 'Siparişe (MTO)' },
]
const PRIORITY_OPTIONS: SelectOption<ProductionPriority>[] = (
  ['low', 'normal', 'high', 'urgent'] as ProductionPriority[]
).map((p) => ({ value: p, label: PRODUCTION_PRIORITY_LABELS[p] }))

export function ManufacturingOrderEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.production.orders.get(id as string), [id], { enabled: editing })
  const products = useAsync(() => api.inventory.products.list(), [])
  const boms = useAsync(() => api.production.boms.list(), [])
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: canReadBranches })

  const [source, setSource] = React.useState<ProductionSourceMode>('mts')
  const [productId, setProductId] = React.useState('')
  const [bomId, setBomId] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [unit, setUnit] = React.useState('Adet')
  const [priority, setPriority] = React.useState<ProductionPriority>('normal')
  const [targetBranchId, setTargetBranchId] = React.useState('')
  const [componentSourceBranchId, setComponentSourceBranchId] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    if (d.status !== 'draft') {
      nav.navigate('production.order.detail', { id: d.id }, d.orderNo)
      return
    }
    setSource(d.sourceMode)
    setProductId(d.productId)
    setBomId(d.bomId ?? '')
    setQuantity(String(d.plannedQuantity))
    setUnit(d.unit)
    setPriority(d.priority)
    setTargetBranchId(d.targetBranchId ?? '')
    setComponentSourceBranchId(d.componentSourceBranchId ?? '')
    setDueDate(d.dueDate ?? '')
    setNotes(d.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data])

  const productOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Ürün seçin' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
    [products.data],
  )
  // Only BOMs for the selected product (blank = the product's active reçete).
  const bomOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Otomatik (aktif reçete)' },
      ...(boms.data ?? [])
        .filter((b) => !productId || b.productId === productId)
        .map((b) => ({ value: b.id, label: `${b.name || b.code} · v${b.version}` })),
    ],
    [boms.data, productId],
  )
  const branchOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Şube yok' }, ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branches.data],
  )

  const pickProduct = (pid: string) => {
    setProductId(pid)
    setBomId('')
    const p = (products.data ?? []).find((it) => it.id === pid)
    if (p?.unit) setUnit(p.unit)
  }

  const save = () => {
    if (!productId) {
      alert('Ürün seçilmelidir')
      return
    }
    const qty = Number(quantity) || 0
    if (qty <= 0) {
      alert('Miktar 0’dan büyük olmalıdır')
      return
    }
    void submit(
      async () => {
        if (editing) {
          const target = await api.production.orders.update(id as string, {
            bomId: bomId || null,
            plannedQuantity: qty,
            unit: unit.trim() || 'Adet',
            priority,
            targetBranchId: targetBranchId || null,
            componentSourceBranchId: componentSourceBranchId || null,
            dueDate: dueDate || null,
            notes: notes.trim() || null,
          })
          nav.navigate('production.order.detail', { id: target.id }, target.orderNo)
          return
        }
        if (source === 'mto') {
          const body: CreateFromDemandRequest = {
            productId,
            quantity: qty,
            bomId: bomId || null,
            targetBranchId: targetBranchId || null,
            componentSourceBranchId: componentSourceBranchId || null,
            dueDate: dueDate || null,
            priority,
            notes: notes.trim() || null,
          }
          const target = await api.production.orders.createFromDemand(body)
          nav.navigate('production.order.detail', { id: target.id }, target.orderNo)
          return
        }
        const body: CreateManufacturingOrderRequest = {
          productId,
          bomId: bomId || null,
          plannedQuantity: qty,
          unit: unit.trim() || 'Adet',
          sourceMode: 'mts',
          priority,
          targetBranchId: targetBranchId || null,
          componentSourceBranchId: componentSourceBranchId || null,
          dueDate: dueDate || null,
          notes: notes.trim() || null,
        }
        const target = await api.production.orders.create(body)
        nav.navigate('production.order.detail', { id: target.id }, target.orderNo)
      },
      { errorTitle: 'Kaydedilemedi' },
    )
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Emri düzenle' : 'Yeni üretim emri', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Üretim Emri düzenle' : 'Yeni üretim emri', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={save} />
        ) : undefined
      }
    >
      {loadingExisting ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[4] }}>
              {!editing ? (
                <SegmentedControl options={SOURCE_OPTIONS} value={source} onChange={setSource} />
              ) : null}
              <FormSelect label="Ürün (Mamul)" value={productId} options={productOptions} onChange={pickProduct} />
              <FormSelect label="Reçete" value={bomId} options={bomOptions} onChange={setBomId} />
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Input label="Miktar" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Birim" value={unit} onChangeText={setUnit} />
                </View>
              </View>
              <FormSelect label="Öncelik" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
            </View>
          </Card>

          <Section title="Planlama">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                {canReadBranches ? (
                  <>
                    <FormSelect label="Hedef Şube" value={targetBranchId} options={branchOptions} onChange={setTargetBranchId} />
                    <FormSelect
                      label="Bileşen Kaynak Şube"
                      value={componentSourceBranchId}
                      options={branchOptions}
                      onChange={setComponentSourceBranchId}
                    />
                  </>
                ) : null}
                <FormDatePicker label="Termin" value={dueDate} onChange={setDueDate} mode="date" />
              </View>
            </Card>
          </Section>

          <Section title="Notlar">
            <FormTextArea label="Notlar" placeholder="Emir notları..." value={notes} onChangeText={setNotes} />
          </Section>
        </>
      )}
    </Screen>
  )
}

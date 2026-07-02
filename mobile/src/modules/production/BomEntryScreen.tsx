// Reçete oluştur/düzenle — header alanları + üç bölüm (Bileşenler · Operasyonlar ·
// Yan Ürünler), her biri OrderEntryScreen'in LineSheet desenini kullanan bir alt
// tablo (bottom-sheet) editörüyle yönetilir. Kaydet CreateBomRequest gönderir
// (fire/pay yüzdeleri fraction'a çevrilir).

import * as React from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ProductionPermissions,
  type BomByproductInput,
  type BomComponentInput,
  type BomDto,
  type BomOperationInput,
  type BomType,
  type ConsumptionPolicy,
  type CreateBomRequest,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Icon,
  Input,
  Screen,
  Section,
  type SelectOption,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { BOM_TYPE_LABELS, CONSUMPTION_POLICY_LABELS } from './format'

interface CompRow {
  key: number
  componentProductId: string
  quantity: string
  unit: string
  scrapRate: string
  isOptional: boolean
}
interface OpRow {
  key: number
  sequence: string
  name: string
  workCenterId: string
  setupTimeMinutes: string
  timePerUnitMinutes: string
  qualityCheckRequired: boolean
}
interface ByRow {
  key: number
  productId: string
  quantity: string
  unit: string
  costShareRate: string
}

const TYPE_OPTIONS: SelectOption<BomType>[] = (['manufacture', 'phantom', 'subcontract'] as BomType[]).map((v) => ({
  value: v,
  label: BOM_TYPE_LABELS[v],
}))
const POLICY_OPTIONS: SelectOption<ConsumptionPolicy>[] = (['strict', 'warn', 'flexible'] as ConsumptionPolicy[]).map(
  (v) => ({ value: v, label: CONSUMPTION_POLICY_LABELS[v] }),
)

function emptyComp(key: number): CompRow {
  return { key, componentProductId: '', quantity: '1', unit: 'Adet', scrapRate: '0', isOptional: false }
}
function emptyOp(key: number): OpRow {
  return { key, sequence: '10', name: '', workCenterId: '', setupTimeMinutes: '0', timePerUnitMinutes: '0', qualityCheckRequired: false }
}
function emptyBy(key: number): ByRow {
  return { key, productId: '', quantity: '1', unit: 'Adet', costShareRate: '0' }
}
const pct = (frac: number) => String(Math.round(frac * 1000) / 10)

export function BomEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ProductionPermissions.write)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.production.boms.get(id as string), [id], { enabled: editing })
  const products = useAsync(() => api.inventory.products.list(), [])
  const workCenters = useAsync(() => api.production.workCenters.list(), [])

  const seq = React.useRef(1)
  const nextKey = () => seq.current++

  const [productId, setProductId] = React.useState('')
  const [code, setCode] = React.useState('')
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<BomType>('manufacture')
  const [outputQuantity, setOutputQuantity] = React.useState('1')
  const [unit, setUnit] = React.useState('Adet')
  const [consumptionPolicy, setConsumptionPolicy] = React.useState<ConsumptionPolicy>('strict')
  const [manufLeadTimeDays, setManufLeadTimeDays] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [notes, setNotes] = React.useState('')
  const [components, setComponents] = React.useState<CompRow[]>([])
  const [operations, setOperations] = React.useState<OpRow[]>([])
  const [byproducts, setByproducts] = React.useState<ByRow[]>([])

  const [compSheet, setCompSheet] = React.useState<{ draft: CompRow; isNew: boolean } | null>(null)
  const [opSheet, setOpSheet] = React.useState<{ draft: OpRow; isNew: boolean } | null>(null)
  const [bySheet, setBySheet] = React.useState<{ draft: ByRow; isNew: boolean } | null>(null)

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setProductId(d.productId)
    setCode(d.code)
    setName(d.name)
    setType(d.type)
    setOutputQuantity(String(d.outputQuantity))
    setUnit(d.unit)
    setConsumptionPolicy(d.consumptionPolicy)
    setManufLeadTimeDays(d.manufLeadTimeDays != null ? String(d.manufLeadTimeDays) : '')
    setIsActive(d.isActive)
    setNotes(d.notes ?? '')
    setComponents(
      d.components.map((c) => ({
        key: nextKey(), componentProductId: c.componentProductId, quantity: String(c.quantity),
        unit: c.unit, scrapRate: pct(c.scrapRate), isOptional: c.isOptional,
      })),
    )
    setOperations(
      d.operations.map((o) => ({
        key: nextKey(), sequence: String(o.sequence), name: o.name, workCenterId: o.workCenterId,
        setupTimeMinutes: String(o.setupTimeMinutes), timePerUnitMinutes: String(o.timePerUnitMinutes),
        qualityCheckRequired: o.qualityCheckRequired,
      })),
    )
    setByproducts(
      d.byproducts.map((b) => ({
        key: nextKey(), productId: b.productId, quantity: String(b.quantity), unit: b.unit, costShareRate: pct(b.costShareRate),
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data])

  const productOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Ürün seçin' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
    [products.data],
  )
  const workCenterOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'İş merkezi seçin' }, ...(workCenters.data ?? []).map((w) => ({ value: w.id, label: w.name }))],
    [workCenters.data],
  )
  const nameOf = (list: SelectOption<string>[], v: string) => list.find((o) => o.value === v)?.label

  const upsertComp = (row: CompRow, isNew: boolean) =>
    setComponents((rs) => (isNew ? [...rs, row] : rs.map((r) => (r.key === row.key ? row : r))))
  const upsertOp = (row: OpRow, isNew: boolean) =>
    setOperations((rs) => (isNew ? [...rs, row] : rs.map((r) => (r.key === row.key ? row : r))))
  const upsertBy = (row: ByRow, isNew: boolean) =>
    setByproducts((rs) => (isNew ? [...rs, row] : rs.map((r) => (r.key === row.key ? row : r))))

  const save = () => {
    if (!productId) {
      alert('Ürün seçilmelidir')
      return
    }
    submit(async () => {
      const body: CreateBomRequest = {
        productId,
        code: code.trim() || undefined,
        name: name.trim() || undefined,
        type,
        outputQuantity: Number(outputQuantity) || 1,
        unit: unit.trim() || 'Adet',
        consumptionPolicy,
        manufLeadTimeDays: manufLeadTimeDays === '' ? null : Number(manufLeadTimeDays),
        isActive,
        notes: notes.trim() || null,
        components: components
          .filter((c) => c.componentProductId)
          .map<BomComponentInput>((c, i) => ({
            componentProductId: c.componentProductId,
            quantity: Number(c.quantity) || 0,
            unit: c.unit.trim() || undefined,
            scrapRate: (Number(c.scrapRate) || 0) / 100,
            isOptional: c.isOptional,
            sortOrder: i,
          })),
        operations: operations
          .filter((o) => o.name.trim() && o.workCenterId)
          .map<BomOperationInput>((o, i) => ({
            sequence: Number(o.sequence) || i + 1,
            name: o.name.trim(),
            workCenterId: o.workCenterId,
            setupTimeMinutes: Number(o.setupTimeMinutes) || 0,
            timePerUnitMinutes: Number(o.timePerUnitMinutes) || 0,
            qualityCheckRequired: o.qualityCheckRequired,
            sortOrder: i,
          })),
        byproducts: byproducts
          .filter((b) => b.productId)
          .map<BomByproductInput>((b, i) => ({
            productId: b.productId,
            quantity: Number(b.quantity) || 0,
            unit: b.unit.trim() || undefined,
            costShareRate: (Number(b.costShareRate) || 0) / 100,
            sortOrder: i,
          })),
      }
      let target: BomDto
      if (editing) target = await api.production.boms.update(id as string, body)
      else target = await api.production.boms.create(body)
      nav.navigate('production.bom.detail', { id: target.id }, target.name || target.code)
    })
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Reçete düzenle' : 'Yeni reçete', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Reçete düzenle' : 'Yeni reçete', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <Button title={editing ? 'Kaydet' : 'Oluştur'} icon="check" fullWidth loading={busy} onPress={save} />
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
              <FormSelect label="Ürün (Mamul)" value={productId} options={productOptions} onChange={setProductId} />
              <Input label="Ad" placeholder="Reçete adı" value={name} onChangeText={setName} />
              <Input label="Kod" placeholder="örn. BOM-001" value={code} onChangeText={setCode} />
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <FormSelect label="Tür" value={type} options={TYPE_OPTIONS} onChange={setType} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Çıktı Miktarı" keyboardType="numeric" value={outputQuantity} onChangeText={setOutputQuantity} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Input label="Birim" value={unit} onChangeText={setUnit} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormSelect label="Politika" value={consumptionPolicy} options={POLICY_OPTIONS} onChange={setConsumptionPolicy} />
                </View>
              </View>
              <Input label="Termin (gün)" keyboardType="numeric" value={manufLeadTimeDays} onChangeText={setManufLeadTimeDays} />
              <FormSwitchRow label="Aktif" description="Bu (ürün, sürüm) için güncel reçete." value={isActive} onValueChange={setIsActive} />
              <FormTextArea label="Notlar" placeholder="Reçete notları..." value={notes} onChangeText={setNotes} />
            </View>
          </Card>

          <RowSection
            title={`Bileşenler (${components.length})`}
            emptyLabel="Bileşen eklemek için dokunun"
            onAdd={() => setCompSheet({ draft: emptyComp(nextKey()), isNew: true })}
            rows={components.map((row) => ({
              key: row.key,
              title: nameOf(productOptions, row.componentProductId) || 'Bileşen',
              subtitle: `${row.quantity} ${row.unit}`,
              badges: [
                ...(Number(row.scrapRate) > 0 ? [{ label: `Fire %${row.scrapRate}`, tone: 'muted' as const }] : []),
                ...(row.isOptional ? [{ label: 'Opsiyonel', tone: 'muted' as const }] : []),
              ],
              onPress: () => setCompSheet({ draft: { ...row }, isNew: false }),
            }))}
          />

          <RowSection
            title={`Operasyonlar (${operations.length})`}
            emptyLabel="Operasyon eklemek için dokunun"
            onAdd={() => setOpSheet({ draft: emptyOp(nextKey()), isNew: true })}
            rows={operations.map((row) => ({
              key: row.key,
              title: `${row.sequence}. ${row.name || 'Operasyon'}`,
              subtitle: `${nameOf(workCenterOptions, row.workCenterId) || 'İş merkezi yok'} · ${row.setupTimeMinutes}dk + ${row.timePerUnitMinutes}dk`,
              badges: row.qualityCheckRequired ? [{ label: 'Kalite', tone: 'warning' as const }] : [],
              onPress: () => setOpSheet({ draft: { ...row }, isNew: false }),
            }))}
          />

          <RowSection
            title={`Yan Ürünler (${byproducts.length})`}
            emptyLabel="Yan ürün eklemek için dokunun"
            onAdd={() => setBySheet({ draft: emptyBy(nextKey()), isNew: true })}
            rows={byproducts.map((row) => ({
              key: row.key,
              title: nameOf(productOptions, row.productId) || 'Yan ürün',
              subtitle: `${row.quantity} ${row.unit} · pay %${row.costShareRate}`,
              badges: [],
              onPress: () => setBySheet({ draft: { ...row }, isNew: false }),
            }))}
          />
        </>
      )}

      <ComponentSheet
        state={compSheet}
        productOptions={productOptions}
        onClose={() => setCompSheet(null)}
        onSave={(row, isNew) => { upsertComp(row, isNew); setCompSheet(null) }}
        onDelete={(key) => { setComponents((rs) => rs.filter((r) => r.key !== key)); setCompSheet(null) }}
      />
      <OperationSheet
        state={opSheet}
        workCenterOptions={workCenterOptions}
        onClose={() => setOpSheet(null)}
        onSave={(row, isNew) => { upsertOp(row, isNew); setOpSheet(null) }}
        onDelete={(key) => { setOperations((rs) => rs.filter((r) => r.key !== key)); setOpSheet(null) }}
      />
      <ByproductSheet
        state={bySheet}
        productOptions={productOptions}
        onClose={() => setBySheet(null)}
        onSave={(row, isNew) => { upsertBy(row, isNew); setBySheet(null) }}
        onDelete={(key) => { setByproducts((rs) => rs.filter((r) => r.key !== key)); setBySheet(null) }}
      />
    </Screen>
  )
}

// ── Reusable row section (add button + tappable rows / empty prompt) ───────────
interface RowView {
  key: number
  title: string
  subtitle: string
  badges: { label: string; tone: 'muted' | 'warning' }[]
  onPress: () => void
}
function RowSection({ title, emptyLabel, onAdd, rows }: { title: string; emptyLabel: string; onAdd: () => void; rows: RowView[] }) {
  const t = useTheme()
  return (
    <Section title={title} action={<Button title="Ekle" icon="plus" size="sm" variant="ghost" onPress={onAdd} />}>
      {rows.length === 0 ? (
        <Pressable onPress={onAdd}>
          <Card>
            <View style={{ alignItems: 'center', gap: t.spacing[2], paddingVertical: t.spacing[4] }}>
              <Icon name="plus-circle" size={28} color={t.colors.mutedForeground} />
              <Text tone="muted">{emptyLabel}</Text>
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card padded={false}>
          {rows.map((row, idx) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: t.spacing[3],
                paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3],
                borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: t.colors.border,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text weight="medium" numberOfLines={1}>{row.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5], flexWrap: 'wrap' }}>
                  <Text variant="caption" tone="muted">{row.subtitle}</Text>
                  {row.badges.map((b, i) => (
                    <Badge key={i} label={b.label} tone={b.tone} />
                  ))}
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
            </Pressable>
          ))}
        </Card>
      )}
    </Section>
  )
}

// ── Bottom-sheet shell (mirrors OrderEntryScreen LineSheet chrome) ────────────
function SheetShell({
  title, isNew, onClose, onSave, onDelete, saveDisabled, children,
}: {
  title: string
  isNew: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  saveDisabled?: boolean
  children: React.ReactNode
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: t.radius['2xl'], borderTopRightRadius: t.radius['2xl'], maxHeight: '92%', paddingTop: t.spacing[3] }}>
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <Text variant="title" weight="semibold">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Icon name="x" size={22} color={t.colors.mutedForeground} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
            {children}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], paddingBottom: insets.bottom + t.spacing[3], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            {!isNew ? <Button title="Sil" variant="outline" icon="trash-2" onPress={onDelete} /> : null}
            <View style={{ flex: 1 }}>
              <Button title={isNew ? 'Ekle' : 'Kaydet'} icon="check" fullWidth disabled={saveDisabled} onPress={onSave} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ComponentSheet({
  state, productOptions, onClose, onSave, onDelete,
}: {
  state: { draft: CompRow; isNew: boolean } | null
  productOptions: SelectOption<string>[]
  onClose: () => void
  onSave: (row: CompRow, isNew: boolean) => void
  onDelete: (key: number) => void
}) {
  const t = useTheme()
  const [draft, setDraft] = React.useState<CompRow | null>(null)
  React.useEffect(() => { setDraft(state ? { ...state.draft } : null) }, [state])
  if (!state || !draft) return <Modal visible={false} transparent />
  const set = (patch: Partial<CompRow>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  return (
    <SheetShell
      title={state.isNew ? 'Bileşen ekle' : 'Bileşeni düzenle'}
      isNew={state.isNew}
      onClose={onClose}
      onDelete={() => onDelete(draft.key)}
      saveDisabled={!draft.componentProductId}
      onSave={() => onSave(draft, state.isNew)}
    >
      <FormSelect label="Ürün" value={draft.componentProductId} options={productOptions} onChange={(v) => set({ componentProductId: v })} />
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <View style={{ flex: 1 }}><Input label="Miktar" keyboardType="numeric" value={draft.quantity} onChangeText={(v) => set({ quantity: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Birim" value={draft.unit} onChangeText={(v) => set({ unit: v })} /></View>
      </View>
      <Input label="Fire %" keyboardType="numeric" value={draft.scrapRate} onChangeText={(v) => set({ scrapRate: v })} />
      <FormSwitchRow label="Opsiyonel" value={draft.isOptional} onValueChange={(v) => set({ isOptional: v })} />
    </SheetShell>
  )
}

function OperationSheet({
  state, workCenterOptions, onClose, onSave, onDelete,
}: {
  state: { draft: OpRow; isNew: boolean } | null
  workCenterOptions: SelectOption<string>[]
  onClose: () => void
  onSave: (row: OpRow, isNew: boolean) => void
  onDelete: (key: number) => void
}) {
  const t = useTheme()
  const [draft, setDraft] = React.useState<OpRow | null>(null)
  React.useEffect(() => { setDraft(state ? { ...state.draft } : null) }, [state])
  if (!state || !draft) return <Modal visible={false} transparent />
  const set = (patch: Partial<OpRow>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  return (
    <SheetShell
      title={state.isNew ? 'Operasyon ekle' : 'Operasyonu düzenle'}
      isNew={state.isNew}
      onClose={onClose}
      onDelete={() => onDelete(draft.key)}
      saveDisabled={!draft.name.trim() || !draft.workCenterId}
      onSave={() => onSave(draft, state.isNew)}
    >
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <View style={{ flex: 1 }}><Input label="Sıra" keyboardType="numeric" value={draft.sequence} onChangeText={(v) => set({ sequence: v })} /></View>
        <View style={{ flex: 2 }}><Input label="Ad" value={draft.name} onChangeText={(v) => set({ name: v })} /></View>
      </View>
      <FormSelect label="İş Merkezi" value={draft.workCenterId} options={workCenterOptions} onChange={(v) => set({ workCenterId: v })} />
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <View style={{ flex: 1 }}><Input label="Hazırlık (dk)" keyboardType="numeric" value={draft.setupTimeMinutes} onChangeText={(v) => set({ setupTimeMinutes: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Birim Süre (dk)" keyboardType="numeric" value={draft.timePerUnitMinutes} onChangeText={(v) => set({ timePerUnitMinutes: v })} /></View>
      </View>
      <FormSwitchRow label="Kalite kontrol gerekli" value={draft.qualityCheckRequired} onValueChange={(v) => set({ qualityCheckRequired: v })} />
    </SheetShell>
  )
}

function ByproductSheet({
  state, productOptions, onClose, onSave, onDelete,
}: {
  state: { draft: ByRow; isNew: boolean } | null
  productOptions: SelectOption<string>[]
  onClose: () => void
  onSave: (row: ByRow, isNew: boolean) => void
  onDelete: (key: number) => void
}) {
  const t = useTheme()
  const [draft, setDraft] = React.useState<ByRow | null>(null)
  React.useEffect(() => { setDraft(state ? { ...state.draft } : null) }, [state])
  if (!state || !draft) return <Modal visible={false} transparent />
  const set = (patch: Partial<ByRow>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  return (
    <SheetShell
      title={state.isNew ? 'Yan ürün ekle' : 'Yan ürünü düzenle'}
      isNew={state.isNew}
      onClose={onClose}
      onDelete={() => onDelete(draft.key)}
      saveDisabled={!draft.productId}
      onSave={() => onSave(draft, state.isNew)}
    >
      <FormSelect label="Ürün" value={draft.productId} options={productOptions} onChange={(v) => set({ productId: v })} />
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <View style={{ flex: 1 }}><Input label="Miktar" keyboardType="numeric" value={draft.quantity} onChangeText={(v) => set({ quantity: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Birim" value={draft.unit} onChangeText={(v) => set({ unit: v })} /></View>
      </View>
      <Input label="Maliyet Payı %" keyboardType="numeric" value={draft.costShareRate} onChangeText={(v) => set({ costShareRate: v })} />
    </SheetShell>
  )
}

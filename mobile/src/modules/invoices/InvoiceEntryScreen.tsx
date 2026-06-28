import * as React from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  INVOICE_TYPES,
  InvoicesPermissions,
  OrgPermissions,
  VAT_RATES,
  WITHHOLDING_RATIOS,
  computeInvoiceTotals,
  computeLine,
  type CreateInvoiceLineInput,
  type InvoiceType,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Icon,
  Input,
  Screen,
  Section,
  SegmentedControl,
  type SegmentOption,
  type SelectOption,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, TYPE_LABELS } from './format'

interface LineRow {
  key: number
  productId: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  discountRate: string
  vatRate: string
  withholdingCode: string
}

const TYPE_OPTIONS: SegmentOption<InvoiceType>[] = INVOICE_TYPES.map((ty) => ({ value: ty, label: TYPE_LABELS[ty] }))
const VAT_OPTIONS: SelectOption<string>[] = VAT_RATES.map((r) => ({ value: String(r), label: `%${r}` }))
const WITHHOLDING_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Yok' },
  ...WITHHOLDING_RATIOS.map((w) => ({ value: w.code, label: w.label })),
]

function emptyRow(key: number): LineRow {
  return { key, productId: '', description: '', quantity: '1', unit: 'Adet', unitPrice: '0', discountRate: '0', vatRate: '20', withholdingCode: '' }
}
function toLineInput(row: LineRow) {
  return { quantity: Number(row.quantity) || 0, unitPrice: Number(row.unitPrice) || 0, discountRate: Number(row.discountRate) || 0, vatRate: Number(row.vatRate) || 0, withholdingCode: row.withholdingCode || null }
}
function toCreateLine(row: LineRow, sortOrder: number): CreateInvoiceLineInput {
  return {
    productId: row.productId || null,
    description: row.description.trim(),
    quantity: Number(row.quantity) || 0,
    unit: row.unit.trim() || 'Adet',
    unitPrice: Number(row.unitPrice) || 0,
    discountRate: Number(row.discountRate) || 0,
    vatRate: Number(row.vatRate) || 0,
    withholdingCode: row.withholdingCode || null,
    sortOrder,
  }
}

export function InvoiceEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InvoicesPermissions.write)
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.invoices.get(id as string), [id], { enabled: editing })
  const contacts = useAsync(() => api.contacts.contacts.list(), [])
  const products = useAsync(() => api.inventory.products.list(), [])
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: canReadBranches })

  const seq = React.useRef(1)
  const nextKey = () => seq.current++

  const [type, setType] = React.useState<InvoiceType>(() => {
    const ty = nav.current.params?.type
    return !id && (ty === 'sales' || ty === 'purchase' || ty === 'return') ? (ty as InvoiceType) : 'sales'
  })
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [dueDate, setDueDate] = React.useState('')
  const [contactId, setContactId] = React.useState(() =>
    !id && nav.current.params?.contactId ? String(nav.current.params.contactId) : '',
  )
  const [branchId, setBranchId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [rows, setRows] = React.useState<LineRow[]>([])
  // Bottom-sheet line editor state.
  const [sheet, setSheet] = React.useState<{ draft: LineRow; isNew: boolean } | null>(null)

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    if (d.status !== 'draft') {
      nav.navigate('invoices.invoices.detail', { id: d.id }, d.number || 'Fatura')
      return
    }
    setType(d.type)
    setDate(d.date)
    setDueDate(d.dueDate ?? '')
    setContactId(d.contactId)
    setBranchId(d.branchId ?? '')
    setNotes(d.notes ?? '')
    setRows(
      d.lines.map((l) => ({
        key: nextKey(), productId: l.productId ?? '', description: l.description,
        quantity: String(l.quantity), unit: l.unit, unitPrice: String(l.unitPrice),
        discountRate: String(l.discountRate), vatRate: String(l.vatRate), withholdingCode: l.withholdingCode ?? '',
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data])

  const contactOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Cari seçin' }, ...(contacts.data ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [contacts.data],
  )
  const productOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Ürün seçin (opsiyonel)' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
    [products.data],
  )
  const branchOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Şube yok' }, ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branches.data],
  )

  const upsertRow = (row: LineRow, isNew: boolean) =>
    setRows((rs) => (isNew ? [...rs, row] : rs.map((r) => (r.key === row.key ? row : r))))
  const removeRow = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key))

  const totals = React.useMemo(() => computeInvoiceTotals(rows.map(toLineInput)), [rows])

  const save = (mode: 'draft' | 'issued') => {
    if (!contactId) { alert('Cari seçilmelidir'); return }
    const lines = rows.filter((r) => r.description.trim() || r.productId)
    if (lines.length === 0) { alert('En az bir kalem girilmelidir'); return }
    submit(async () => {
      const base = { type, date, dueDate: dueDate || null, contactId, branchId: branchId || null, currencyCode: 'TRY', notes: notes.trim() || null, lines: lines.map((r, i) => toCreateLine(r, i)) }
      let targetId = id ?? ''
      let number = ''
      if (editing) {
        const updated = await api.invoices.update(id as string, { ...base, status: 'draft' })
        targetId = updated.id
        number = mode === 'issued' ? (await api.invoices.issue(id as string)).number : updated.number
      } else {
        const created = await api.invoices.create({ ...base, status: mode })
        targetId = created.id
        number = created.number
      }
      nav.navigate('invoices.invoices.detail', { id: targetId }, number || 'Fatura')
    })
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Fatura düzenle' : 'Yeni fatura', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Fatura düzenle' : 'Yeni fatura', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <View style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="overline" tone="muted">Genel Toplam</Text>
                <Text variant="h1" style={{ fontFamily: 'monospace' }} numberOfLines={1}>{formatMoney(totals.grandTotal)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text variant="caption" tone="muted">KDV {formatMoney(totals.vatTotal)}</Text>
                {totals.withholdingTotal > 0 ? <Text variant="caption" tone="muted">Tevkifat {formatMoney(totals.withholdingTotal)}</Text> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}><Button title="Taslak" variant="outline" fullWidth loading={busy} onPress={() => save('draft')} /></View>
              <View style={{ flex: 1 }}><Button title="Kes" icon="check" fullWidth loading={busy} onPress={() => save('issued')} /></View>
            </View>
          </View>
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
              <View style={{ gap: t.spacing[1.5] }}>
                <Text variant="label" tone="muted" weight="medium">Fatura türü</Text>
                <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
              </View>
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}><FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" /></View>
                <View style={{ flex: 1 }}><FormDatePicker label="Vade" value={dueDate} onChange={setDueDate} mode="date" /></View>
              </View>
              <View style={{ gap: t.spacing[1.5] }}>
                <FormSelect label="Cari" value={contactId} options={contactOptions} onChange={setContactId} />
                <Pressable onPress={() => nav.navigate('contacts.contacts.form', {}, 'Yeni cari')} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                  <Text variant="caption" tone="primary" weight="semibold">+ Yeni cari</Text>
                </Pressable>
              </View>
              {canReadBranches ? (
                <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />
              ) : null}
            </View>
          </Card>

          <Section
            title={`Kalemler (${rows.length})`}
            action={<Button title="Kalem ekle" icon="plus" size="sm" variant="ghost" onPress={() => setSheet({ draft: emptyRow(nextKey()), isNew: true })} />}
          >
            {rows.length === 0 ? (
              <Pressable onPress={() => setSheet({ draft: emptyRow(nextKey()), isNew: true })}>
                <Card>
                  <View style={{ alignItems: 'center', gap: t.spacing[2], paddingVertical: t.spacing[4] }}>
                    <Icon name="plus-circle" size={28} color={t.colors.mutedForeground} />
                    <Text tone="muted">Kalem eklemek için dokunun</Text>
                  </View>
                </Card>
              </Pressable>
            ) : (
              <Card padded={false}>
                {rows.map((row, idx) => {
                  const computed = computeLine(toLineInput(row))
                  return (
                    <Pressable
                      key={row.key}
                      onPress={() => setSheet({ draft: { ...row }, isNew: false })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: t.spacing[3],
                        paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3],
                        borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: t.colors.border,
                      }}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text weight="medium" numberOfLines={1}>{row.description || 'Yeni kalem'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                          <Text variant="caption" tone="muted">
                            {row.quantity} {row.unit} × {formatMoney(Number(row.unitPrice) || 0)}
                          </Text>
                          <Badge label={`KDV %${row.vatRate}`} tone="muted" />
                          {row.withholdingCode ? <Badge label={`Tevk. ${row.withholdingCode}`} tone="warning" /> : null}
                        </View>
                      </View>
                      <Text weight="bold" style={{ fontFamily: 'monospace' }}>{formatMoney(computed.lineTotal)}</Text>
                      <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
                    </Pressable>
                  )
                })}
              </Card>
            )}
          </Section>

          <Section title="Notlar">
            <FormTextArea label="Notlar" placeholder="Fatura notları..." value={notes} onChangeText={setNotes} />
          </Section>
        </>
      )}

      <LineSheet
        state={sheet}
        type={type}
        productOptions={productOptions}
        products={products.data ?? []}
        onClose={() => setSheet(null)}
        onSave={(row, isNew) => { upsertRow(row, isNew); setSheet(null) }}
        onDelete={(key) => { removeRow(key); setSheet(null) }}
        onNewProduct={() => nav.navigate('inventory.products.form', {}, 'Yeni ürün')}
      />
    </Screen>
  )
}

// ── Bottom-sheet line editor ──────────────────────────────────────────────────
function LineSheet({
  state, type, productOptions, products, onClose, onSave, onDelete, onNewProduct,
}: {
  state: { draft: LineRow; isNew: boolean } | null
  type: InvoiceType
  productOptions: SelectOption<string>[]
  products: { id: string; name: string; unit?: string; salePrice?: number | null; purchasePrice?: number | null; taxRate?: number | null }[]
  onClose: () => void
  onSave: (row: LineRow, isNew: boolean) => void
  onDelete: (key: number) => void
  onNewProduct: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = React.useState<LineRow | null>(null)

  React.useEffect(() => { setDraft(state ? { ...state.draft } : null) }, [state])

  if (!state || !draft) return <Modal visible={false} transparent />
  const set = (patch: Partial<LineRow>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const pickProduct = (productId: string) => {
    const p = products.find((it) => it.id === productId)
    if (!p) { set({ productId: '' }); return }
    const price = type === 'purchase' ? (p.purchasePrice ?? p.salePrice) : (p.salePrice ?? p.purchasePrice)
    set({ productId, description: p.name, unit: p.unit || 'Adet', unitPrice: price != null ? String(price) : '0', vatRate: p.taxRate != null ? String(p.taxRate) : '20' })
  }
  const computed = computeLine(toLineInput(draft))
  const valid = draft.description.trim().length > 0 || !!draft.productId

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: t.radius['2xl'], borderTopRightRadius: t.radius['2xl'], maxHeight: '92%', paddingTop: t.spacing[3] }}>
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <Text variant="title" weight="semibold">{state.isNew ? 'Kalem ekle' : 'Kalemi düzenle'}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Icon name="x" size={22} color={t.colors.mutedForeground} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
            <View style={{ gap: t.spacing[1.5] }}>
              <FormSelect label="Ürün" value={draft.productId} options={productOptions} onChange={pickProduct} />
              <Pressable onPress={onNewProduct} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                <Text variant="caption" tone="primary" weight="semibold">+ Yeni ürün</Text>
              </Pressable>
            </View>
            <Input label="Açıklama" placeholder="Mal / hizmet açıklaması" value={draft.description} onChangeText={(v) => set({ description: v })} />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}><Input label="Miktar" keyboardType="numeric" value={draft.quantity} onChangeText={(v) => set({ quantity: v })} /></View>
              <View style={{ flex: 1 }}><Input label="Birim" value={draft.unit} onChangeText={(v) => set({ unit: v })} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}><Input label="Birim Fiyat" keyboardType="numeric" value={draft.unitPrice} onChangeText={(v) => set({ unitPrice: v })} /></View>
              <View style={{ flex: 1 }}><Input label="İskonto %" keyboardType="numeric" value={draft.discountRate} onChangeText={(v) => set({ discountRate: v })} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}><FormSelect label="KDV %" value={draft.vatRate} options={VAT_OPTIONS} onChange={(v) => set({ vatRate: v })} /></View>
              <View style={{ flex: 1 }}><FormSelect label="Tevkifat" value={draft.withholdingCode} options={WITHHOLDING_OPTIONS} onChange={(v) => set({ withholdingCode: v })} /></View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing[3] }}>
              <Text variant="label" tone="muted" weight="medium">Satır toplamı</Text>
              <Text variant="title" weight="bold" style={{ fontFamily: 'monospace' }}>{formatMoney(computed.lineTotal)}</Text>
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], paddingBottom: insets.bottom + t.spacing[3], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            {!state.isNew ? (
              <Button title="Sil" variant="outline" icon="trash-2" onPress={() => onDelete(draft.key)} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Button title={state.isNew ? 'Ekle' : 'Kaydet'} icon="check" fullWidth disabled={!valid} onPress={() => onSave(draft, state.isNew)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

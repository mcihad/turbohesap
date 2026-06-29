import * as React from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileCheck2, PanelRightOpen, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  computeInvoiceTotals,
  computeLine,
  ORDER_DIRECTIONS,
  ORDER_DIRECTION_LABELS,
  ORDER_KIND_LABELS,
  OrdersPermissions,
  OrgPermissions,
  toApiError,
  VAT_RATES,
  WITHHOLDING_RATIOS,
  type OrderDirection,
  type OrderKind,
  type SellableUnitDto,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContactDialog } from '@/modules/contacts/components/contact-dialog'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { QuickProductDialog } from '@/modules/invoices/components/quick-product-dialog'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'
import { formatMoney } from '../format'

const SUMMARY_MIN = 300
const SUMMARY_MAX = 560
const SUMMARY_DEFAULT = 360

const NO_WH = '__none__'
const NO_BRANCH = '__nobranch__'

const KIND_NEW_TITLE: Record<OrderKind, string> = {
  quote: 'Yeni Teklif',
  order: 'Yeni Sipariş',
  delivery: 'Yeni İrsaliye',
}
const KIND_EDIT_TITLE: Record<OrderKind, string> = {
  quote: 'Teklifi Düzenle',
  order: 'Siparişi Düzenle',
  delivery: 'İrsaliyeyi Düzenle',
}
// Quote → "geçerlilik", order/delivery → "termin/sevk" date.
const SECONDARY_DATE_LABEL: Record<OrderKind, string> = {
  quote: 'Geçerlilik',
  order: 'Termin',
  delivery: 'Sevk Tarihi',
}

interface LineRow {
  key: string
  productId: string | null
  description: string
  quantity: string
  unit: string
  unitPrice: string
  discountRate: string
  vatRate: number
  withholdingCode: string | null
}

let rowSeq = 0
function emptyRow(): LineRow {
  return { key: `r${rowSeq++}`, productId: null, description: '', quantity: '1', unit: 'Adet', unitPrice: '0', discountRate: '0', vatRate: 20, withholdingCode: null }
}

// Return type is inferred so `unitPrice` etc. stay required `number` — that lets
// the row feed both `computeInvoiceTotals` (LineInput) and the create request.
function toInput(r: LineRow) {
  return {
    productId: r.productId,
    description: r.description,
    quantity: Number(r.quantity) || 0,
    unit: r.unit,
    unitPrice: Number(r.unitPrice) || 0,
    discountRate: Number(r.discountRate) || 0,
    vatRate: r.vatRate,
    withholdingCode: r.withholdingCode,
  }
}

export function OrderEntryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const params = useParams({ strict: false }) as { id?: string }
  const search = useSearch({ strict: false }) as { kind?: OrderKind; direction?: OrderDirection; contactId?: string }
  const editId = params.id ?? null

  // The document kind is fixed for the life of a document; new docs read it from
  // the route search, edits hydrate it from the loaded draft.
  const [kind, setKind] = React.useState<OrderKind>(search.kind ?? 'quote')
  const [direction, setDirection] = React.useState<OrderDirection>(search.direction ?? 'sales')
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [contactId, setContactId] = React.useState<string | null>(search.contactId ?? null)
  const [branchId, setBranchId] = React.useState<string>('')
  const [currencyCode, setCurrencyCode] = React.useState('TRY')
  const [notes, setNotes] = React.useState('')
  const [lines, setLines] = React.useState<LineRow[]>([emptyRow()])
  const [contactDialog, setContactDialog] = React.useState(false)
  const [productDialog, setProductDialog] = React.useState<{ row: number; name: string } | null>(null)

  // Collapsible / resizable summary sidebar (splitter, like the invoice entry).
  const [summaryOpen, setSummaryOpen] = React.useState(true)
  const [summaryW, setSummaryW] = React.useState(SUMMARY_DEFAULT)
  const [isWide, setIsWide] = React.useState(true)
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const summaryDrag = React.useRef<{ startX: number; startW: number } | null>(null)
  const onSummaryDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    summaryDrag.current = { startX: e.clientX, startW: summaryW }
  }
  const onSummaryMove = (e: React.PointerEvent) => {
    if (!summaryDrag.current) return
    const next = summaryDrag.current.startW + (summaryDrag.current.startX - e.clientX)
    setSummaryW(Math.max(SUMMARY_MIN, Math.min(SUMMARY_MAX, next)))
  }
  const onSummaryUp = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    summaryDrag.current = null
  }

  const contactsQuery = useQuery({ queryKey: ['contacts', 'contacts'], queryFn: () => api.contacts.contacts.list() })
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const editQuery = useQuery({
    queryKey: ['orders', editId],
    queryFn: () => api.orders.get(editId as string),
    enabled: !!editId,
  })

  // Hydrate the form from the loaded draft EXACTLY ONCE per edit session, so a
  // background refetch never clobbers unsaved edits.
  const hydratedRef = React.useRef(false)
  React.useEffect(() => {
    const doc = editQuery.data
    if (!doc) return
    if (doc.status !== 'draft') {
      navigate({ to: '/orders/$id', params: { id: doc.id } })
      return
    }
    if (hydratedRef.current) return
    hydratedRef.current = true
    setKind(doc.kind)
    setDirection(doc.direction)
    setDate(doc.date.slice(0, 10))
    setValidUntil(doc.validUntil?.slice(0, 10) ?? '')
    setDueDate(doc.dueDate?.slice(0, 10) ?? '')
    setContactId(doc.contactId)
    setBranchId(doc.branchId ?? '')
    setCurrencyCode(doc.currencyCode)
    setNotes(doc.notes ?? '')
    setLines(
      doc.lines.map((l) => ({
        key: `r${rowSeq++}`, productId: l.productId, description: l.description,
        quantity: String(l.quantity), unit: l.unit, unitPrice: String(l.unitPrice),
        discountRate: String(l.discountRate), vatRate: l.vatRate, withholdingCode: l.withholdingCode,
      })),
    )
  }, [editQuery.data, navigate])

  const contacts = contactsQuery.data ?? []
  const totals = React.useMemo(() => computeInvoiceTotals(lines.map(toInput)), [lines])
  const selectedContact = contacts.find((c) => c.id === contactId) ?? null

  const setRow = (i: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setLines((rows) => [...rows, emptyRow()])
  const removeRow = (i: number) => setLines((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  const priceForUnit = (u: SellableUnitDto) =>
    String((direction === 'purchase' ? u.purchasePrice : u.salePrice) ?? u.salePrice ?? 0)

  // The backend only accepts the legal KDV rates; snap a legacy rate to nearest.
  const validVat = (rate?: number | null): number => {
    if (rate == null) return 20
    if (VAT_RATES.includes(rate)) return rate
    return VAT_RATES.reduce((best, v) => (Math.abs(v - rate) < Math.abs(best - rate) ? v : best), 20)
  }

  const unitToRow = (u: SellableUnitDto): LineRow => ({
    key: `r${rowSeq++}`,
    productId: u.productId,
    description: u.label,
    quantity: '1',
    unit: u.unit || 'Adet',
    unitPrice: priceForUnit(u),
    discountRate: '0',
    vatRate: validVat(u.taxRate),
    withholdingCode: null,
  })

  const pickUnit = (i: number, u: SellableUnitDto | null) => {
    if (!u) { setRow(i, { productId: null }); return }
    setRow(i, {
      productId: u.productId,
      description: u.label,
      unit: u.unit || 'Adet',
      unitPrice: priceForUnit(u),
      vatRate: validVat(u.taxRate),
    })
  }

  // Magnifier multi-pick: each selected unit becomes its own line.
  const addUnits = (i: number, list: SellableUnitDto[]) => {
    if (!list.length) return
    setLines((rows) => {
      const made = list.map(unitToRow)
      const target = rows[i]
      const copy = [...rows]
      if (target && !target.productId && !target.description.trim()) copy.splice(i, 1, ...made)
      else copy.splice(i + 1, 0, ...made)
      return copy
    })
  }

  const buildPayload = () => ({
    kind,
    direction,
    date,
    validUntil: validUntil || null,
    dueDate: dueDate || null,
    contactId: contactId as string,
    branchId: branchId || null,
    currencyCode,
    notes: notes || null,
    lines: lines.filter((l) => l.description.trim() || l.productId).map(toInput),
  })

  const save = useMutation({
    mutationFn: async (confirm: boolean) => {
      if (!contactId) throw new Error('Cari seçilmelidir')
      if (!lines.some((l) => l.description.trim() || l.productId)) throw new Error('En az bir kalem girilmelidir')
      if (editId) {
        const { kind: _k, direction: _d, ...patch } = buildPayload()
        await api.orders.update(editId, patch)
        return confirm ? api.orders.confirm(editId) : api.orders.get(editId)
      }
      return api.orders.create({ ...buildPayload(), confirm })
    },
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: ['orders'] })
      void qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Belge kaydedildi')
      navigate({ to: '/orders/$id', params: { id: doc.id } })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const confirmLabel = kind === 'delivery' ? 'Kaydet ve Sevk Et' : 'Kaydet ve Onayla'

  const actionButtons = (
    <>
      <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate(false)}>
        <Save className="size-4" />Taslak
      </Button>
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(true)}>
        <FileCheck2 className="size-4" />{confirmLabel}
      </Button>
    </>
  )

  return (
    <PermissionRequired permission={OrdersPermissions.write}>
      <div className="flex h-full flex-col bg-muted/30">
        {/* Sticky toolbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-[var(--app-page-padding-x)] py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate({ to: '/orders' })} aria-label="Geri">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">
              {editId ? KIND_EDIT_TITLE[kind] : KIND_NEW_TITLE[kind]}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {ORDER_KIND_LABELS[kind]} · {ORDER_DIRECTION_LABELS[direction]} · {selectedContact ? selectedContact.name : 'cari seçilmedi'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">{actionButtons}</div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex w-full flex-col gap-4 px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)] lg:flex-row lg:items-start">
            {/* Document */}
            <div className="min-w-0 flex-1 space-y-4">
              {/* Header fields */}
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <SegmentedDirection value={direction} onChange={setDirection} />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <Label className="mb-1.5 block text-xs text-muted-foreground">Cari</Label>
                    <EntityCombobox
                      items={contacts}
                      value={contactId}
                      onChange={(id) => setContactId(id)}
                      getId={(c) => c.id}
                      getLabel={(c) => c.name}
                      getSub={(c) => c.code}
                      placeholder="Cari seçin"
                      searchPlaceholder="Cari ara (ünvan/kod)…"
                      emptyText="Cari bulunamadı"
                      onCreate={() => setContactDialog(true)}
                      createLabel="Yeni cari ekle"
                    />
                    {selectedContact ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedContact.taxNumber || selectedContact.nationalId || '—'}
                        {selectedContact.balance ? ` · Bakiye ${formatMoney(selectedContact.balance, selectedContact.currencyCode)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="mb-1.5 block text-xs text-muted-foreground">Tarih</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="mb-1.5 block text-xs text-muted-foreground">{SECONDARY_DATE_LABEL[kind]}</Label>
                    <Input
                      type="date"
                      value={kind === 'quote' ? validUntil : dueDate}
                      onChange={(e) => (kind === 'quote' ? setValidUntil(e.target.value) : setDueDate(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="mb-1.5 block text-xs text-muted-foreground">Para Birimi</Label>
                    <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} />
                  </div>
                  {(branchesQuery.data ?? []).length > 0 ? (
                    <div className="sm:col-span-3">
                      <Label className="mb-1.5 block text-xs text-muted-foreground">Şube</Label>
                      <Select value={branchId || NO_BRANCH} onValueChange={(v) => setBranchId(v === NO_BRANCH ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Şube seçin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_BRANCH}>Şube yok</SelectItem>
                          {(branchesQuery.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Line items */}
              <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <h2 className="text-sm font-medium">Kalemler <span className="ml-1 text-xs text-muted-foreground">({lines.length})</span></h2>
                  <div className="flex items-center gap-1">
                    {isWide && !summaryOpen ? (
                      <Button variant="outline" size="sm" onClick={() => setSummaryOpen(true)} className="gap-1.5">
                        <PanelRightOpen className="size-4" />Özet
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={addRow}><Plus className="size-4" />Satır ekle</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Ürün / Açıklama</th>
                        <th className="w-24 px-2 py-2 text-right font-medium">Miktar</th>
                        <th className="w-24 px-2 py-2 text-left font-medium">Birim</th>
                        <th className="w-28 px-2 py-2 text-right font-medium">B.Fiyat</th>
                        <th className="w-20 px-2 py-2 text-right font-medium">İsk%</th>
                        <th className="w-24 px-2 py-2 text-right font-medium">KDV</th>
                        <th className="w-28 px-2 py-2 text-left font-medium">Tevkifat</th>
                        <th className="w-28 px-3 py-2 text-right font-medium">Tutar</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((r, i) => {
                        const c = computeLine(toInput(r))
                        return (
                          <tr key={r.key} className="group border-b align-top transition-colors last:border-0 focus-within:bg-accent/30 hover:bg-accent/20">
                            <td className="px-3 py-2">
                              <div className="space-y-1.5">
                                <ProductPickerField
                                  value={r.productId}
                                  onChange={(u) => pickUnit(i, u)}
                                  allowMulti
                                  onPickMulti={(units) => addUnits(i, units)}
                                  placeholder="Ürün seç…"
                                  onCreate={(q) => setProductDialog({ row: i, name: q })}
                                  createLabel="Yeni ürün ekle"
                                  title="Belgeye ürün ekle"
                                />
                                <Input value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} placeholder="Açıklama" className="h-8 border-dashed text-xs" />
                              </div>
                            </td>
                            <td className="px-2 py-2"><Cell value={r.quantity} onChange={(v) => setRow(i, { quantity: v })} numeric /></td>
                            <td className="px-2 py-2"><Cell value={r.unit} onChange={(v) => setRow(i, { unit: v })} /></td>
                            <td className="px-2 py-2"><Cell value={r.unitPrice} onChange={(v) => setRow(i, { unitPrice: v })} numeric /></td>
                            <td className="px-2 py-2"><Cell value={r.discountRate} onChange={(v) => setRow(i, { discountRate: v })} numeric /></td>
                            <td className="px-2 py-2">
                              <Select value={String(r.vatRate)} onValueChange={(v) => setRow(i, { vatRate: Number(v) })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>{VAT_RATES.map((v) => <SelectItem key={v} value={String(v)}>%{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-2">
                              <Select value={r.withholdingCode ?? NO_WH} onValueChange={(v) => setRow(i, { withholdingCode: v === NO_WH ? null : v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_WH}>Yok</SelectItem>
                                  {WITHHOLDING_RATIOS.map((w) => <SelectItem key={w.code} value={w.code}>{w.code}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-right align-middle font-medium tabular-nums">{formatMoney(c.lineTotal, currencyCode)}</td>
                            <td className="px-1 align-middle">
                              <Button variant="ghost" size="icon-sm" onClick={() => removeRow(i)} aria-label="Sil" className="opacity-0 transition-opacity group-hover:opacity-100">
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t px-4 py-2">
                  <Button variant="ghost" size="sm" onClick={addRow} className="text-muted-foreground"><Plus className="size-4" />Yeni satır</Button>
                </div>
              </section>

              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Notlar</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Belge notu / dipnot…" />
              </section>
            </div>

            {/* Splitter — drag to resize the summary (lg only). */}
            {isWide && summaryOpen ? (
              <div
                onPointerDown={onSummaryDown}
                onPointerMove={onSummaryMove}
                onPointerUp={onSummaryUp}
                title="Sürükleyerek boyutlandır"
                className="group hidden w-2 shrink-0 cursor-col-resize touch-none self-stretch lg:flex"
              >
                <div className="mx-auto w-px bg-border transition-colors group-hover:bg-primary" />
              </div>
            ) : null}

            {/* Summary — collapsible right sidebar (stacks below on narrow screens) */}
            <aside
              className={cn('w-full lg:sticky lg:top-4 lg:shrink-0', isWide && !summaryOpen && 'lg:hidden')}
              style={isWide ? { width: summaryOpen ? summaryW : 0 } : undefined}
            >
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Özet</span>
                    <button
                      type="button"
                      onClick={() => setSummaryOpen(false)}
                      className="hidden rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:inline-flex"
                      aria-label="Özeti gizle"
                      title="Özeti gizle"
                    >
                      <PanelRightOpen className="size-4 rotate-180" />
                    </button>
                  </div>
                  <div className="space-y-2 p-4 text-sm">
                    <SumRow label="Ara toplam" value={formatMoney(totals.subtotal, currencyCode)} />
                    {totals.discountTotal > 0 ? <SumRow label="İskonto" value={`− ${formatMoney(totals.discountTotal, currencyCode)}`} /> : null}
                    <SumRow label="KDV matrahı" value={formatMoney(totals.vatBase, currencyCode)} muted />
                    {totals.vatSummary.length > 0 ? (
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">KDV Özeti</div>
                        {totals.vatSummary.map((v) => (
                          <SumRow key={v.rate} small label={`%${v.rate} (${formatMoney(v.base, currencyCode)})`} value={formatMoney(v.vat, currencyCode)} />
                        ))}
                      </div>
                    ) : null}
                    <SumRow label="KDV toplam" value={formatMoney(totals.vatTotal, currencyCode)} />
                    {totals.withholdingTotal > 0 ? <SumRow label="Tevkifat" value={`− ${formatMoney(totals.withholdingTotal, currencyCode)}`} /> : null}
                    <div className="mt-1 flex items-baseline justify-between border-t pt-3">
                      <span className="text-sm font-medium">Genel Toplam</span>
                      <span className="text-xl font-bold tabular-nums text-primary">{formatMoney(totals.grandTotal, currencyCode)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">{actionButtons}</div>
              </div>
            </aside>
          </div>
        </div>

        <ContactDialog
          open={contactDialog}
          onOpenChange={setContactDialog}
          editing={null}
          onSaved={(saved) => { void contactsQuery.refetch(); setContactId(saved.id) }}
        />
        <QuickProductDialog
          open={!!productDialog}
          onOpenChange={(o) => { if (!o) setProductDialog(null) }}
          initialName={productDialog?.name ?? ''}
          onCreated={(p) => {
            const row = productDialog?.row ?? 0
            void qc.invalidateQueries({ queryKey: ['inventory', 'products'] })
            setRow(row, { productId: p.id, description: p.name, unit: p.unit || 'Adet', unitPrice: String(p.salePrice ?? 0), vatRate: validVat(p.taxRate) })
            setProductDialog(null)
          }}
        />
      </div>
    </PermissionRequired>
  )
}

function SegmentedDirection({ value, onChange }: { value: OrderDirection; onChange: (d: OrderDirection) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1">
      {ORDER_DIRECTIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            value === d ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {ORDER_DIRECTION_LABELS[d]}
        </button>
      ))}
    </div>
  )
}

function Cell({ value, onChange, numeric }: { value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={numeric ? 'number' : 'text'}
      className={cn('h-9', numeric && 'text-right tabular-nums')}
    />
  )
}

function SumRow({ label, value, muted, small }: { label: string; value: string; muted?: boolean; small?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', small && 'text-xs', muted && 'text-muted-foreground')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

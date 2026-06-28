import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  IamPermissions,
  InvoicesPermissions,
  PAYMENT_METHODS,
  type BankAccountDto,
  type CashAccountDto,
  type CreateInvoicePaymentRequest,
  type InvoiceType,
  type PaymentMethod,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
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
  SegmentedControl,
  Skeleton,
  Text,
  type SegmentOption,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, STATUS_LABELS, STATUS_TONES, TYPE_LABELS } from './format'

const METHOD_OPTIONS: SegmentOption<PaymentMethod>[] = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: m === 'cash' ? 'Kasa' : 'Banka',
}))

export function InvoiceDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(InvoicesPermissions.read)
  const canWrite = hasPermission(InvoicesPermissions.write)
  const canAudit = hasPermission(IamPermissions.auditRead)

  const id = String(nav.current.params?.id ?? '')
  const invoice = useAsync(() => api.invoices.get(id), [id], { enabled: canRead && !!id })
  const payments = useAsync(() => api.invoices.listPayments(id), [id], { enabled: canRead && !!id })
  const cashAccounts = useAsync(() => api.finance.cashAccounts.list(), [], { enabled: canWrite })
  const bankAccounts = useAsync(() => api.finance.bankAccounts.list(), [], { enabled: canWrite })
  const { submit, busy } = useSubmit()
  const { submit: submitPayment, busy: paymentBusy } = useSubmit()

  const [paySheetOpen, setPaySheetOpen] = React.useState(false)

  const inv = invoice.data

  const refreshAll = () => {
    invoice.refetch()
    payments.refetch()
  }

  const handleAddPayment = (input: CreateInvoicePaymentRequest) => {
    submitPayment(async () => {
      await api.invoices.addPayment(id, input)
      setPaySheetOpen(false)
      refreshAll()
    })
  }

  const handleRemovePayment = (paymentId: string) => {
    confirmDestructive(
      'Kaydı sil',
      'Bu tahsilat/ödeme kaydı silinecek ve bakiyelere yansıyacak. Devam edilsin mi?',
      () =>
        submitPayment(async () => {
          await api.invoices.removePayment(paymentId)
          refreshAll()
        }),
    )
  }

  const handleIssue = () => {
    confirmDestructive(
      'Faturayı kes',
      'Fatura kesildikten sonra numara atanır ve cari hesaba işlenir. Devam edilsin mi?',
      () =>
        submit(async () => {
          await api.invoices.issue(id)
          invoice.refetch()
        }),
      'Kes',
    )
  }

  const handleCancel = () => {
    confirmDestructive(
      'Faturayı iptal et',
      'Kesilmiş fatura iptal edilecek. Devam edilsin mi?',
      () =>
        submit(async () => {
          await api.invoices.cancel(id)
          invoice.refetch()
        }),
      'İptal et',
    )
  }

  const handleDelete = () => {
    confirmDestructive('Taslağı sil', 'Bu taslak fatura silinecek. Devam edilsin mi?', () =>
      submit(async () => {
        await api.invoices.remove(id)
        nav.goBack()
      }),
    )
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Fatura Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: inv?.number || 'Taslak',
        subtitle: inv ? `${inv.contact?.name ?? 'Cari yok'} · ${TYPE_LABELS[inv.type]}` : undefined,
        onBack: nav.goBack,
        right: inv ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() =>
                  nav.navigate('iam.audit.entity', { entityType: 'Invoice', entityId: id }, 'Denetim')
                }
              />
            ) : null}
            {canWrite && inv.status === 'draft' ? (
              <HeaderAction
                icon="edit-2"
                onPress={() => nav.navigate('invoices.invoices.form', { id }, 'Fatura düzenle')}
              />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={refreshAll}
      refreshing={invoice.refreshing || payments.refreshing}
      footer={
        inv && canWrite && (inv.status === 'draft' || inv.status === 'issued') ? (
          inv.status === 'draft' ? (
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={handleDelete} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button title="Faturayı Kes" icon="check" fullWidth loading={busy} onPress={handleIssue} />
              </View>
            </View>
          ) : (
            <Button title="Faturayı İptal Et" variant="destructive" fullWidth loading={busy} onPress={handleCancel} />
          )
        ) : undefined
      }
    >
      {invoice.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : invoice.error || !inv ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={invoice.error ?? 'Fatura bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={invoice.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Genel Toplam
                </Text>
                <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                  <Badge label={STATUS_LABELS[inv.status]} tone={STATUS_TONES[inv.status]} />
                  {inv.status === 'issued' || inv.status === 'paid' ? (
                    <Badge
                      label={
                        inv.remainingTotal <= 0
                          ? 'Ödendi'
                          : inv.paidTotal > 0 && inv.paidTotal < inv.grandTotal
                            ? 'Kısmi'
                            : 'Ödenmedi'
                      }
                      tone={
                        inv.remainingTotal <= 0
                          ? 'success'
                          : inv.paidTotal > 0 && inv.paidTotal < inv.grandTotal
                            ? 'warning'
                            : 'muted'
                      }
                    />
                  ) : null}
                </View>
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(inv.grandTotal, inv.currencyCode)}
              </Text>
              <Text variant="caption" tone="muted">
                {TYPE_LABELS[inv.type]} faturası · {inv.lines.length} kalem
              </Text>
              <FieldGrid>
                <Field label="Ödenen" value={formatMoney(inv.paidTotal, inv.currencyCode)} mono />
                <Field label="Kalan" value={formatMoney(inv.remainingTotal, inv.currencyCode)} mono />
              </FieldGrid>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Cari" value={inv.contact?.name ?? '—'} full />
                <Field label="Tarih" value={formatDate(inv.date)} />
                <Field label="Vade" value={inv.dueDate ? formatDate(inv.dueDate) : '—'} />
                <Field label="Tür" value={TYPE_LABELS[inv.type]} />
                <Field label="Durum" value={STATUS_LABELS[inv.status]} />
                {inv.number ? <Field label="Fatura No" value={inv.number} mono /> : null}
                {inv.notes ? <Field label="Notlar" value={inv.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Kalemler (${inv.lines.length})`}>
            {inv.lines.length === 0 ? (
              <EmptyState icon="list" title="Kalem yok" description="Bu faturada kalem bulunmuyor." />
            ) : (
              <ListCard>
                {inv.lines.map((line) => (
                  <ListRow
                    key={line.id}
                    icon="package"
                    title={line.description}
                    subtitle={`${line.quantity} ${line.unit} × ${formatMoney(line.unitPrice, inv.currencyCode)} · KDV %${line.vatRate}`}
                    trailing={
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(line.lineTotal, inv.currencyCode)}
                      </Text>
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          <Section title="Toplamlar">
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <TotalRow label="Ara Toplam" value={formatMoney(inv.subtotal, inv.currencyCode)} />
                {inv.discountTotal > 0 ? (
                  <TotalRow label="İskonto" value={`- ${formatMoney(inv.discountTotal, inv.currencyCode)}`} />
                ) : null}
                {inv.vatSummary.map((row) => (
                  <TotalRow
                    key={row.rate}
                    label={`KDV %${row.rate}`}
                    value={formatMoney(row.vat, inv.currencyCode)}
                  />
                ))}
                {inv.withholdingTotal > 0 ? (
                  <TotalRow
                    label="Tevkifat"
                    value={`- ${formatMoney(inv.withholdingTotal, inv.currencyCode)}`}
                  />
                ) : null}
                <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
                <TotalRow label="Genel Toplam" value={formatMoney(inv.grandTotal, inv.currencyCode)} bold />
              </View>
            </Card>
          </Section>

          {inv.status === 'issued' || inv.status === 'paid' ? (
            <Section
              title="Tahsilat / Ödeme"
              action={
                canWrite && inv.remainingTotal > 0 ? (
                  <Button
                    title={inv.type === 'sales' ? 'Tahsilat ekle' : 'Ödeme ekle'}
                    icon="plus"
                    size="sm"
                    variant="ghost"
                    onPress={() => setPaySheetOpen(true)}
                  />
                ) : undefined
              }
            >
              {payments.loading ? (
                <Card>
                  <Skeleton width="60%" height={16} />
                </Card>
              ) : (payments.data ?? []).length === 0 ? (
                <EmptyState
                  icon="credit-card"
                  title="Kayıt yok"
                  description={
                    inv.type === 'sales'
                      ? 'Bu fatura için tahsilat girilmemiş.'
                      : 'Bu fatura için ödeme girilmemiş.'
                  }
                />
              ) : (
                <ListCard>
                  {(payments.data ?? []).map((p) => (
                    <ListRow
                      key={p.id}
                      icon={p.method === 'cash' ? 'dollar-sign' : 'credit-card'}
                      title={formatMoney(p.amount, inv.currencyCode)}
                      subtitle={`${p.method === 'cash' ? 'Kasa' : 'Banka'} · ${p.accountName ?? '—'} · ${formatDate(p.date)}`}
                      trailing={
                        canWrite ? (
                          <Pressable
                            onPress={() => handleRemovePayment(p.id)}
                            hitSlop={8}
                            disabled={paymentBusy}
                          >
                            <Icon name="trash-2" size={18} color={t.colors.destructive} />
                          </Pressable>
                        ) : undefined
                      }
                    />
                  ))}
                </ListCard>
              )}
            </Section>
          ) : null}
        </>
      )}

      <PaymentSheet
        open={paySheetOpen}
        type={inv?.type ?? 'sales'}
        remaining={inv?.remainingTotal ?? 0}
        currencyCode={inv?.currencyCode ?? 'TRY'}
        cashAccounts={cashAccounts.data ?? []}
        bankAccounts={bankAccounts.data ?? []}
        busy={paymentBusy}
        onClose={() => setPaySheetOpen(false)}
        onSubmit={handleAddPayment}
      />
    </Screen>
  )
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant={bold ? 'title' : 'label'} tone={bold ? 'default' : 'muted'} weight={bold ? 'bold' : 'medium'}>
        {label}
      </Text>
      <Text
        variant={bold ? 'title' : 'label'}
        weight={bold ? 'bold' : 'medium'}
        style={{ fontFamily: 'monospace' }}
      >
        {value}
      </Text>
    </View>
  )
}

// ── Bottom-sheet tahsilat/ödeme editor ────────────────────────────────────────
function PaymentSheet({
  open,
  type,
  remaining,
  currencyCode,
  cashAccounts,
  bankAccounts,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  type: InvoiceType
  remaining: number
  currencyCode: string
  cashAccounts: CashAccountDto[]
  bankAccounts: BankAccountDto[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: CreateInvoicePaymentRequest) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [amount, setAmount] = React.useState('')
  const [method, setMethod] = React.useState<PaymentMethod>('cash')
  const [accountId, setAccountId] = React.useState('')
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setDate(new Date().toISOString())
    setAmount(remaining > 0 ? String(remaining) : '')
    setMethod('cash')
    setAccountId('')
    setDescription('')
  }, [open, remaining])

  const accountOptions = React.useMemo<SelectOption<string>[]>(() => {
    const accs = method === 'cash' ? cashAccounts : bankAccounts
    return [
      { value: '', label: method === 'cash' ? 'Kasa seçin' : 'Banka seçin' },
      ...accs.map((a) => ({ value: a.id, label: a.name })),
    ]
  }, [method, cashAccounts, bankAccounts])

  if (!open) return <Modal visible={false} transparent />

  const amountNum = Number(amount) || 0
  const valid = amountNum > 0 && !!accountId

  const changeMethod = (m: PaymentMethod) => {
    setMethod(m)
    setAccountId('')
  }

  const handleSubmit = () =>
    onSubmit({
      date,
      amount: amountNum,
      method,
      cashAccountId: method === 'cash' ? accountId : null,
      bankAccountId: method === 'bank' ? accountId : null,
      description: description.trim() || null,
    })

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '92%',
            paddingTop: t.spacing[3],
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[2],
            }}
          >
            <Text variant="title" weight="semibold">
              {type === 'sales' ? 'Tahsilat ekle' : 'Ödeme ekle'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[4],
              gap: t.spacing[3],
            }}
          >
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Tutar"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                />
              </View>
            </View>
            <View style={{ gap: t.spacing[1.5] }}>
              <Text variant="label" tone="muted" weight="medium">
                Yöntem
              </Text>
              <SegmentedControl options={METHOD_OPTIONS} value={method} onChange={changeMethod} />
            </View>
            <FormSelect
              label={method === 'cash' ? 'Kasa' : 'Banka'}
              value={accountId}
              options={accountOptions}
              onChange={setAccountId}
            />
            <Input
              label="Açıklama"
              placeholder="Opsiyonel açıklama"
              value={description}
              onChangeText={setDescription}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: t.colors.border,
                paddingTop: t.spacing[3],
              }}
            >
              <Text variant="label" tone="muted" weight="medium">
                Kalan tutar
              </Text>
              <Text variant="title" weight="bold" style={{ fontFamily: 'monospace' }}>
                {formatMoney(remaining, currencyCode)}
              </Text>
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: t.spacing[5],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[3],
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
            }}
          >
            <Button
              title="Ekle"
              icon="check"
              fullWidth
              loading={busy}
              disabled={!valid}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

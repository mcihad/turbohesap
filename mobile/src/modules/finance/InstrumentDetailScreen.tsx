// InstrumentDetailScreen — full çek/senet detail: all fields, a status-action
// button row (only the actions valid for the current status/direction, each
// permission-gated), a "Bağlı Evrak" link into the Evrak module, and
// edit/delete (only while status === 'open'). collect/pay open an inline
// settle sub-form (cash-or-bank account + date + description) mirroring
// invoices/InvoiceDetailScreen's PaymentSheet; reverse/bounce/endorse/pledge/
// cancel/depositForCollection fire directly behind a confirm alert.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  FinancePermissions,
  type BankAccountDto,
  type CashAccountDto,
  type SettleInstrumentRequest,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Icon,
  Input,
  ListRow,
  Screen,
  Section,
  SegmentedControl,
  Skeleton,
  Text,
  type SegmentOption,
  type SelectOption,
} from '../../components'
import { FormDatePicker, FormSelect } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './CashAccountsScreen'
import {
  getAvailableActions,
  INSTRUMENT_DIRECTION_LABELS,
  INSTRUMENT_TYPE_LABELS,
  instrumentStatusLabel,
  instrumentStatusTone,
  type InstrumentActionDef,
  type InstrumentActionKey,
} from './instrument-labels'

const ACCOUNT_KIND_OPTIONS: SegmentOption<'cash' | 'bank'>[] = [
  { value: 'cash', label: 'Kasa' },
  { value: 'bank', label: 'Banka' },
]

export function InstrumentDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(FinancePermissions.instrumentsRead)
  const canWrite = hasPermission(FinancePermissions.instrumentsWrite)
  const canDelete = hasPermission(FinancePermissions.instrumentsDelete)

  const id = String(nav.current.params?.id ?? '')
  const instrument = useAsync(() => api.finance.instruments.get(id), [id], { enabled: canRead && !!id })
  const cashAccounts = useAsync(() => api.finance.cashAccounts.list(), [], { enabled: canRead })
  const bankAccounts = useAsync(() => api.finance.bankAccounts.list(), [], { enabled: canRead })

  const { submit, busy } = useSubmit()
  const { submit: submitSettle, busy: settleBusy } = useSubmit()
  const [settleAction, setSettleAction] = React.useState<'collect' | 'pay' | null>(null)

  const it = instrument.data

  const handleDelete = () => {
    confirmDestructive(
      'Çek/Senet Kaydını Sil',
      `"${it?.contactName ?? ''}" adına kayıtlı çek/senet kalıcı olarak silinecektir. Emin misiniz?`,
      async () => {
        await submit(() => api.finance.instruments.remove(id))
        nav.goBack()
      },
    )
  }

  const runStatusAction = (action: InstrumentActionDef) => {
    const fire = () =>
      submit(async () => {
        await callStatusAction(action.key, id)
        instrument.refetch()
      })
    if (action.confirmMessage) {
      confirmDestructive(action.label, action.confirmMessage, fire, action.label)
    } else {
      fire()
    }
  }

  const handleSettleSubmit = (input: SettleInstrumentRequest) => {
    if (!settleAction) return
    submitSettle(async () => {
      if (settleAction === 'collect') {
        await api.finance.instruments.collect(id, input)
      } else {
        await api.finance.instruments.pay(id, input)
      }
      setSettleAction(null)
      instrument.refetch()
    })
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Çek/Senet Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const actions = it ? getAvailableActions(it.status, it.direction).filter((a) => hasPermission(a.permission)) : []
  const canEditNow = canWrite && it?.status === 'open'
  const canDeleteNow = canDelete && it?.status === 'open'

  return (
    <Screen
      header={{
        title: it?.contactName ?? 'Çek/Senet Detayı',
        subtitle: it ? `${INSTRUMENT_TYPE_LABELS[it.instrumentType]} · ${INSTRUMENT_DIRECTION_LABELS[it.direction]}` : undefined,
        onBack: nav.goBack,
        right:
          it && canEditNow ? (
            <HeaderAction
              icon="edit-2"
              onPress={() => nav.navigate('finance.instruments.form', { id: it.id }, it.contactName ?? 'Çek/Senet')}
            />
          ) : undefined,
      }}
      onRefresh={instrument.refetch}
      refreshing={instrument.refreshing}
    >
      {instrument.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : instrument.error || !it ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={instrument.error ?? 'Kayıt bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={instrument.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">Tutar</Text>
                <Badge label={instrumentStatusLabel(it.status)} tone={instrumentStatusTone(it.status)} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(it.amount, it.currencyCode)}
              </Text>
              <Text variant="caption" tone="muted">
                {INSTRUMENT_TYPE_LABELS[it.instrumentType]} · {INSTRUMENT_DIRECTION_LABELS[it.direction]}
              </Text>
            </View>
          </Card>

          {actions.length > 0 ? (
            <Section title="İşlemler">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
                {actions.map((action) => (
                  <Button
                    key={action.key}
                    title={action.label}
                    icon={action.icon}
                    size="sm"
                    variant={action.variant}
                    loading={busy && !action.settle}
                    onPress={() =>
                      action.settle
                        ? setSettleAction(action.key as 'collect' | 'pay')
                        : runStatusAction(action)
                    }
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Cari" value={it.contactName ?? '—'} full />
                <Field label="Düzenleme Tarihi" value={formatDate(it.issueDate)} />
                <Field label="Vade Tarihi" value={formatDate(it.dueDate)} />
                {it.instrumentNo ? <Field label="Çek/Senet No" value={it.instrumentNo} mono /> : null}
                {it.drawerName ? <Field label="Keşideci" value={it.drawerName} /> : null}
                {it.notes ? <Field label="Notlar" value={it.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          {it.instrumentType === 'check' && (it.bankName || it.bankBranch || it.accountNo) ? (
            <Section title="Banka Bilgileri">
              <Card>
                <FieldGrid>
                  {it.bankName ? <Field label="Banka" value={it.bankName} /> : null}
                  {it.bankBranch ? <Field label="Şube" value={it.bankBranch} /> : null}
                  {it.accountNo ? <Field label="Hesap No" value={it.accountNo} mono /> : null}
                </FieldGrid>
              </Card>
            </Section>
          ) : null}

          <Section title="Bağlı Kayıtlar">
            <ListRow
              icon="file-text"
              title="Bağlı Evrak"
              subtitle={it.documentId ? 'Evrak modülünde otomatik oluşturuldu' : 'Henüz oluşturulmadı'}
              trailing={it.documentId ? undefined : <Text variant="caption" tone="muted">—</Text>}
              onPress={
                it.documentId
                  ? () => nav.navigate('documents.detail', { id: it.documentId }, 'Bağlı Evrak')
                  : undefined
              }
            />
          </Section>

          {canDeleteNow ? (
            <Button
              title="Kaydı sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={handleDelete}
              style={{ marginTop: t.spacing[4], marginBottom: t.spacing[4] }}
            />
          ) : null}
        </>
      )}

      <SettleSheet
        open={!!settleAction}
        action={settleAction}
        currencyCode={it?.currencyCode ?? 'TRY'}
        amount={it?.amount ?? 0}
        cashAccounts={cashAccounts.data ?? []}
        bankAccounts={bankAccounts.data ?? []}
        busy={settleBusy}
        onClose={() => setSettleAction(null)}
        onSubmit={handleSettleSubmit}
      />
    </Screen>
  )
}

async function callStatusAction(key: InstrumentActionKey, id: string) {
  switch (key) {
    case 'depositForCollection':
      return api.finance.instruments.depositForCollection(id)
    case 'bounce':
      return api.finance.instruments.bounce(id)
    case 'endorse':
      return api.finance.instruments.endorse(id)
    case 'pledge':
      return api.finance.instruments.pledge(id)
    case 'cancel':
      return api.finance.instruments.cancel(id)
    case 'reverse':
      return api.finance.instruments.reverse(id)
    default:
      throw new Error(`Beklenmeyen işlem: ${key}`)
  }
}

// ── Bottom-sheet tahsil/ödeme editor ──────────────────────────────────────
function SettleSheet({
  open,
  action,
  currencyCode,
  amount,
  cashAccounts,
  bankAccounts,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  action: 'collect' | 'pay' | null
  currencyCode: string
  amount: number
  cashAccounts: CashAccountDto[]
  bankAccounts: BankAccountDto[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: SettleInstrumentRequest) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [kind, setKind] = React.useState<'cash' | 'bank'>('cash')
  const [accountId, setAccountId] = React.useState('')
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setDate(new Date().toISOString())
    setKind('cash')
    setAccountId('')
    setDescription('')
  }, [open])

  const accountOptions = React.useMemo<SelectOption<string>[]>(() => {
    const accs = kind === 'cash' ? cashAccounts : bankAccounts
    return [
      { value: '', label: kind === 'cash' ? 'Kasa seçin' : 'Banka seçin' },
      ...accs.map((a) => ({ value: a.id, label: a.name })),
    ]
  }, [kind, cashAccounts, bankAccounts])

  if (!open || !action) return <Modal visible={false} transparent />

  const valid = !!accountId

  const changeKind = (k: 'cash' | 'bank') => {
    setKind(k)
    setAccountId('')
  }

  const handleSubmit = () =>
    onSubmit({
      date,
      cashAccountId: kind === 'cash' ? accountId : null,
      bankAccountId: kind === 'bank' ? accountId : null,
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
              {action === 'collect' ? 'Tahsil et' : 'Öde'}
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
            <FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" />
            <View style={{ gap: t.spacing[1.5] }}>
              <Text variant="label" tone="muted" weight="medium">
                Hesap Türü
              </Text>
              <SegmentedControl options={ACCOUNT_KIND_OPTIONS} value={kind} onChange={changeKind} />
            </View>
            <FormSelect
              label={kind === 'cash' ? 'Kasa' : 'Banka'}
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
                Tutar
              </Text>
              <Text variant="title" weight="bold" style={{ fontFamily: 'monospace' }}>
                {formatMoney(amount, currencyCode)}
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
              title={action === 'collect' ? 'Tahsil et' : 'Öde'}
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

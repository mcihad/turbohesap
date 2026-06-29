import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HrPermissions, type PayslipDto } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, MONTH_LABELS, PAYROLL_RUN_STATUS_LABELS, PAYROLL_RUN_STATUS_TONES } from './format'

export function PayrollRunDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canPayroll = hasPermission(HrPermissions.payroll)
  const canPay = hasPermission(HrPermissions.pay)

  const id = String(nav.current.params?.id ?? '')
  const run = useAsync(() => api.hr.payroll.getRun(id), [id], { enabled: canRead && !!id })
  const payslips = useAsync(() => api.hr.payroll.payslips(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()
  const [paying, setPaying] = React.useState<PayslipDto | null>(null)

  const r = run.data
  const slips = payslips.data ?? []

  const refresh = () => {
    run.refetch()
    payslips.refetch()
  }

  const handleCompute = () =>
    submit(async () => {
      await api.hr.payroll.compute(id)
      refresh()
    })

  const handleFinalize = () =>
    confirmDestructive(
      'Bordroyu kesinleştir',
      'Dönem kesinleştirilecek ve pusulalar ödemeye hazır hale gelecek. Devam edilsin mi?',
      () =>
        submit(async () => {
          await api.hr.payroll.finalize(id)
          refresh()
        }),
      'Kesinleştir',
    )

  const handleUnpay = (slip: PayslipDto) =>
    confirmDestructive('Ödemeyi geri al', 'Bu pusulanın ödemesi geri alınacak. Devam edilsin mi?', () =>
      submit(async () => {
        await api.hr.payroll.unpay(slip.id)
        refresh()
      }),
      'Geri al',
    )

  if (!canRead) {
    return (
      <Screen header={{ title: 'Bordro', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const isDraft = r?.status === 'draft'
  const showCompute = !!r && canPayroll && r.status !== 'paid'
  const showFinalize = !!r && canPayroll && isDraft && slips.length > 0

  return (
    <Screen
      header={{
        title: r ? `${MONTH_LABELS[r.month - 1]} ${r.year}` : 'Bordro',
        subtitle: r ? PAYROLL_RUN_STATUS_LABELS[r.status] : undefined,
        onBack: nav.goBack,
      }}
      onRefresh={refresh}
      refreshing={run.refreshing || payslips.refreshing}
      footer={
        r && (showCompute || showFinalize) ? (
          <View style={{ gap: t.spacing[2.5] }}>
            {showCompute ? (
              <Button title="Hesapla" icon="cpu" variant={isDraft ? 'default' : 'outline'} fullWidth loading={busy} onPress={handleCompute} />
            ) : null}
            {showFinalize ? (
              <Button title="Kesinleştir" icon="lock" fullWidth loading={busy} onPress={handleFinalize} />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {run.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : run.error || !r ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={run.error ?? 'Dönem bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={refresh}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Toplam Net
                </Text>
                <Badge label={PAYROLL_RUN_STATUS_LABELS[r.status]} tone={PAYROLL_RUN_STATUS_TONES[r.status]} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(r.totalNet)}
              </Text>
              <Text variant="caption" tone="muted">
                {r.payslipCount} pusula · İşveren maliyeti {formatMoney(r.totalCost)}
              </Text>
            </View>
          </Card>

          <Section title={`Maaş Pusulaları (${slips.length})`}>
            {payslips.loading ? (
              <Card>
                <Skeleton width="60%" height={18} />
              </Card>
            ) : slips.length === 0 ? (
              <EmptyState
                icon="file-text"
                title="Pusula yok"
                description={canPayroll ? 'Pusula oluşturmak için "Hesapla" düğmesini kullanın.' : 'Bu dönemde pusula bulunmuyor.'}
              />
            ) : (
              <View style={{ gap: t.spacing[3] }}>
                {slips.map((p) => {
                  const showPay = canPay && !p.paidAt && r.status !== 'draft'
                  const showUnpay = canPay && !!p.paidAt
                  return (
                    <Card key={p.id} padded={false}>
                      <ListRow
                        icon="user"
                        title={p.employeeName}
                        subtitle={`Brüt ${formatMoney(p.brut)} · Maliyet ${formatMoney(p.isverenMaliyet)}`}
                        trailing={
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatMoney(p.net)}</Text>
                            {p.paidAt ? <Badge label="Ödendi" tone="success" /> : null}
                          </View>
                        }
                        onPress={() => nav.navigate('hr.payslip', { id: p.id }, 'Maaş Pusulası')}
                      />
                      {showPay || showUnpay ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: t.spacing[3],
                            paddingHorizontal: t.spacing[4],
                            paddingBottom: t.spacing[3],
                          }}
                        >
                          {showPay ? (
                            <View style={{ flex: 1 }}>
                              <Button title="Öde" icon="credit-card" size="sm" fullWidth onPress={() => setPaying(p)} />
                            </View>
                          ) : null}
                          {showUnpay ? (
                            <View style={{ flex: 1 }}>
                              <Button title="Geri al" variant="outline" size="sm" fullWidth loading={busy} onPress={() => handleUnpay(p)} />
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </Card>
                  )
                })}
              </View>
            )}
          </Section>
        </>
      )}

      <PaySheet
        payslip={paying}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null)
          refresh()
        }}
      />
    </Screen>
  )
}

function PaySheet({
  payslip,
  onClose,
  onPaid,
}: {
  payslip: PayslipDto | null
  onClose: () => void
  onPaid: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()
  const open = !!payslip

  const cash = useAsync(() => api.finance.cashAccounts.list(), [], { enabled: open })
  const bank = useAsync(() => api.finance.bankAccounts.list(), [], { enabled: open })

  const pay = (account: { kind: 'cash' | 'bank'; id: string }) => {
    if (!payslip) return
    submit(async () => {
      await api.hr.payroll.pay(payslip.id, account.kind === 'cash' ? { cashAccountId: account.id } : { bankAccountId: account.id })
      onPaid()
    })
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '80%',
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
            <View style={{ gap: 2 }}>
              <Text variant="title" weight="semibold">
                Maaş öde
              </Text>
              {payslip ? (
                <Text variant="caption" tone="muted">
                  {payslip.employeeName} · {formatMoney(payslip.net)}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: insets.bottom + t.spacing[4], gap: t.spacing[4] }}>
            <AccountGroup
              title="Kasa"
              icon="dollar-sign"
              loading={cash.loading}
              accounts={(cash.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
              disabled={busy}
              onPick={(id) => pay({ kind: 'cash', id })}
            />
            <AccountGroup
              title="Banka"
              icon="credit-card"
              loading={bank.loading}
              accounts={(bank.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
              disabled={busy}
              onPick={(id) => pay({ kind: 'bank', id })}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function AccountGroup({
  title,
  icon,
  loading,
  accounts,
  disabled,
  onPick,
}: {
  title: string
  icon: 'dollar-sign' | 'credit-card'
  loading: boolean
  accounts: { id: string; name: string }[]
  disabled: boolean
  onPick: (id: string) => void
}) {
  const t = useTheme()
  return (
    <Section title={title}>
      {loading ? (
        <Card>
          <Skeleton width="50%" height={16} />
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <Text variant="caption" tone="muted">
            Hesap bulunmuyor.
          </Text>
        </Card>
      ) : (
        <Card padded={false}>
          {accounts.map((a, i) => (
            <Pressable
              key={a.id}
              disabled={disabled}
              onPress={() => onPick(a.id)}
              android_ripple={{ color: t.colors.muted }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing[3],
                paddingHorizontal: t.spacing[4],
                paddingVertical: t.spacing[3.5],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.colors.border,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Icon name={icon} size={18} color={t.colors.primary} />
              <Text variant="label" weight="medium" style={{ flex: 1 }}>
                {a.name}
              </Text>
              <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
            </Pressable>
          ))}
        </Card>
      )}
    </Section>
  )
}

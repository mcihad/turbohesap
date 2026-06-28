import * as React from 'react'
import { View } from 'react-native'
import { FinancePermissions, IamPermissions, type FinanceTransactionDto } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './CashAccountsScreen'

export function BankAccountDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(FinancePermissions.bankAccountsRead)
  const canWrite = hasPermission(FinancePermissions.bankAccountsWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canTxRead = hasPermission(FinancePermissions.transactionsRead)
  const canTxWrite = hasPermission(FinancePermissions.transactionsWrite)

  const id = String(nav.current.params?.id ?? '')

  const bankAccount = useAsync(() => api.finance.bankAccounts.get(id), [id], {
    enabled: canRead && !!id,
  })

  const txs = useAsync(() => api.finance.transactions.list({ bankAccountId: id }), [id], {
    enabled: canTxRead && !!id,
  })

  const { submit, busy } = useSubmit()
  const ba = bankAccount.data

  const handleDelete = () => {
    confirmDestructive(
      'Banka Hesabını Sil',
      `"${ba?.name}" banka hesabı kalıcı olarak silinecektir. Emin misiniz?`,
      async () => {
        await submit(() => api.finance.bankAccounts.remove(id))
        nav.goBack()
      }
    )
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Hesap Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: ba?.name ?? 'Hesap Detayı',
        subtitle: ba ? `${ba.bankName} - ${ba.currency}` : undefined,
        onBack: nav.goBack,
        right: ba ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'BankAccount', entityId: ba.id, title: ba.name }, 'Denetim geçmişi')}
              />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('finance.bank-accounts.form', { id: ba.id }, ba.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={() => {
        bankAccount.refetch()
        txs.refetch()
      }}
      refreshing={bankAccount.refreshing || txs.refreshing}
    >
      {bankAccount.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : bankAccount.error || !ba ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={bankAccount.error ?? 'Hesap bulunamadı.'} actionLabel="Tekrar dene" onAction={bankAccount.refetch} />
      ) : (
        <>
          <Section title="Özet & Banka Bilgileri">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row' }}>
                  <Badge label={ba.isActive ? 'Aktif' : 'Pasif'} tone={ba.isActive ? 'success' : 'muted'} />
                </View>
                <FieldGrid>
                  <Field label="Banka Adı" value={ba.bankName} />
                  <Field label="Şube" value={ba.branchName || '—'} />
                  <Field label="Şube Kodu" value={ba.branchCode || '—'} mono />
                  <Field label="Hesap No" value={ba.accountNumber || '—'} mono />
                  <Field label="IBAN" value={ba.iban} full mono />
                  <Field label="Para Birimi" value={ba.currency} />
                  <Field label="Açılış Tutarı" value={formatMoney(ba.openingBalance, ba.currency)} mono />
                  <Field label="Güncel Bakiye" value={formatMoney(ba.balance, ba.currency)} mono />
                  {ba.description ? <Field label="Açıklama" value={ba.description} full /> : null}
                </FieldGrid>
              </View>
            </Card>
          </Section>

          <Section
            title="Hesap Hareketleri"
            action={
              canTxWrite ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Yeni İşlem"
                  onPress={() =>
                    nav.navigate(
                      'finance.transactions.form',
                      { bankAccountId: ba.id },
                      'Yeni İşlem'
                    )
                  }
                />
              ) : undefined
            }
          >
            {txs.loading ? (
              <Card>
                <Skeleton width="80%" height={15} />
                <View style={{ marginTop: 8 }}>
                  <Skeleton width="50%" height={12} />
                </View>
              </Card>
            ) : txs.error ? (
              <Card>
                <Text tone="destructive">{txs.error}</Text>
              </Card>
            ) : !txs.data || txs.data.length === 0 ? (
              <EmptyState icon="database" title="Hareket yok" description="Bu hesaba ait herhangi bir hareket kaydı bulunamadı." />
            ) : (
              <ListCard>
                {txs.data.map((tx) => (
                  <ListRow
                    key={tx.id}
                    icon={tx.type === 'in' ? 'arrow-down-left' : 'arrow-up-right'}
                    title={tx.description || (tx.type === 'in' ? 'Giriş' : 'Çıkış')}
                    subtitle={formatDateTime(tx.date)}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontFamily: 'monospace', color: tx.type === 'in' ? t.colors.success : t.colors.destructive }}>
                          {tx.type === 'in' ? '+' : '-'} {formatMoney(tx.amount, ba.currency)}
                        </Text>
                      </View>
                    }
                    onPress={
                      canTxWrite
                        ? () =>
                            nav.navigate(
                              'finance.transactions.form',
                              { id: tx.id, bankAccountId: ba.id },
                              'İşlemi Düzenle'
                            )
                        : undefined
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          {canWrite ? (
            <Button
              title="Hesabı sil"
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
    </Screen>
  )
}

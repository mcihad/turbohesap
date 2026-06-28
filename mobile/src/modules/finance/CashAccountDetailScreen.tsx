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

export function CashAccountDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  
  const canRead = hasPermission(FinancePermissions.cashAccountsRead)
  const canWrite = hasPermission(FinancePermissions.cashAccountsWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canTxRead = hasPermission(FinancePermissions.transactionsRead)
  const canTxWrite = hasPermission(FinancePermissions.transactionsWrite)

  const id = String(nav.current.params?.id ?? '')
  
  const cashAccount = useAsync(() => api.finance.cashAccounts.get(id), [id], {
    enabled: canRead && !!id,
  })

  const txs = useAsync(() => api.finance.transactions.list({ cashAccountId: id }), [id], {
    enabled: canTxRead && !!id,
  })

  const { submit, busy } = useSubmit()
  const ca = cashAccount.data

  const handleDelete = () => {
    confirmDestructive(
      'Kasa Hesabını Sil',
      `"${ca?.name}" kasa hesabı kalıcı olarak silinecektir. Emin misiniz?`,
      async () => {
        await submit(() => api.finance.cashAccounts.remove(id))
        nav.goBack()
      }
    )
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Kasa Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: ca?.name ?? 'Kasa Detayı',
        subtitle: ca ? `${ca.currency} Kasa Hesabı` : undefined,
        onBack: nav.goBack,
        right: ca ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'CashAccount', entityId: ca.id, title: ca.name }, 'Denetim geçmişi')}
              />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('finance.cash-accounts.form', { id: ca.id }, ca.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={() => {
        cashAccount.refetch()
        txs.refetch()
      }}
      refreshing={cashAccount.refreshing || txs.refreshing}
    >
      {cashAccount.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : cashAccount.error || !ca ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={cashAccount.error ?? 'Kasa bulunamadı.'} actionLabel="Tekrar dene" onAction={cashAccount.refetch} />
      ) : (
        <>
          <Section title="Özet">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row' }}>
                  <Badge label={ca.isActive ? 'Aktif' : 'Pasif'} tone={ca.isActive ? 'success' : 'muted'} />
                </View>
                <FieldGrid>
                  <Field label="Para Birimi" value={ca.currency} />
                  <Field label="Açılış Tutarı" value={formatMoney(ca.openingBalance, ca.currency)} mono />
                  <Field label="Güncel Bakiye" value={formatMoney(ca.balance, ca.currency)} mono />
                  {ca.description ? <Field label="Açıklama" value={ca.description} full /> : null}
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
                      { cashAccountId: ca.id },
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
              <EmptyState icon="database" title="Hareket yok" description="Bu kasaya ait herhangi bir hareket kaydı bulunamadı." />
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
                          {tx.type === 'in' ? '+' : '-'} {formatMoney(tx.amount, ca.currency)}
                        </Text>
                      </View>
                    }
                    onPress={
                      canTxWrite
                        ? () =>
                            nav.navigate(
                              'finance.transactions.form',
                              { id: tx.id, cashAccountId: ca.id },
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
              title="Kasayı sil"
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

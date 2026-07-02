import * as React from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ContactsPermissions,
  IamPermissions,
  InvoicesPermissions,
  type ActivityStatus,
  type ActivityType,
  type AddressType,
  type ContactDocumentType,
  type ContactRole,
  type ContactType,
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
  type IconName,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { balanceSideLabel, formatMoney } from './format'
import { SendMessageSheet } from './SendMessageSheet'

const ROLE_LABELS: Record<ContactRole, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri+Tedarikçi',
  lead: 'Aday',
}

const TYPE_LABELS: Record<ContactType, string> = {
  company: 'Kurumsal',
  individual: 'Bireysel',
}

const DOC_TYPE_LABELS: Record<ContactDocumentType, string> = {
  invoice: 'Fatura',
  payment: 'Ödeme',
  receipt: 'Tahsilat',
  opening: 'Açılış',
  adjustment: 'Düzeltme',
  return: 'İade',
  check: 'Çek',
  note: 'Senet',
}

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  billing: 'Fatura',
  shipping: 'Sevkiyat',
  office: 'Ofis',
  other: 'Diğer',
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Not',
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  task: 'Görev',
}

const ACTIVITY_TYPE_ICONS: Record<ActivityType, IconName> = {
  note: 'file-text',
  call: 'phone',
  meeting: 'users',
  email: 'mail',
  task: 'check-square',
}

const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

const ACTIVITY_STATUS_TONES: Record<ActivityStatus, 'primary' | 'warning' | 'success' | 'muted'> = {
  open: 'primary',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'muted',
}

export function ContactDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const { hasPermission } = useAuth()

  const [invoiceSheet, setInvoiceSheet] = React.useState(false)
  const [sendSheet, setSendSheet] = React.useState(false)

  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canTxRead = hasPermission(ContactsPermissions.transactionsRead)
  const canTxWrite = hasPermission(ContactsPermissions.transactionsWrite)
  const canOppRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canOppWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const canActRead = hasPermission(ContactsPermissions.activitiesRead)
  const canActWrite = hasPermission(ContactsPermissions.activitiesWrite)
  const canInvoiceWrite = hasPermission(InvoicesPermissions.write)

  const id = String(nav.current.params?.id ?? '')

  const contact = useAsync(() => api.contacts.contacts.get(id), [id], { enabled: canRead && !!id })
  const txs = useAsync(() => api.contacts.transactions.list({ contactId: id }), [id], {
    enabled: canTxRead && !!id,
  })
  const persons = useAsync(() => api.contacts.persons.list(id), [id], { enabled: canRead && !!id })
  const addresses = useAsync(() => api.contacts.addresses.list(id), [id], { enabled: canRead && !!id })
  const activities = useAsync(() => api.contacts.activities.list({ contactId: id }), [id], {
    enabled: canActRead && !!id,
  })
  const opps = useAsync(() => api.contacts.opportunities.list({ contactId: id }), [id], {
    enabled: canOppRead && !!id,
  })

  const c = contact.data

  if (!canRead) {
    return (
      <Screen header={{ title: 'Cari Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: c?.name ?? 'Cari Detayı',
        subtitle: c ? `${c.code} · ${ROLE_LABELS[c.role]}` : undefined,
        onBack: nav.goBack,
        right: c ? (
          <>
            {canWrite ? (
              <HeaderAction icon="send" onPress={() => setSendSheet(true)} />
            ) : null}
            {canInvoiceWrite ? (
              <HeaderAction icon="file-plus" onPress={() => setInvoiceSheet(true)} />
            ) : null}
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() =>
                  nav.navigate('iam.audit.entity', { entityType: 'Contact', entityId: id }, 'Denetim')
                }
              />
            ) : null}
            {canWrite ? (
              <HeaderAction
                icon="edit-2"
                onPress={() => nav.navigate('contacts.contacts.form', { id }, 'Cari düzenle')}
              />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={() => {
        contact.refetch()
        txs.refetch()
        persons.refetch()
        addresses.refetch()
        activities.refetch()
        opps.refetch()
      }}
      refreshing={
        contact.refreshing ||
        txs.refreshing ||
        persons.refreshing ||
        addresses.refreshing ||
        activities.refreshing ||
        opps.refreshing
      }
    >
      {contact.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : contact.error || !c ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={contact.error ?? 'Cari bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={contact.refetch}
        />
      ) : (
        <>
          <Section title="Bakiye">
            <Card>
              <View style={{ gap: t.spacing[3] }}>
                <Text variant="overline" tone="muted">
                  Güncel Bakiye
                </Text>
                <Text variant="display" style={{ fontFamily: 'monospace' }}>
                  {formatMoney(c.balance, c.currencyCode)}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Badge
                    label={balanceSideLabel(c.balanceSide)}
                    tone={c.balanceSide === 'debit' ? 'warning' : 'success'}
                  />
                </View>
                <FieldGrid>
                  <Field
                    label="Risk Limiti"
                    value={c.creditLimit > 0 ? formatMoney(c.creditLimit, c.currencyCode) : 'Limitsiz'}
                    mono
                  />
                  <Field label="Vade" value={`${c.paymentTermDays} gün`} />
                </FieldGrid>
              </View>
            </Card>
          </Section>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Kod" value={c.code} mono />
                <Field label="Tür" value={TYPE_LABELS[c.contactType]} />
                <Field label="Rol" value={ROLE_LABELS[c.role]} />
                {c.taxOffice ? <Field label="Vergi Dairesi" value={c.taxOffice} /> : null}
                {c.contactType === 'company'
                  ? c.taxNumber
                    ? <Field label="Vergi No" value={c.taxNumber} mono />
                    : null
                  : c.nationalId
                    ? <Field label="TCKN" value={c.nationalId} mono />
                    : null}
                {c.email ? <Field label="E-posta" value={c.email} /> : null}
                {c.phone ? <Field label="Telefon" value={c.phone} /> : null}
                {c.mobile ? <Field label="Cep" value={c.mobile} /> : null}
                {c.group ? <Field label="Grup" value={c.group.name} /> : null}
                {c.iban ? <Field label="IBAN" value={c.iban} mono full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          {canTxRead ? (
            <Section
              title="Ekstre"
              action={
                canTxWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Hareket ekle"
                    onPress={() =>
                      nav.navigate('contacts.transactions.form', { contactId: id }, 'Hareket')
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
                <EmptyState icon="database" title="Hareket yok" description="Bu cariye ait hareket kaydı bulunamadı." />
              ) : (
                <ListCard>
                  {txs.data.map((tx) => {
                    const isDebit = tx.debit > 0
                    return (
                      <ListRow
                        key={tx.id}
                        icon={isDebit ? 'arrow-up-right' : 'arrow-down-left'}
                        title={DOC_TYPE_LABELS[tx.documentType]}
                        subtitle={`${formatDate(tx.date)}${tx.documentNo ? ' · ' + tx.documentNo : ''}`}
                        trailing={
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text
                              style={{
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                color: isDebit ? t.colors.warning : t.colors.success,
                              }}
                            >
                              {isDebit ? '+' : '-'} {formatMoney(isDebit ? tx.debit : tx.credit, tx.currencyCode)}
                            </Text>
                            <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                              {formatMoney(tx.runningBalance, tx.currencyCode)}
                            </Text>
                          </View>
                        }
                      />
                    )
                  })}
                </ListCard>
              )}
            </Section>
          ) : null}

          <Section
            title={`Kişiler (${c.personCount})`}
            action={
              canWrite ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Kişi ekle"
                  onPress={() => nav.navigate('contacts.persons.form', { contactId: id }, 'Yeni kişi')}
                />
              ) : undefined
            }
          >
            {persons.loading ? (
              <Card>
                <Skeleton width="70%" height={15} />
              </Card>
            ) : !persons.data || persons.data.length === 0 ? (
              <EmptyState icon="user" title="Kişi yok" description="Bu cariye bağlı ilgili kişi bulunmuyor." />
            ) : (
              <ListCard>
                {persons.data.map((p) => (
                  <ListRow
                    key={p.id}
                    icon="user"
                    title={`${p.firstName} ${p.lastName}`.trim()}
                    subtitle={p.title ?? undefined}
                    trailing={p.isPrimary ? <Badge label="Birincil" tone="primary" /> : undefined}
                    onPress={
                      canWrite
                        ? () => nav.navigate('contacts.persons.form', { contactId: id, id: p.id }, 'Kişi düzenle')
                        : undefined
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          <Section
            title={`Adresler (${c.addressCount})`}
            action={
              canWrite ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Adres ekle"
                  onPress={() => nav.navigate('contacts.addresses.form', { contactId: id }, 'Yeni adres')}
                />
              ) : undefined
            }
          >
            {addresses.loading ? (
              <Card>
                <Skeleton width="70%" height={15} />
              </Card>
            ) : !addresses.data || addresses.data.length === 0 ? (
              <EmptyState icon="map-pin" title="Adres yok" description="Bu cariye ait adres kaydı bulunmuyor." />
            ) : (
              <ListCard>
                {addresses.data.map((a) => (
                  <ListRow
                    key={a.id}
                    icon="map-pin"
                    title={a.title || ADDRESS_TYPE_LABELS[a.addressType]}
                    subtitle={`${a.line1}${a.city ? ' · ' + a.city : ''}`}
                    trailing={<Badge label={ADDRESS_TYPE_LABELS[a.addressType]} tone="muted" />}
                    onPress={
                      canWrite
                        ? () => nav.navigate('contacts.addresses.form', { contactId: id, id: a.id }, 'Adres düzenle')
                        : undefined
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          {canActRead ? (
            <Section
              title="Etkinlikler"
              action={
                canActWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Etkinlik ekle"
                    onPress={() => nav.navigate('contacts.activities.form', { contactId: id }, 'Yeni etkinlik')}
                  />
                ) : undefined
              }
            >
              {activities.loading ? (
                <Card>
                  <Skeleton width="70%" height={15} />
                </Card>
              ) : !activities.data || activities.data.length === 0 ? (
                <EmptyState icon="activity" title="Etkinlik yok" description="Bu cariye ait etkinlik bulunmuyor." />
              ) : (
                <ListCard>
                  {activities.data.map((a) => (
                    <ListRow
                      key={a.id}
                      icon={ACTIVITY_TYPE_ICONS[a.activityType]}
                      title={a.subject}
                      subtitle={`${ACTIVITY_TYPE_LABELS[a.activityType]}${a.dueDate ? ' · ' + formatDate(a.dueDate) : ''}`}
                      trailing={
                        <Badge label={ACTIVITY_STATUS_LABELS[a.status]} tone={ACTIVITY_STATUS_TONES[a.status]} />
                      }
                      onPress={
                        canActWrite
                          ? () => nav.navigate('contacts.activities.form', { contactId: id, id: a.id }, 'Etkinlik düzenle')
                          : undefined
                      }
                    />
                  ))}
                </ListCard>
              )}
            </Section>
          ) : null}

          {canOppRead ? (
            <Section
              title="Fırsatlar"
              action={
                canOppWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Fırsat ekle"
                    onPress={() => nav.navigate('contacts.opportunities.form', { contactId: id }, 'Yeni fırsat')}
                  />
                ) : undefined
              }
            >
              {opps.loading ? (
                <Card>
                  <Skeleton width="70%" height={15} />
                </Card>
              ) : !opps.data || opps.data.length === 0 ? (
                <EmptyState icon="target" title="Fırsat yok" description="Bu cariye ait satış fırsatı bulunmuyor." />
              ) : (
                <ListCard>
                  {opps.data.map((o) => (
                    <ListRow
                      key={o.id}
                      icon="target"
                      title={o.name}
                      subtitle={o.stageName}
                      trailing={
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {formatMoney(o.amount, o.currencyCode)}
                          </Text>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.stageColor }} />
                        </View>
                      }
                      onPress={() => nav.navigate('contacts.opportunities.detail', { id: o.id }, o.name)}
                    />
                  ))}
                </ListCard>
              )}
            </Section>
          ) : null}
        </>
      )}

      <Modal visible={invoiceSheet} transparent animationType="slide" onRequestClose={() => setInvoiceSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }} onPress={() => setInvoiceSheet(false)}>
          <Pressable
            style={{
              backgroundColor: t.colors.background,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[4],
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[3] }}>
              <Text variant="title" weight="semibold">Fatura ekle</Text>
              <Pressable onPress={() => setInvoiceSheet(false)} hitSlop={8}>
                <Icon name="x" size={22} color={t.colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: t.spacing[5], gap: t.spacing[3] }}>
              <Pressable
                onPress={() => {
                  setInvoiceSheet(false)
                  nav.navigate('invoices.invoices.form', { type: 'sales', contactId: id }, 'Yeni satış faturası')
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: t.spacing[3],
                  padding: t.spacing[4], borderRadius: t.radius.xl,
                  borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.card,
                }}
              >
                <Icon name="arrow-up-right" size={24} color={t.colors.success} />
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">Satış Faturası Ekle</Text>
                  <Text variant="caption" tone="muted">Bu cariye satış faturası oluştur</Text>
                </View>
                <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setInvoiceSheet(false)
                  nav.navigate('invoices.invoices.form', { type: 'purchase', contactId: id }, 'Yeni alış faturası')
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: t.spacing[3],
                  padding: t.spacing[4], borderRadius: t.radius.xl,
                  borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.card,
                }}
              >
                <Icon name="arrow-down-left" size={24} color={t.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">Alış Faturası Ekle</Text>
                  <Text variant="caption" tone="muted">Bu cariye alış faturası oluştur</Text>
                </View>
                <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SendMessageSheet
        visible={sendSheet}
        contactId={id}
        defaults={{ channel: 'email', to: c?.email ?? '' }}
        onClose={() => setSendSheet(false)}
        onSent={() => {
          setSendSheet(false)
          activities.refetch()
        }}
      />
    </Screen>
  )
}

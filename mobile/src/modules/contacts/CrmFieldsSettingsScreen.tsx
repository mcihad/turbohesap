// CRM özel alan ayarları — Cari (contact) ve Fırsat (opportunity) kayıtlarına
// eklenecek özel alan tanımlarını yönetir. Alanlar entity bazında saklanır;
// değerler her kaydın `attributes` bag'inde tutulur. Bir alana dokununca
// CrmFieldFormScreen ile düzenlenir. pipelinesWrite ile korunur. Web'deki
// crm-fields-settings-page'in mobil eşleniği.

import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions, type CrmFieldEntity } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SegmentedControl,
  SkeletonRows,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { FIELD_TYPE_LABELS } from '../inventory/labels'

const ENTITY_OPTIONS: { value: CrmFieldEntity; label: string }[] = [
  { value: 'contact', label: 'Cari' },
  { value: 'opportunity', label: 'Fırsat' },
]

export function CrmFieldsSettingsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ContactsPermissions.pipelinesWrite)

  const [entity, setEntity] = React.useState<CrmFieldEntity>('contact')
  const defsQ = useAsync(() => api.contacts.fields.get(entity), [entity])
  const fields = defsQ.data?.fields ?? []

  return (
    <PermissionRequired
      permission={ContactsPermissions.pipelinesWrite}
      title="CRM özel alanları"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'CRM özel alanları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction
              icon="plus"
              onPress={() => nav.navigate('contacts.fields.form', { entity }, 'Yeni alan')}
            />
          ) : undefined,
        }}
        onRefresh={defsQ.refetch}
        refreshing={defsQ.refreshing}
      >
        <SegmentedControl options={ENTITY_OPTIONS} value={entity} onChange={setEntity} />

        {defsQ.loading ? (
          <SkeletonRows count={4} />
        ) : defsQ.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={defsQ.error}
            actionLabel="Tekrar dene"
            onAction={defsQ.refetch}
          />
        ) : fields.length === 0 ? (
          <EmptyState
            icon="sliders"
            title="Özel alan yok"
            description={`${entity === 'contact' ? 'Cari' : 'Fırsat'} kayıtlarına eklenecek özel alan tanımlanmamış.`}
            actionLabel={canWrite ? 'Yeni alan' : undefined}
            onAction={canWrite ? () => nav.navigate('contacts.fields.form', { entity }, 'Yeni alan') : undefined}
          />
        ) : (
          <ListCard>
            {fields.map((f) => (
              <ListRow
                key={f.key}
                icon="sliders"
                title={f.label}
                subtitle={`${FIELD_TYPE_LABELS[f.type] ?? f.type} · ${f.key}`}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                    {f.required ? <Badge label="Zorunlu" tone="warning" /> : null}
                  </View>
                }
                onPress={
                  canWrite
                    ? () => nav.navigate('contacts.fields.form', { entity, fieldKey: f.key }, f.label)
                    : undefined
                }
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}

// CodePrefixesScreen — admin list of code-prefix definitions (auto-numbering
// counters). Add (write-gated "+"), edit (tap a row), delete (trailing
// confirm). RN counterpart of the web /lookups/code-prefixes admin page.
// Gated by lookups.codePrefixes.read.

import * as React from 'react'
import { View } from 'react-native'

import { LookupsPermissions, codePrefixContextLabel } from '@turbohesap/shared'

import {
  Badge,
  Button,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function CodePrefixesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.codePrefixesRead)
  const canWrite = hasPermission(LookupsPermissions.codePrefixesWrite)
  const items = useAsync(() => api.codePrefixes.list(), [], { enabled: canRead })
  const { submit } = useSubmit()

  const rows = items.data ?? []

  return (
    <PermissionRequired permission={LookupsPermissions.codePrefixesRead} title="Kod Önekleri" onBack={nav.goBack}>
      <Screen
        header={{
          title: 'Kod Önekleri',
          subtitle: 'Kod öneki ve sayaç ayarları',
          onBack: nav.goBack,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('lookups.code-prefix.form', {}, 'Yeni önek')} />
          ) : undefined,
        }}
        onRefresh={items.refetch}
        refreshing={items.refreshing}
      >
        {items.loading ? (
          <SkeletonRows count={6} />
        ) : items.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={items.error} actionLabel="Tekrar dene" onAction={items.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="hash"
            title="Önek yok"
            description="Henüz kod öneki tanımlanmamış."
            actionLabel={canWrite ? 'Yeni önek' : undefined}
            onAction={canWrite ? () => nav.navigate('lookups.code-prefix.form', {}, 'Yeni önek') : undefined}
          />
        ) : (
          <ListCard>
            {rows.map((p) => (
              <ListRow
                key={p.id}
                title={codePrefixContextLabel(p.context)}
                subtitle={`${p.prefix} · ${p.previewCode}`}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                    <Badge label={p.incrementOnSave ? 'Kayıtta' : 'Seçince'} tone="muted" />
                    {!p.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                    {canWrite ? (
                      <Button
                        title=""
                        icon="trash-2"
                        variant="ghost"
                        size="sm"
                        onPress={() =>
                          confirmDestructive('Sil', `"${p.prefix}" öneki silinsin mi?`, () =>
                            submit(() => api.codePrefixes.remove(p.id), { onSuccess: items.refetch }),
                          )
                        }
                      />
                    ) : null}
                  </View>
                }
                onPress={canWrite ? () => nav.navigate('lookups.code-prefix.form', { id: p.id }, p.prefix) : undefined}
                chevron={canWrite}
              />
            ))}
          </ListCard>
        )}

        {canWrite ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingTop: t.spacing[2] }}>
            Düzenlemek için bir öneğe dokunun.
          </Text>
        ) : null}
      </Screen>
    </PermissionRequired>
  )
}

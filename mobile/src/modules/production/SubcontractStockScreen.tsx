// Fasoncudaki stok — açık fason sevklerden fasoncularda bulunan (gönderilen −
// iade) malzeme özeti. Salt okunur liste. Mirrors the simple list screens.

import * as React from 'react'
import { ProductionPermissions } from '@turbohesap/shared'
import {
  EmptyState,
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
import { useNav } from '../../navigation/nav-context'
import { formatQty } from './format'

export function SubcontractStockScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)

  const rows = useAsync(() => api.production.subcontract.stockAtSubcontractor(), [], { enabled: canRead })
  const list = rows.data ?? []

  return (
    <PermissionRequired permission={ProductionPermissions.read} title="Fasoncudaki Stok" onBack={nav.goBack}>
      <Screen
        header={{ title: 'Fasoncudaki Stok', onBack: nav.goBack }}
        onRefresh={rows.refetch}
        refreshing={rows.refreshing}
      >
        {rows.loading ? (
          <SkeletonRows count={6} />
        ) : rows.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={rows.error}
            actionLabel="Tekrar dene"
            onAction={rows.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState icon="package" title="Fasoncuda stok yok" description="Açık fason sevk bulunmuyor." />
        ) : (
          <ListCard>
            {list.map((r) => (
              <ListRow
                key={`${r.contactId}:${r.componentProductId}`}
                icon="package"
                title={r.componentName}
                subtitle={`${r.contactName} · ${r.componentCode} · Gönderilen ${formatQty(r.sentQuantity)} · İade ${formatQty(r.returnedQuantity)}`}
                trailing={
                  <Text weight="bold" style={{ fontFamily: 'monospace' }}>
                    {`${formatQty(r.atSubcontractor)} ${r.unit}`}
                  </Text>
                }
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}

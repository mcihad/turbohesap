// MyAssignmentsScreen — "Zimmetlerim": the demirbaşlar currently in MY custody.
// Driven by api.inventory.assetAssignments.mine() (active assignments for the
// logged-in user's linked personel). Each card has a prominent "Devret" button →
// the barcode/QR handshake (TransferInitiateScreen). Tapping a card opens the
// asset detail. Gated by inventory.assets.read; Devret needs inventory.assets.assign.

import * as React from 'react'
import { View } from 'react-native'

import { ASSET_STATUS_LABELS, InventoryPermissions } from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { assetStatusTone } from './asset-labels'

export function MyAssignmentsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canAssign = hasPermission(InventoryPermissions.assetsAssign)

  const mine = useAsync(() => api.inventory.assetAssignments.mine(), [], { enabled: canRead })
  const rows = mine.data ?? []

  return (
    <PermissionRequired
      permission={InventoryPermissions.assetsRead}
      title="Zimmetlerim"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Zimmetlerim',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={mine.refetch}
        refreshing={mine.refreshing}
      >
        {mine.loading ? (
          <SkeletonRows count={4} />
        ) : mine.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={mine.error}
            actionLabel="Tekrar dene"
            onAction={mine.refetch}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="user-check"
            title="Üzerinizde zimmet yok"
            description="Size zimmetlenen ekipman burada görünür."
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {rows.length} zimmetli ekipman
            </Text>
            {rows.map((a) => {
              const asset = a.asset
              if (!asset) return null
              return (
                <Card key={a.id} style={{ gap: t.spacing[3] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: t.radius.md,
                        backgroundColor: t.colors.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={asset.isVehicle ? 'truck' : 'box'} size={22} color={t.colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body" weight="semibold" numberOfLines={1}>
                        {asset.name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {asset.code}
                        {asset.plate ? ` · ${asset.plate}` : ''}
                      </Text>
                    </View>
                    <Badge label={ASSET_STATUS_LABELS[asset.status]} tone={assetStatusTone(asset.status)} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Detay"
                        variant="outline"
                        icon="info"
                        fullWidth
                        onPress={() => nav.navigate('inventory.assetDetail', { id: asset.id }, asset.name)}
                      />
                    </View>
                    {canAssign ? (
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Devret"
                          icon="send"
                          fullWidth
                          onPress={() =>
                            nav.navigate(
                              'inventory.transferInitiate',
                              { assetId: asset.id, assetName: asset.name },
                              'Zimmet devret',
                            )
                          }
                        />
                      </View>
                    ) : null}
                  </View>
                </Card>
              )
            })}
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}

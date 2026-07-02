// Min/Max (reorder) kuralları — ürün bazlı yeniden sipariş noktası. Planlama
// koşusu bu kuralları "Min/Max Stok" gerekçeli önerilere çevirir. Liste + oluştur/
// düzenle/sil bottom-sheet (StockCountListScreen CreateCountSheet desenini yansıtır).

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { ProductionPermissions, type CreateReorderRuleRequest } from '@turbohesap/shared'
import {
  Badge,
  Button,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  HeaderAction,
  Icon,
  Input,
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
import { formatQty } from './format'

interface RuleDraft {
  id?: string
  productId: string
  productName: string
  branchId: string
  minQty: string
  maxQty: string
  isActive: boolean
}

export function ReorderRulesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)
  const [sheet, setSheet] = React.useState<RuleDraft | null>(null)

  const rules = useAsync(() => api.production.reorderRules.list(), [], { enabled: canRead })
  const list = rules.data ?? []

  const openNew = () =>
    setSheet({ productId: '', productName: '', branchId: '', minQty: '0', maxQty: '0', isActive: true })

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Min/Max Kuralları"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Min/Max Kuralları',
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openNew} /> : undefined,
        }}
        onRefresh={rules.refetch}
        refreshing={rules.refreshing}
      >
        {rules.loading ? (
          <SkeletonRows count={6} />
        ) : rules.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={rules.error}
            actionLabel="Tekrar dene"
            onAction={rules.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="sliders"
            title="Kural bulunamadı"
            description="Henüz min/max kuralı tanımlanmamış."
            actionLabel={canWrite ? 'Yeni kural' : undefined}
            onAction={canWrite ? openNew : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Kural
            </Text>
            <ListCard>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  icon="sliders"
                  title={r.productName}
                  subtitle={`${r.productCode} · min ${formatQty(r.minQty)} / max ${formatQty(r.maxQty)}`}
                  trailing={<Badge label={r.isActive ? 'Aktif' : 'Pasif'} tone={r.isActive ? 'success' : 'muted'} />}
                  onPress={
                    canWrite
                      ? () =>
                          setSheet({
                            id: r.id,
                            productId: r.productId,
                            productName: r.productName,
                            branchId: r.branchId ?? '',
                            minQty: String(r.minQty),
                            maxQty: String(r.maxQty),
                            isActive: r.isActive,
                          })
                      : undefined
                  }
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>

      {sheet ? (
        <RuleSheet
          draft={sheet}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null)
            rules.refetch()
          }}
        />
      ) : null}
    </PermissionRequired>
  )
}

// ── Create / edit sheet ─────────────────────────────────────────────────────
function RuleSheet({
  draft,
  onClose,
  onSaved,
}: {
  draft: RuleDraft
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTheme()
  const { submit, busy } = useSubmit()
  const editing = !!draft.id

  const products = useAsync(() => api.inventory.products.list(), [])
  const branches = useAsync(() => api.org.branches.list(), [])

  const [productId, setProductId] = React.useState(draft.productId)
  const [branchId, setBranchId] = React.useState(draft.branchId)
  const [minQty, setMinQty] = React.useState(draft.minQty)
  const [maxQty, setMaxQty] = React.useState(draft.maxQty)
  const [isActive, setIsActive] = React.useState(draft.isActive)

  const productOptions = React.useMemo(
    () => [{ value: '', label: 'Ürün seçin' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
    [products.data],
  )
  const branchOptions = React.useMemo(
    () => [{ value: '', label: 'Tüm şubeler' }, ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branches.data],
  )

  const save = () => {
    if (!editing && !productId) {
      alert('Ürün seçilmelidir')
      return
    }
    void submit(
      async () => {
        if (editing && draft.id) {
          await api.production.reorderRules.update(draft.id, {
            branchId: branchId || null,
            minQty: Number(minQty) || 0,
            maxQty: Number(maxQty) || 0,
            isActive,
          })
        } else {
          const body: CreateReorderRuleRequest = {
            productId,
            branchId: branchId || null,
            minQty: Number(minQty) || 0,
            maxQty: Number(maxQty) || 0,
            isActive,
          }
          await api.production.reorderRules.create(body)
        }
        onSaved()
      },
      { errorTitle: 'Kaydedilemedi' },
    )
  }

  const remove = () => {
    if (!draft.id) return
    confirmDestructive('Kuralı sil', 'Bu min/max kuralı silinecek. Devam edilsin mi?', () =>
      void submit(
        async () => {
          await api.production.reorderRules.remove(draft.id as string)
          onSaved()
        },
        { errorTitle: 'Silinemedi' },
      ),
    )
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '90%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[3],
            }}
          >
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              {editing ? 'Kuralı Düzenle' : 'Yeni Kural'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[4] }}
          >
            {editing ? (
              <Input label="Ürün" value={draft.productName} editable={false} />
            ) : (
              <FormSelect label="Ürün" value={productId} options={productOptions} onChange={setProductId} />
            )}
            <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Input label="Min" value={minQty} onChangeText={setMinQty} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Max" value={maxQty} onChangeText={setMaxQty} keyboardType="numeric" />
              </View>
            </View>
            <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
            <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={save} />
            {editing ? (
              <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={remove} />
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

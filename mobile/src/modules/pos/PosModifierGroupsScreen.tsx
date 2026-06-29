// Ürün seçenekleri (modifier groups) yönetimi — POS modifiye gruplarını listele,
// oluştur, düzenle, sil ve grup seçeneklerini (±fiyat farkıyla) yönet. Satış
// ekranındaki modifiye sayfası bu grupları kullanır. InventoryPermissions ile
// korunur (read = görüntüleme, write = düzenleme).

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import {
  InventoryPermissions,
  MODIFIER_SELECTION_TYPES,
  type ModifierSelectionType,
  type ProductDto,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  Icon,
  Input,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

const SELECTION_LABELS: Record<ModifierSelectionType, string> = {
  single: 'Tek seçim',
  multi: 'Çoklu seçim',
}

interface GroupForm {
  name: string
  selectionType: ModifierSelectionType
  required: boolean
  minSelect: string
  maxSelect: string
  isActive: boolean
}

export function PosModifierGroupsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.modifiersWrite)
  const { submit, busy } = useSubmit()

  const groupsQ = useAsync(() => api.inventory.modifiers.listGroups(), [])
  const groups = React.useMemo(
    () => [...(groupsQ.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [groupsQ.data],
  )
  // Products → resolve names for the option's stock link (picker + display hint).
  const productsQ = useAsync(() => api.inventory.products.list(), [])
  const productNameById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const p of productsQ.data ?? []) m.set(p.id, p.name)
    return m
  }, [productsQ.data])

  const [newGroupName, setNewGroupName] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<GroupForm | null>(null)
  const [optionName, setOptionName] = React.useState('')
  const [optionDelta, setOptionDelta] = React.useState('')
  // Optional stock link for the option being added (deducts stock when chosen).
  const [optStockProductId, setOptStockProductId] = React.useState<string | null>(null)
  const [optConsumeQty, setOptConsumeQty] = React.useState('1')
  const [optDeductStock, setOptDeductStock] = React.useState(true)
  const [optReturnable, setOptReturnable] = React.useState(false)
  const [stockPickerOpen, setStockPickerOpen] = React.useState(false)

  const editingGroup = groups.find((g) => g.id === editingId) ?? null

  const openEditor = (id: string) => {
    const g = groups.find((x) => x.id === id)
    if (!g) return
    setEditingId(id)
    setForm({
      name: g.name,
      selectionType: g.selectionType,
      required: g.required,
      minSelect: String(g.minSelect),
      maxSelect: g.maxSelect == null ? '' : String(g.maxSelect),
      isActive: g.isActive,
    })
    setOptionName('')
    setOptionDelta('')
    setOptStockProductId(null)
    setOptConsumeQty('1')
    setOptDeductStock(true)
    setOptReturnable(false)
  }

  const createGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    void submit(
      async () => {
        const created = await api.inventory.modifiers.createGroup({ name })
        setNewGroupName('')
        groupsQ.refetch()
        openEditor(created.id)
      },
      { errorTitle: 'Grup eklenemedi' },
    )
  }

  const removeGroup = (id: string, name: string) =>
    confirmDestructive('Grup sil', `"${name}" seçenek grubu silinsin mi?`, () => {
      void submit(() => api.inventory.modifiers.removeGroup(id).then(() => undefined), {
        onSuccess: groupsQ.refetch,
        errorTitle: 'Grup silinemedi',
      })
    })

  const saveGroup = () => {
    if (!editingId || !form) return
    const name = form.name.trim()
    if (!name) return
    void submit(
      async () => {
        await api.inventory.modifiers.updateGroup(editingId, {
          name,
          selectionType: form.selectionType,
          required: form.required,
          minSelect: Number(form.minSelect) || 0,
          maxSelect: form.maxSelect.trim() === '' ? null : Number(form.maxSelect),
          isActive: form.isActive,
        })
      },
      {
        onSuccess: () => {
          setEditingId(null)
          setForm(null)
          groupsQ.refetch()
        },
        errorTitle: 'Grup kaydedilemedi',
      },
    )
  }

  const addOption = () => {
    if (!editingId) return
    const name = optionName.trim()
    if (!name) return
    void submit(
      async () => {
        await api.inventory.modifiers.addOption(editingId, {
          name,
          priceDelta: Number(optionDelta.replace(',', '.')) || 0,
          // Optional stock link — when a product is chosen, choosing this option
          // also consumes that product's stock at sale time.
          stockProductId: optStockProductId,
          consumeQty: optStockProductId ? Number(optConsumeQty.replace(',', '.')) || 1 : undefined,
          deductStock: optStockProductId ? optDeductStock : undefined,
          returnable: optStockProductId ? optReturnable : undefined,
        })
        setOptionName('')
        setOptionDelta('')
        setOptStockProductId(null)
        setOptConsumeQty('1')
        setOptDeductStock(true)
        setOptReturnable(false)
        groupsQ.refetch()
      },
      { errorTitle: 'Seçenek eklenemedi' },
    )
  }

  const toggleDefault = (optionId: string, current: boolean) => {
    if (!editingId) return
    void submit(
      () => api.inventory.modifiers.updateOption(editingId, optionId, { isDefault: !current }).then(() => undefined),
      { onSuccess: groupsQ.refetch, errorTitle: 'Güncellenemedi' },
    )
  }

  const removeOption = (optionId: string) => {
    if (!editingId) return
    void submit(() => api.inventory.modifiers.removeOption(editingId, optionId).then(() => undefined), {
      onSuccess: groupsQ.refetch,
      errorTitle: 'Seçenek silinemedi',
    })
  }

  return (
    <PermissionRequired
      permission={InventoryPermissions.modifiersRead}
      title="Ürün Seçenekleri"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Ürün Seçenekleri', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={groupsQ.refetch}
        refreshing={groupsQ.refreshing}
      >
        {groupsQ.loading ? (
          <SkeletonRows count={5} />
        ) : groupsQ.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={groupsQ.error}
            actionLabel="Tekrar dene"
            onAction={groupsQ.refetch}
          />
        ) : (
          <>
            {groups.length === 0 ? (
              <EmptyState icon="sliders" title="Seçenek grubu yok" description="Aşağıdan ilk grubu ekleyin." />
            ) : (
              <Section title={`${groups.length} grup`}>
                {groups.map((g) => (
                  <Card key={g.id} style={{ gap: t.spacing[2], padding: t.spacing[3] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                      <Text variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                        {g.name}
                      </Text>
                      {g.required ? <Badge label="Zorunlu" tone="warning" /> : null}
                      {!g.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                      <Badge label={SELECTION_LABELS[g.selectionType]} tone="info" />
                    </View>
                    <Text variant="caption" tone="muted">
                      {g.options.length} seçenek · {g.productCount} ürün
                      {g.options.length > 0 ? ` · ${g.options.slice(0, 3).map((o) => o.name).join(', ')}${g.options.length > 3 ? '…' : ''}` : ''}
                    </Text>
                    {canWrite ? (
                      <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                        <Button title="Düzenle" icon="edit-2" variant="outline" size="sm" onPress={() => openEditor(g.id)} style={{ flex: 1 }} />
                        <Button title="Sil" icon="trash-2" variant="ghost" size="sm" onPress={() => removeGroup(g.id, g.name)} />
                      </View>
                    ) : null}
                  </Card>
                ))}
              </Section>
            )}

            {canWrite ? (
              <Section title="Yeni grup">
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Grup adı" placeholder="örn. Ekstra Soslar" value={newGroupName} onChangeText={setNewGroupName} />
                  </View>
                  <Button title="Ekle" icon="plus" onPress={createGroup} loading={busy} disabled={!newGroupName.trim()} style={{ height: 48, alignSelf: 'flex-end' }} />
                </View>
              </Section>
            ) : null}
          </>
        )}
      </Screen>

      {/* Group editor */}
      <Modal visible={!!editingId} transparent animationType="slide" onRequestClose={() => setEditingId(null)}>
        <Pressable onPress={() => setEditingId(null)} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] }}>
              <Text variant="title" weight="bold" style={{ flex: 1 }}>
                Grup düzenle
              </Text>
              <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                <Icon name="x" size={24} color={t.colors.mutedForeground} />
              </Pressable>
            </View>

            {form ? (
              <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
                <Input label="Ad" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
                <FormSelect
                  label="Seçim tipi"
                  value={form.selectionType}
                  onChange={(v) => setForm({ ...form, selectionType: v })}
                  options={MODIFIER_SELECTION_TYPES.map((s) => ({ value: s, label: SELECTION_LABELS[s] }))}
                />
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Min seçim" value={form.minSelect} onChangeText={(v) => setForm({ ...form, minSelect: v })} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Maks (boş=sınırsız)" value={form.maxSelect} onChangeText={(v) => setForm({ ...form, maxSelect: v })} keyboardType="number-pad" />
                  </View>
                </View>
                <FormSwitchRow label="Zorunlu" value={form.required} onValueChange={(v) => setForm({ ...form, required: v })} />
                <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />

                <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
                <Text variant="overline" tone="muted">
                  Seçenekler
                </Text>
                {(editingGroup?.options ?? []).length === 0 ? (
                  <Text variant="caption" tone="muted">
                    Henüz seçenek yok.
                  </Text>
                ) : (
                  (editingGroup?.options ?? [])
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((o) => (
                      <View
                        key={o.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing[2],
                          padding: t.spacing[2.5],
                          borderRadius: t.radius.md,
                          borderWidth: 1,
                          borderColor: t.colors.border,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="body" weight="medium" numberOfLines={1}>
                            {o.name}
                          </Text>
                          <Text variant="caption" tone={o.priceDelta < 0 ? 'success' : 'muted'}>
                            {o.priceDelta > 0 ? '+' : ''}
                            {formatMoney(o.priceDelta)}
                          </Text>
                          {o.stockProductId ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Icon name="package" size={12} color={t.colors.warning} />
                              <Text variant="caption" tone="warning" numberOfLines={1}>
                                Stoktan düşer · {o.consumeQty}× {productNameById.get(o.stockProductId) ?? 'ürün'}
                                {o.returnable ? ' · iade edilebilir' : ''}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Pressable onPress={() => toggleDefault(o.id, o.isDefault)} hitSlop={6}>
                          <Badge label="Varsayılan" tone={o.isDefault ? 'success' : 'muted'} />
                        </Pressable>
                        <Pressable onPress={() => removeOption(o.id)} hitSlop={6}>
                          <Icon name="trash-2" size={16} color={t.colors.mutedForeground} />
                        </Pressable>
                      </View>
                    ))
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                  <View style={{ flex: 2 }}>
                    <Input label="Seçenek adı" placeholder="örn. Acı sos" value={optionName} onChangeText={setOptionName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Fiyat farkı" placeholder="0" value={optionDelta} onChangeText={setOptionDelta} keyboardType="decimal-pad" />
                  </View>
                  <Button title="Ekle" icon="plus" onPress={addOption} loading={busy} disabled={!optionName.trim()} style={{ height: 48, alignSelf: 'flex-end' }} />
                </View>

                {/* Optional stock link for the new option — deducts a product's
                    stock when this option is chosen (e.g. "Ekstra ketçap"). */}
                <View style={{ gap: t.spacing[2] }}>
                  <Text variant="label" tone="muted" weight="medium">
                    Stok bağlantısı (opsiyonel)
                  </Text>
                  <Pressable
                    onPress={() => setStockPickerOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 48,
                      paddingHorizontal: t.spacing[3.5],
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.inputBorder,
                      backgroundColor: t.colors.card,
                    }}
                  >
                    <Icon name="package" size={16} color={t.colors.mutedForeground} />
                    <Text
                      variant="body"
                      tone={optStockProductId ? 'default' : 'muted'}
                      style={{ flex: 1, marginLeft: t.spacing[2] }}
                      numberOfLines={1}
                    >
                      {optStockProductId ? productNameById.get(optStockProductId) ?? 'Ürün' : 'Stok ürünü seç'}
                    </Text>
                    {optStockProductId ? (
                      <Pressable onPress={() => setOptStockProductId(null)} hitSlop={8}>
                        <Icon name="x" size={16} color={t.colors.mutedForeground} />
                      </Pressable>
                    ) : (
                      <Icon name="chevron-down" size={18} color={t.colors.mutedForeground} />
                    )}
                  </Pressable>
                  {optStockProductId ? (
                    <>
                      <Input
                        label="Tüketilen miktar (1 birim için)"
                        value={optConsumeQty}
                        onChangeText={setOptConsumeQty}
                        keyboardType="decimal-pad"
                        placeholder="1"
                      />
                      <FormSwitchRow label="Stoktan düş" value={optDeductStock} onValueChange={setOptDeductStock} />
                      <FormSwitchRow label="İade edilebilir" value={optReturnable} onValueChange={setOptReturnable} />
                    </>
                  ) : null}
                </View>

                <Button title="Grubu Kaydet" fullWidth loading={busy} disabled={!form.name.trim()} onPress={saveGroup} />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <StockProductPickerModal
        visible={stockPickerOpen}
        products={(productsQ.data ?? []).filter((p) => p.isActive)}
        loading={productsQ.loading}
        onClose={() => setStockPickerOpen(false)}
        onPick={(id) => {
          setOptStockProductId(id)
          setStockPickerOpen(false)
        }}
      />
    </PermissionRequired>
  )
}

// ── Stock product picker (for an option's stock link) ─────────────────────
function StockProductPickerModal({
  visible,
  products,
  loading,
  onClose,
  onPick,
}: {
  visible: boolean
  products: ProductDto[]
  loading: boolean
  onClose: () => void
  onPick: (id: string) => void
}) {
  const t = useTheme()
  const [query, setQuery] = React.useState('')
  const filtered = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    if (!q) return products
    return products.filter((p) => `${p.name} ${p.code}`.toLocaleLowerCase('tr').includes(q))
  }, [products, query])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3], gap: t.spacing[2] }}>
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Stok ürünü seç
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[2] }}>
            <Input icon="search" placeholder="Ürün ara…" value={query} onChangeText={setQuery} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[8] }}>
            {loading ? (
              <Text variant="body" tone="muted" style={{ padding: t.spacing[4] }}>
                Yükleniyor…
              </Text>
            ) : filtered.length === 0 ? (
              <EmptyState icon="package" title="Ürün bulunamadı" />
            ) : (
              filtered.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPick(p.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[3],
                    paddingVertical: t.spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                  }}
                >
                  <Icon name="package" size={18} color={t.colors.mutedForeground} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="medium" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {p.code}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Bulk price matrix modals for the product detail screen — edit every variant's
// price at once. Two variants: by sales channel, and the variants' own base
// price. A "fill all" box sets every row; only changed rows are written
// (validation is strict: non-empty values must be finite and ≥ 0).

import * as React from 'react'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SalesPermissions, type ProductDto } from '@turbohesap/shared'

import { Button, Icon, Text } from '../../components'
import { FormSelect, type SelectOption } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'
import { money } from './labels'

function isInvalid(v: string): boolean {
  const s = v.trim()
  if (s === '') return false
  const n = Number(s)
  return !Number.isFinite(n) || n < 0
}
const norm = (v: string) => v.trim()

interface MatrixRow {
  id: string
  label: string
  sublabel?: string
  initial: string
  hint?: string
}

// A compact right-aligned numeric cell with a red border when invalid.
function PriceCell({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
}) {
  const t = useTheme()
  const [focused, setFocused] = React.useState(false)
  const bad = isInvalid(value)
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.colors.mutedForeground}
      keyboardType="decimal-pad"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: 100,
        height: 40,
        textAlign: 'right',
        paddingHorizontal: t.spacing[2.5],
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: bad ? t.colors.destructive : focused ? t.colors.ring : t.colors.inputBorder,
        backgroundColor: t.colors.card,
        color: t.colors.foreground,
        fontSize: t.type.size.base,
      }}
    />
  )
}

// Shared bottom-sheet shell: handle, title/close, description, body and footer.
function Sheet({
  title,
  description,
  header,
  rows,
  values,
  onChange,
  onFillAll,
  currency,
  changes,
  anyInvalid,
  saving,
  onClose,
  onSave,
}: {
  title: string
  description: string
  header?: React.ReactNode
  rows: MatrixRow[]
  values: Record<string, string>
  onChange: (id: string, v: string) => void
  onFillAll: (v: string) => void
  currency: string
  changes: number
  anyInvalid: boolean
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [fill, setFill] = React.useState('')

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[3],
            maxHeight: '90%',
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
              gap: t.spacing[3],
            }}
          >
            <Text variant="title" weight="semibold" style={{ flex: 1 }}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[5], paddingTop: 4 }}>
            {description}
          </Text>

          <View style={{ paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], gap: t.spacing[3] }}>
            {header}

            {/* Fill-all box */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
              <View style={{ flex: 1, gap: t.spacing[1.5] }}>
                <Text variant="label" tone="muted" weight="medium">
                  Tümüne uygula ({currency})
                </Text>
                <PriceCell value={fill} onChangeText={setFill} placeholder="örn. 100" />
              </View>
              <Button
                title="Uygula"
                variant="secondary"
                size="sm"
                disabled={fill.trim() === '' || isInvalid(fill)}
                onPress={() => onFillAll(norm(fill))}
              />
            </View>
          </View>

          <ScrollView
            style={{ marginTop: t.spacing[2], maxHeight: 360 }}
            contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}
            keyboardShouldPersistTaps="handled"
          >
            {rows.map((r, i) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing[3],
                  paddingVertical: t.spacing[2],
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.colors.border,
                }}
              >
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="label" weight="medium" numberOfLines={1}>
                    {r.label}
                  </Text>
                  {r.sublabel ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {r.sublabel}
                    </Text>
                  ) : null}
                </View>
                <PriceCell
                  value={values[r.id] ?? ''}
                  onChangeText={(v) => onChange(r.id, v)}
                  placeholder={r.hint}
                />
              </View>
            ))}
            {rows.length === 0 ? (
              <Text variant="caption" tone="muted" style={{ paddingVertical: t.spacing[6], textAlign: 'center' }}>
                Varyant yok.
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing[3],
              paddingHorizontal: t.spacing[5],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[3],
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
            }}
          >
            <Text variant="caption" tone={anyInvalid ? 'destructive' : 'muted'} style={{ flex: 1 }}>
              {anyInvalid ? 'Geçersiz fiyat var' : `${changes} değişiklik`}
            </Text>
            <Button title="İptal" variant="outline" size="sm" onPress={onClose} />
            <Button
              title="Kaydet"
              size="sm"
              loading={saving}
              disabled={anyInvalid || changes === 0}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Bulk channel prices -------------------------------------------------
export function BulkChannelPriceModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}) {
  const { hasPermission } = useAuth()
  const { submit, busy } = useSubmit()
  const channels = useAsync(() => api.sales.channels.list(), [], {
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  // Memoise so `initial`/`values` don't reset every render (which would wipe
  // in-progress edits).
  const variants = React.useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  )

  // Stored price for (channel, variant) as a string ('' = none).
  const stored = React.useCallback(
    (cid: string, vid: string): string => {
      const row = (product.channelPrices ?? []).find((c) => c.channelId === cid && c.variantId === vid)
      return row ? String(row.salePrice) : ''
    },
    [product.channelPrices],
  )
  const buildValues = React.useCallback(
    (cid: string): Record<string, string> => Object.fromEntries(variants.map((v) => [v.id, stored(cid, v.id)])),
    [variants, stored],
  )

  const [channelId, setChannelId] = React.useState('')
  const [values, setValues] = React.useState<Record<string, string>>({})

  // One-time default channel pick — ref-guarded so it never re-triggers (no
  // derived-state effect that could loop).
  const didInit = React.useRef(false)
  React.useEffect(() => {
    if (didInit.current || !channels.data?.length) return
    didInit.current = true
    const cid = channels.data[0].id
    setChannelId(cid)
    setValues(buildValues(cid))
  }, [channels.data, buildValues])

  const selectChannel = (cid: string) => {
    setChannelId(cid)
    setValues(buildValues(cid))
  }

  const rows: MatrixRow[] = variants.map((v) => ({
    id: v.id,
    label: v.label || v.code,
    sublabel: v.code,
    initial: stored(channelId, v.id),
    hint: v.effectiveSalePrice == null ? undefined : String(v.effectiveSalePrice),
  }))
  const anyInvalid = rows.some((r) => isInvalid(values[r.id] ?? ''))
  const changes = rows.filter((r) => norm(values[r.id] ?? '') !== norm(r.initial))

  const channelOpts: SelectOption<string>[] = [
    { value: '', label: 'Kanal seçin' },
    ...(channels.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  function save() {
    void submit(
      async () => {
        for (const r of changes) {
          const cur = norm(values[r.id] ?? '')
          if (cur === '') {
            const existing = (product.channelPrices ?? []).find(
              (c) => c.channelId === channelId && c.variantId === r.id,
            )
            if (existing) await api.inventory.products.removeChannelPrice(product.id, existing.id)
          } else {
            await api.inventory.products.setChannelPrice(product.id, {
              variantId: r.id,
              channelId,
              salePrice: Number(cur),
            })
          }
        }
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <Sheet
      title="Kanala göre toplu fiyat"
      description="Yalnızca değiştirdiğiniz satırlar kaydedilir; boş bırakılan mevcut kanal fiyatını kaldırır."
      header={<FormSelect label="Kanal" value={channelId} options={channelOpts} onChange={selectChannel} />}
      rows={rows}
      values={values}
      onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
      onFillAll={(v) => setValues(Object.fromEntries(rows.map((r) => [r.id, v])))}
      currency={product.currency}
      changes={changes.length}
      anyInvalid={anyInvalid || !channelId}
      saving={busy}
      onClose={onClose}
      onSave={save}
    />
  )
}

// --- Bulk variant base prices --------------------------------------------
export function BulkVariantPriceModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}) {
  const { submit, busy } = useSubmit()
  const variants = React.useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  )

  // Initialise once (the modal mounts fresh each open) — no syncing effect.
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.salePrice == null ? '' : String(v.salePrice)])),
  )

  const rows: MatrixRow[] = variants.map((v) => ({
    id: v.id,
    label: v.label || v.code,
    sublabel: v.priceExtra ? `${v.code} · +${money(v.priceExtra, product.currency)}` : v.code,
    initial: v.salePrice == null ? '' : String(v.salePrice),
    hint: v.effectiveSalePrice == null ? undefined : String(v.effectiveSalePrice),
  }))
  const anyInvalid = rows.some((r) => isInvalid(values[r.id] ?? ''))
  const changes = rows.filter((r) => norm(values[r.id] ?? '') !== norm(r.initial))

  function save() {
    void submit(
      async () => {
        for (const r of changes) {
          const cur = norm(values[r.id] ?? '')
          await api.inventory.products.updateVariant(product.id, r.id, {
            salePrice: cur === '' ? null : Number(cur),
          })
        }
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <Sheet
      title="Varyant fiyatlarını topluca"
      description="Boş bırakılan satır taban fiyatı (+ fark) devralır. Yalnızca değişenler kaydedilir."
      rows={rows}
      values={values}
      onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
      onFillAll={(v) => setValues(Object.fromEntries(rows.map((r) => [r.id, v])))}
      currency={product.currency}
      changes={changes.length}
      anyInvalid={anyInvalid}
      saving={busy}
      onClose={onClose}
      onSave={save}
    />
  )
}

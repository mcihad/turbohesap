// Compact variant-axes editor for the mobile product form. Each axis has a name
// and a set of values entered as removable chips (type a value + "Ekle"). The
// cartesian product of all axes is what the detail screen can then generate.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import type { VariantAttribute } from '@turbohesap/shared'

import { Button, Card, Icon, Input, Text } from '../../components'
import { useTheme } from '../../theme/theme-context'

export function VariantAxesEditor({
  value,
  onChange,
}: {
  value: VariantAttribute[]
  onChange: (next: VariantAttribute[]) => void
}) {
  const t = useTheme()
  const update = (i: number, patch: Partial<VariantAttribute>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  const addAxis = () => onChange([...value, { name: '', values: [] }])
  const removeAxis = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  const comboCount =
    value.length > 0 && value.every((a) => a.values.length > 0)
      ? value.reduce((acc, a) => acc * a.values.length, 1)
      : 0

  return (
    <View style={{ gap: t.spacing[3] }}>
      {value.map((axis, i) => (
        <Card key={i} style={{ gap: t.spacing[2.5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <View style={{ flex: 1 }}>
              <Input
                value={axis.name}
                onChangeText={(v) => update(i, { name: v })}
                placeholder="Eksen adı (Renk, Beden…)"
              />
            </View>
            <Pressable onPress={() => removeAxis(i)} hitSlop={8} style={{ padding: t.spacing[1] }}>
              <Icon name="trash-2" size={18} color={t.colors.destructive} />
            </Pressable>
          </View>
          <ValueTags values={axis.values} onChange={(vals) => update(i, { values: vals })} />
        </Card>
      ))}

      <Button title="Eksen ekle" variant="outline" icon="plus" size="sm" onPress={addAxis} />

      {comboCount > 0 ? (
        <Text variant="caption" tone="muted">
          {comboCount} varyant kombinasyonu üretilebilir.
        </Text>
      ) : (
        <Text variant="caption" tone="muted">
          Her eksene en az bir değer ekleyin.
        </Text>
      )}
    </View>
  )
}

function ValueTags({
  values,
  onChange,
}: {
  values: string[]
  onChange: (next: string[]) => void
}) {
  const t = useTheme()
  const [draft, setDraft] = React.useState('')

  const commit = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    const next = [...values]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setDraft('')
  }

  return (
    <View style={{ gap: t.spacing[2] }}>
      {values.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5] }}>
          {values.map((v) => (
            <View
              key={v}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingLeft: t.spacing[2.5],
                paddingRight: t.spacing[1.5],
                paddingVertical: 4,
                borderRadius: t.radius.full,
                backgroundColor: t.colors.muted,
              }}
            >
              <Text variant="caption" weight="medium">{v}</Text>
              <Pressable onPress={() => onChange(values.filter((x) => x !== v))} hitSlop={6}>
                <Icon name="x" size={14} color={t.colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
        <View style={{ flex: 1 }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Değer ekle…"
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={commit}
          />
        </View>
        <Button title="Ekle" variant="secondary" size="sm" onPress={commit} disabled={!draft.trim()} />
      </View>
    </View>
  )
}

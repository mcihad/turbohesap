// CodePrefixInput (mobile) — RN counterpart of the web
// frontend/src/components/code-prefix/code-prefix-input.tsx. Left segment:
// tap to open a bottom-sheet list of the prefixes configured for `context`
// (see LookupSelect for the same sheet pattern). Right segment: an editable
// NUMBER-ONLY text field — the prefix text itself is never duplicated into
// it. Each prefix owns its own auto-incrementing counter (see
// `useCodePrefix` for the increment-timing contract). Hand-typing into the
// number segment always overrides auto-numbering; the composed
// `prefix + number` string is what's reported via `onChange`/`finalize()`.
//
//   const codeRef = React.useRef<CodePrefixInputHandle>(null)
//   <CodePrefixInput ref={codeRef} label="Stok kodu" context={CodePrefixContexts.inventoryProducts}
//     value={form.code} onChange={(v) => set('code', v)} editable={!editing} />
//   // right before save: const code = await codeRef.current?.finalize() ?? form.code

import * as React from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native'

import type { CodePrefixDto } from '@turbohesap/shared'

import { useCodePrefix } from '../lib/use-code-prefix'
import { useTheme } from '../theme/theme-context'
import { Icon } from './Icon'
import { Text } from './Text'

export interface CodePrefixInputHandle {
  /**
   * Call right before the parent screen submits. Consumes (atomically
   * reserves) the code now if the selected prefix defers that to save time;
   * otherwise just returns the value already shown. Returns the
   * authoritative final code string to send in the parent's payload.
   */
  finalize: () => Promise<string>
}

export interface CodePrefixInputProps {
  /** Usage context, e.g. "inventory.products" — selects which prefixes are offered. */
  context: string
  value: string
  onChange: (value: string) => void
  label?: string
  editable?: boolean
  /**
   * Auto-restore the last-used prefix and immediately peek/consume a fresh
   * code on mount. Defaults to `editable` (a locked field never
   * auto-assigns). Set explicitly to `false` for a field that stays EDITABLE
   * but already holds a real value (e.g. editing an existing cari whose code
   * may be changed by hand) — the prefix is still detected from that
   * existing value for display-splitting, but nothing auto-consumes just
   * from opening the screen.
   */
  autoAssign?: boolean
  placeholder?: string
  ref?: React.Ref<CodePrefixInputHandle>
}

export function CodePrefixInput({
  context,
  value,
  onChange,
  label,
  editable = true,
  autoAssign,
  placeholder,
  ref,
}: CodePrefixInputProps) {
  const t = useTheme()
  const cp = useCodePrefix({ context, enabled: autoAssign ?? editable })
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const [open, setOpen] = React.useState(false)

  React.useImperativeHandle(ref, () => ({ finalize: cp.finalize }), [cp.finalize])

  // Reflect the hook's value (from prefix pick / peek / consume) into the
  // parent's controlled state — only once a selection actually exists, so an
  // untouched hook (empty `displayValue`) never blows away a real value.
  React.useEffect(() => {
    if (!cp.selectedId) return
    if (cp.displayValue !== value) onChangeRef.current(cp.displayValue)
  }, [cp.displayValue, cp.selectedId, value])

  // Prefer the LONGEST matching prefix: contexts can have overlapping
  // prefixes (e.g. "ST-" and "ST-POS-"), and picking the first match instead
  // of the most specific one would misparse "ST-POS-0001" as prefix "ST-" +
  // number "POS-0001".
  const matchedFromValue = cp.prefixes.reduce<CodePrefixDto | null>(
    (best, p) =>
      value.startsWith(p.prefix) && (!best || p.prefix.length > best.prefix.length) ? p : best,
    null,
  )
  const activePrefix = cp.selected ?? matchedFromValue
  const numberValue = activePrefix ? value.slice(activePrefix.prefix.length) : value

  function handleNumberChange(text: string) {
    const full = (activePrefix?.prefix ?? '') + text
    cp.onManualChange(full)
    onChange(full)
  }

  const canOpenPicker = editable && cp.prefixes.length > 0

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <Pressable
          onPress={() => canOpenPicker && setOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: 48,
            paddingHorizontal: t.spacing[3],
            borderTopLeftRadius: t.radius.md,
            borderBottomLeftRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.inputBorder,
            backgroundColor: t.colors.muted,
            opacity: canOpenPicker ? 1 : 0.6,
          }}
        >
          <Text variant="mono" weight="medium">
            {activePrefix?.prefix ?? '—'}
          </Text>
          <Icon name="chevron-down" size={16} color={t.colors.mutedForeground} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            height: 48,
            paddingHorizontal: t.spacing[3.5],
            borderTopRightRadius: t.radius.md,
            borderBottomRightRadius: t.radius.md,
            borderWidth: 1,
            borderLeftWidth: 0,
            borderColor: t.colors.inputBorder,
            backgroundColor: t.colors.card,
          }}
        >
          <TextInput
            value={numberValue}
            editable={editable}
            onChangeText={handleNumberChange}
            placeholder={cp.isBusy ? 'Üretiliyor…' : placeholder}
            placeholderTextColor={t.colors.mutedForeground}
            style={{ flex: 1, color: t.colors.foreground, fontSize: t.type.size.base, paddingVertical: 0 }}
          />
          {cp.isBusy ? <ActivityIndicator size="small" color={t.colors.mutedForeground} /> : null}
        </View>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.colors.card,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              paddingTop: t.spacing[3],
              paddingBottom: t.spacing[8],
              maxHeight: '75%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>
            <View style={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
              <Text variant="overline" tone="muted">
                Önek seçin
              </Text>
            </View>
            <ScrollView>
              {cp.prefixes.length === 0 ? (
                <Text variant="label" tone="muted" style={{ padding: t.spacing[5] }}>
                  Bu bağlam için önek tanımlı değil.
                </Text>
              ) : (
                cp.prefixes.map((p) => {
                  const sel = p.id === cp.selectedId
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        cp.selectPrefix(p.id)
                        setOpen(false)
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: t.spacing[5],
                        paddingVertical: t.spacing[3.5],
                      }}
                    >
                      <Text variant="mono" weight={sel ? 'semibold' : 'normal'} tone={sel ? 'primary' : 'default'}>
                        {p.prefix}
                      </Text>
                      {sel ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

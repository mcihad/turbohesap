// Form kit — the building blocks for the mobile create/edit screens. Token-driven
// and theme-aware, mirroring the web form controls (DESIGN.md §14.10):
//   FormTextArea · FormSwitchRow · FormSelect (modal picker) · Checklist.
// Single-line text fields reuse the existing <Input label=… /> primitive.

import * as React from 'react'
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { useTheme } from '../theme/theme-context'
import { Icon } from './Icon'
import { Input } from './Input'
import { Text } from './Text'

/** Multi-line text field (description, address…) styled like Input. */
export function FormTextArea({
  label,
  value,
  onChangeText,
  placeholder,
  rows = 3,
}: {
  label?: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const t = useTheme()
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.mutedForeground}
        multiline
        textAlignVertical="top"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: rows * 22 + 16,
          paddingHorizontal: t.spacing[3.5],
          paddingVertical: t.spacing[2.5],
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: focused ? t.colors.ring : t.colors.inputBorder,
          backgroundColor: t.colors.card,
          color: t.colors.foreground,
          fontSize: t.type.size.base,
        }}
      />
    </View>
  )
}

/** A labelled switch row with optional helper text. */
export function FormSwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string
  description?: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        paddingVertical: t.spacing[2],
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" weight="medium">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Track value={value} />
    </Pressable>
  )
}

function Track({ value }: { value: boolean }) {
  const t = useTheme()
  return (
    <View
      style={{
        width: 44,
        height: 26,
        borderRadius: t.radius.full,
        backgroundColor: value ? t.colors.primary : t.colors.muted,
        padding: 3,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: t.radius.full,
          backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  )
}

export interface SelectOption<T extends string> {
  value: T
  label: string
}

/** Single-select field that opens a modal list of options. */
export function FormSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
}) {
  const t = useTheme()
  const [open, setOpen] = React.useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
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
        <Text variant="body" style={{ flex: 1 }}>
          {current?.label ?? '—'}
        </Text>
        <Icon name="chevron-down" size={18} color={t.colors.mutedForeground} />
      </Pressable>

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
              maxHeight: '70%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>
            {label ? (
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
                {label}
              </Text>
            ) : null}
            <ScrollView>
              {options.map((opt) => {
                const active = opt.value === value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value)
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
                    <Text variant="body" weight={active ? 'semibold' : 'normal'} tone={active ? 'primary' : 'default'}>
                      {opt.label}
                    </Text>
                    {active ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export interface ChecklistItem {
  id: string
  title: string
  subtitle?: string
}

/** Multi-select list in a card (roles, branches, permissions). */
export function Checklist({
  label,
  items,
  selected,
  onToggle,
  emptyText = 'Öğe yok',
  searchable = false,
}: {
  label?: string
  items: ChecklistItem[]
  selected: string[]
  onToggle: (id: string, on: boolean) => void
  emptyText?: string
  searchable?: boolean
}) {
  const t = useTheme()
  const [q, setQ] = React.useState('')
  const visible = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(query) ||
        i.subtitle?.toLowerCase().includes(query),
    )
  }, [items, q])

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="label" tone="muted" weight="medium">
            {label}
          </Text>
          <Text variant="caption" tone="muted">
            {selected.length} seçili
          </Text>
        </View>
      ) : null}
      {searchable ? <Input icon="search" placeholder="Ara" value={q} onChangeText={setQ} /> : null}
      <View
        style={{
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.card,
          overflow: 'hidden',
        }}
      >
        {visible.length === 0 ? (
          <Text variant="caption" tone="muted" style={{ padding: t.spacing[4] }}>
            {emptyText}
          </Text>
        ) : (
          visible.map((item, i) => {
            const checked = selected.includes(item.id)
            return (
              <Pressable
                key={item.id}
                onPress={() => onToggle(item.id, !checked)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing[3],
                  paddingHorizontal: t.spacing[3.5],
                  paddingVertical: t.spacing[3],
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.colors.border,
                }}
              >
                <CheckBox checked={checked} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="label" weight="medium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )
          })
        )}
      </View>
    </View>
  )
}

export function CheckBox({ checked }: { checked: boolean }) {
  const t = useTheme()
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: t.radius.sm,
        borderWidth: checked ? 0 : 1.5,
        borderColor: t.colors.inputBorder,
        backgroundColor: checked ? t.colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Icon name="check" size={15} color={t.colors.primaryForeground} /> : null}
    </View>
  )
}

export function FormDatePicker({
  label,
  value,
  onChange,
  mode = 'datetime',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  mode?: 'date' | 'datetime'
}) {
  const t = useTheme()
  const dateVal = React.useMemo(() => {
    const d = new Date(value)
    return isNaN(d.getTime()) ? new Date() : d
  }, [value])

  const [showAndroid, setShowAndroid] = React.useState<boolean>(false)
  const [androidMode, setAndroidMode] = React.useState<'date' | 'time'>('date')

  const handleIOSChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate.toISOString())
    }
  }

  const handleAndroidChange = (event: any, selectedDate?: Date) => {
    setShowAndroid(false)
    if (event.type === 'dismissed') return

    if (selectedDate) {
      if (mode === 'datetime' && androidMode === 'date') {
        const current = new Date(dateVal)
        current.setFullYear(selectedDate.getFullYear())
        current.setMonth(selectedDate.getMonth())
        current.setDate(selectedDate.getDate())
        onChange(current.toISOString())
        setAndroidMode('time')
        setTimeout(() => setShowAndroid(true), 100)
      } else {
        onChange(selectedDate.toISOString())
      }
    }
  }

  const showPicker = () => {
    if (Platform.OS === 'android') {
      setAndroidMode('date')
      setShowAndroid(true)
    }
  }

  const formatDisplay = () => {
    try {
      const options: Intl.DateTimeFormatOptions = mode === 'datetime'
        ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: 'long', day: 'numeric' }
      return dateVal.toLocaleDateString('tr-TR', options)
    } catch {
      return value
    }
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={{ gap: t.spacing[1.5] }}>
        {label ? (
          <Text variant="label" tone="muted" weight="medium">
            {label}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 48,
            paddingHorizontal: t.spacing[3.5],
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.inputBorder,
            backgroundColor: t.colors.card,
            justifyContent: 'space-between',
          }}
        >
          <Text variant="body" style={{ flex: 1 }}>
            {formatDisplay()}
          </Text>
          <DateTimePicker
            value={dateVal}
            mode={mode === 'datetime' ? 'datetime' : 'date'}
            display="compact"
            onValueChange={handleIOSChange}
            locale="tr-TR"
            themeVariant={t.scheme}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={showPicker}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          paddingHorizontal: t.spacing[3.5],
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.inputBorder,
          backgroundColor: t.colors.card,
          justifyContent: 'space-between',
        }}
      >
        <Text variant="body" style={{ flex: 1 }}>
          {formatDisplay()}
        </Text>
        <Icon name="calendar" size={18} color={t.colors.mutedForeground} />
      </Pressable>

      {showAndroid && (
        <DateTimePicker
          value={dateVal}
          mode={androidMode}
          display="default"
          onValueChange={handleAndroidChange}
          locale="tr-TR"
        />
      )}
    </View>
  )
}

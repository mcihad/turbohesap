// InstrumentFilterSheet — advanced filter bottom sheet for the çek/senet list:
// direction, instrumentType, status, contact and a date range (dueDate window).
// Mirrors documents/DocumentFilterSheet's boxed-checkrow shape.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  INSTRUMENT_DIRECTIONS,
  INSTRUMENT_TYPES,
  type ContactDto,
  type InstrumentStatus,
} from '@turbohesap/shared'

import { Button, FormSelect, Icon, Text, type SelectOption } from '../../components'
import { FormDatePicker } from '../../components/form'
import { useTheme } from '../../theme/theme-context'
import {
  INSTRUMENT_DIRECTION_LABELS,
  INSTRUMENT_STATUS_LABELS,
  INSTRUMENT_TYPE_LABELS,
} from './instrument-labels'
import type { InstrumentFilters } from './InstrumentsListScreen'

const STATUS_OPTIONS: Array<{ value: InstrumentStatus | null; label: string }> = [
  { value: null, label: 'Tümü' },
  ...(Object.keys(INSTRUMENT_STATUS_LABELS) as InstrumentStatus[]).map((s) => ({
    value: s,
    label: INSTRUMENT_STATUS_LABELS[s],
  })),
]

export function InstrumentFilterSheet({
  open,
  onClose,
  contacts,
  filters,
  setFilters,
}: {
  open: boolean
  onClose: () => void
  contacts: ContactDto[]
  filters: InstrumentFilters
  setFilters: React.Dispatch<React.SetStateAction<InstrumentFilters>>
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  const contactOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Tümü' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))],
    [contacts],
  )

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: t.radius['2xl'], borderTopRightRadius: t.radius['2xl'], paddingTop: t.spacing[3], maxHeight: '92%' }}>
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <Text variant="title" weight="semibold">Filtrele</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[5] }}>
            <Group title="Yön">
              <Boxed>
                <CheckRow first label="Tümü" active={!filters.direction} onPress={() => setFilters((f) => ({ ...f, direction: null }))} />
                {INSTRUMENT_DIRECTIONS.map((d) => (
                  <CheckRow
                    key={d}
                    label={INSTRUMENT_DIRECTION_LABELS[d]}
                    active={filters.direction === d}
                    onPress={() => setFilters((f) => ({ ...f, direction: d }))}
                  />
                ))}
              </Boxed>
            </Group>

            <Group title="Tür">
              <Boxed>
                <CheckRow first label="Tümü" active={!filters.instrumentType} onPress={() => setFilters((f) => ({ ...f, instrumentType: null }))} />
                {INSTRUMENT_TYPES.map((ty) => (
                  <CheckRow
                    key={ty}
                    label={INSTRUMENT_TYPE_LABELS[ty]}
                    active={filters.instrumentType === ty}
                    onPress={() => setFilters((f) => ({ ...f, instrumentType: ty }))}
                  />
                ))}
              </Boxed>
            </Group>

            <Group title="Durum">
              <Boxed>
                {STATUS_OPTIONS.map((opt, i) => (
                  <CheckRow
                    key={opt.value ?? 'all'}
                    first={i === 0}
                    label={opt.label}
                    active={filters.status === opt.value}
                    onPress={() => setFilters((f) => ({ ...f, status: opt.value }))}
                  />
                ))}
              </Boxed>
            </Group>

            <Group title="Cari">
              <FormSelect
                value={filters.contactId ?? ''}
                options={contactOptions}
                onChange={(v) => setFilters((f) => ({ ...f, contactId: v || null }))}
              />
            </Group>

            <Group title="Vade Aralığı">
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <FormDatePicker
                    label="Başlangıç"
                    value={filters.from ?? ''}
                    onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
                    mode="date"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormDatePicker
                    label="Bitiş"
                    value={filters.to ?? ''}
                    onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
                    mode="date"
                  />
                </View>
              </View>
            </Group>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], paddingBottom: insets.bottom + t.spacing[3], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            <Button
              title="Sıfırla"
              variant="ghost"
              size="sm"
              onPress={() =>
                setFilters({ direction: null, instrumentType: null, status: null, contactId: null, from: null, to: null })
              }
            />
            <View style={{ flex: 1 }} />
            <Button title="Uygula" size="sm" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function Boxed({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.lg, overflow: 'hidden' }}>{children}</View>
}

function CheckRow({
  label,
  active,
  onPress,
  first,
}: {
  label: string
  active: boolean
  onPress: () => void
  first?: boolean
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2.5],
        paddingVertical: t.spacing[2.5],
        paddingHorizontal: t.spacing[3],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.border,
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: t.radius.sm, borderWidth: active ? 0 : 1.5, borderColor: t.colors.inputBorder, backgroundColor: active ? t.colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {active ? <Icon name="check" size={15} color={t.colors.primaryForeground} /> : null}
      </View>
      <Text variant="label" weight={active ? 'semibold' : 'normal'} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[2] }}>
      <Text variant="overline" tone="muted">{title}</Text>
      {children}
    </View>
  )
}

/** Count of active (non-default) filters, for the badge on the filter button. */
export function instrumentFilterCount(f: InstrumentFilters): number {
  let n = 0
  if (f.direction) n++
  if (f.instrumentType) n++
  if (f.status) n++
  if (f.contactId) n++
  if (f.from) n++
  if (f.to) n++
  return n
}

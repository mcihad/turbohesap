// Lightweight View-based charts for the mobile dashboards (no native SVG dep).
// MiniBarChart — labelled horizontal bars; SegmentBar — a stacked distribution
// bar with a legend. Both wrapped in a titled Card by ChartCard.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Card } from './Card'
import { Text } from './Text'

export interface Datum {
  name: string
  value: number
}

// A categorical palette matching the web charts.
const PALETTE = ['#6d34d6', '#2e74e6', '#1a9e6b', '#d9962b', '#e0454a', '#9d6cf2', '#19b6c9']

export function ChartCard({
  title,
  subtitle,
  children,
  isEmpty = false,
  emptyText = 'Gösterilecek veri yok',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  isEmpty?: boolean
  emptyText?: string
}) {
  const t = useTheme()
  return (
    <Card style={{ gap: t.spacing[3] }}>
      <View style={{ gap: 2 }}>
        <Text variant="label" weight="semibold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isEmpty ? (
        <Text variant="caption" tone="muted" style={{ paddingVertical: t.spacing[6], textAlign: 'center' }}>
          {emptyText}
        </Text>
      ) : (
        children
      )}
    </Card>
  )
}

export function MiniBarChart({ data, format }: { data: Datum[]; format?: (n: number) => string }) {
  const t = useTheme()
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <View style={{ gap: t.spacing[2.5] }}>
      {data.map((d, i) => (
        <View key={d.name + i} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {d.name}
            </Text>
            <Text variant="caption" weight="semibold" style={{ marginLeft: 8 }}>
              {format ? format(d.value) : String(d.value)}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: t.radius.full, backgroundColor: t.colors.muted, overflow: 'hidden' }}>
            <View
              style={{
                width: `${(d.value / max) * 100}%`,
                height: '100%',
                borderRadius: t.radius.full,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

export function SegmentBar({ data }: { data: Datum[] }) {
  const t = useTheme()
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <View style={{ gap: t.spacing[3] }}>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: t.radius.full, overflow: 'hidden', backgroundColor: t.colors.muted }}>
        {data.map((d, i) => (
          <View key={d.name + i} style={{ width: `${(d.value / total) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        {data.map((d, i) => (
          <View key={d.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE[i % PALETTE.length] }} />
            <Text variant="caption" tone="muted">
              {d.name} · {d.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

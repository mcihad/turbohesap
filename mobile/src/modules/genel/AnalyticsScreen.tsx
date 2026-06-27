// AnalyticsScreen — a lightweight reporting view under Genel. Illustrative
// metrics + a simple bar visualisation built from Views (no chart dependency).
// Reached from the dashboard; has a back button.

import * as React from 'react'
import { View } from 'react-native'

import { Card, Screen, Section, StatCard, Text } from '../../components'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const WEEK = [
  { label: 'Pzt', value: 62 },
  { label: 'Sal', value: 48 },
  { label: 'Çar', value: 80 },
  { label: 'Per', value: 56 },
  { label: 'Cum', value: 94 },
  { label: 'Cmt', value: 34 },
  { label: 'Paz', value: 41 },
]

export function AnalyticsScreen() {
  const t = useTheme()
  const nav = useNav()
  const max = Math.max(...WEEK.map((d) => d.value))

  return (
    <Screen header={{ title: 'Analiz', subtitle: 'Son 7 gün', onBack: nav.goBack }}>
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <StatCard icon="activity" label="Oturum" value="3.2K" delta="+12%" tone="primary" />
        <StatCard icon="clock" label="Ort. süre" value="4:18" delta="-3%" deltaTone="warning" tone="info" />
      </View>

      <Section title="Haftalık etkinlik">
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 160,
              gap: t.spacing[2],
            }}
          >
            {WEEK.map((d) => (
              <View key={d.label} style={{ flex: 1, alignItems: 'center', gap: t.spacing[2] }}>
                <View
                  style={{
                    width: '70%',
                    height: `${(d.value / max) * 100}%`,
                    minHeight: 6,
                    backgroundColor: d.value === max ? t.colors.primary : t.colors.primarySoft,
                    borderRadius: t.radius.sm,
                  }}
                />
                <Text variant="caption" tone="muted">
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Section title="Dağılım">
        <Card style={{ gap: t.spacing[3] }}>
          {[
            { label: 'Mobil', value: 58, tone: t.colors.primary },
            { label: 'Masaüstü', value: 32, tone: t.colors.info },
            { label: 'Tablet', value: 10, tone: t.colors.warning },
          ].map((row) => (
            <View key={row.label} style={{ gap: t.spacing[1.5] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label">{row.label}</Text>
                <Text variant="label" tone="muted">
                  %{row.value}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: t.radius.full, backgroundColor: t.colors.muted, overflow: 'hidden' }}>
                <View style={{ width: `${row.value}%`, height: '100%', backgroundColor: row.tone, borderRadius: t.radius.full }} />
              </View>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  )
}

// AnalyticsScreen — a lightweight reporting view under Genel. Illustrative
// metrics + a simple bar visualisation built from Views (no chart dependency).
// Reached from the dashboard; has a back button.

import * as React from 'react'
import { View } from 'react-native'

import { Card, Screen, Section, StatCard, Text, MiniBarChart, SegmentBar } from '../../components'
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

const HOURS = [
  { label: '08:00', value: 25 },
  { label: '10:00', value: 40 },
  { label: '12:00', value: 95 },
  { label: '14:00', value: 60 },
  { label: '16:00', value: 45 },
  { label: '18:00', value: 85 },
  { label: '20:00', value: 70 },
  { label: '22:00', value: 30 },
]

export function AnalyticsScreen() {
  const t = useTheme()
  const nav = useNav()
  const maxWeek = Math.max(...WEEK.map((d) => d.value))
  const maxHours = Math.max(...HOURS.map((d) => d.value))

  return (
    <Screen header={{ title: 'Analiz', subtitle: 'Son 7 gün', onBack: nav.goBack }}>
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <StatCard icon="activity" label="Oturum" value="3.2K" delta="+12%" tone="primary" />
        <StatCard icon="clock" label="Ort. süre" value="4:18" delta="-3%" deltaTone="warning" tone="info" />
      </View>

      {/* Haftalık etkinlik (Düzeltilmiş) */}
      <Section title="Haftalık etkinlik">
        <Card>
          {/* Grafik alanı: Yüksekliği sınırlı ve sadece barları barındırıyor */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 120,
              gap: t.spacing[2],
            }}
          >
            {WEEK.map((d) => (
              <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <View
                  style={{
                    width: '65%',
                    height: `${(d.value / maxWeek) * 100}%`,
                    minHeight: 6,
                    backgroundColor: d.value === maxWeek ? t.colors.primary : t.colors.primarySoft,
                    borderRadius: t.radius.sm,
                  }}
                />
              </View>
            ))}
          </View>
          {/* Etiketler alanı: Grafik alanından bağımsız, altta */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing[2], marginTop: t.spacing[3] }}>
            {WEEK.map((d) => (
              <View key={d.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" tone="muted">
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      {/* Günlük Yoğunluk Saatleri (Yeni Mock Grafik) */}
      <Section title="Saatlik Yoğunluk">
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 100,
              gap: t.spacing[1.5],
            }}
          >
            {HOURS.map((h) => (
              <View key={h.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <View
                  style={{
                    width: '50%',
                    height: `${(h.value / maxHours) * 100}%`,
                    minHeight: 4,
                    backgroundColor: h.value === maxHours ? t.colors.info : t.colors.muted,
                    borderRadius: t.radius.xs,
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing[1.5], marginTop: t.spacing[3] }}>
            {HOURS.map((h) => (
              <View key={h.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" tone="muted" style={{ fontSize: 9 }}>
                  {h.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      {/* Kategori Satışları (Yeni Mock Grafik - MiniBarChart) */}
      <Section title="Kategori Satışları">
        <Card style={{ gap: t.spacing[3] }}>
          <MiniBarChart
            data={[
              { name: 'Sıcak İçecekler', value: 1420 },
              { name: 'Soğuk İçecekler', value: 980 },
              { name: 'Tatlılar & Pasta', value: 650 },
              { name: 'Ana Yemekler', value: 480 },
              { name: 'Atıştırmalıklar', value: 240 },
            ]}
            format={(v) => `₺${v.toLocaleString('tr-TR')}`}
          />
        </Card>
      </Section>

      {/* Ciro Dağılımı (Yeni Mock Grafik - SegmentBar) */}
      <Section title="Ciro Dağılımı (Kanal Bazlı)">
        <Card style={{ gap: t.spacing[3] }}>
          <SegmentBar
            data={[
              { name: 'Gel Al / Masa', value: 48000 },
              { name: 'Yemeksepeti', value: 28000 },
              { name: 'Trendyol', value: 16000 },
              { name: 'Getir', value: 11000 },
            ]}
          />
        </Card>
      </Section>

      {/* Cihaz Dağılımı */}
      <Section title="Cihaz Dağılımı">
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

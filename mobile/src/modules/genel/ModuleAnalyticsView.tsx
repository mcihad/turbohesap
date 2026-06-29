// ModuleAnalyticsView — renders a generic `ModuleStatsDto` (KPI grid, one main
// time-series trend, N breakdown charts and N "top" lists) for any module's
// analytics screen. The shape is uniform across modules, so this single view
// powers every report screen (overview/pos/inventory/finance/…). Charts are real
// (react-native-gifted-charts over react-native-svg); colours come from the theme
// + per-slice `StatSlice.color`.

import * as React from 'react'
import { View } from 'react-native'
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts'
import type { ModuleStatsDto, StatKpi, StatSlice, StatUnit } from '@turbohesap/shared'

import { ChartCard, ListCard, ListRow, Skeleton, StatCard, Text } from '../../components'
import { useTheme } from '../../theme/theme-context'

// Categorical palette matching the web charts; used when a slice has no colour.
const PALETTE = ['#6d34d6', '#2e74e6', '#1a9e6b', '#d9962b', '#e0454a', '#9d6cf2', '#19b6c9']

// ── Formatting ──────────────────────────────────────────────────────────────

const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${numberFmt.format(value)} ${currency}`
  }
}

function formatValue(value: number, unit: StatUnit, currency: string): string {
  switch (unit) {
    case 'money':
      return formatMoney(value, currency)
    case 'percent':
      return `%${numberFmt.format(value)}`
    default:
      return numberFmt.format(value)
  }
}

// A compact tick label from a bucket key: "2026-06-29" → "06-29",
// "2026-06" → "06", "2026-W26" → "W26".
function shortPeriod(period: string): string {
  const parts = period.split('-')
  return parts.length > 1 ? parts.slice(1).join('-') : period
}

// Map a StatKpi unit → a representative Feather icon.
const UNIT_ICON = { money: 'dollar-sign', percent: 'percent', qty: 'package', count: 'hash' } as const

// StatCard only supports a subset of tones; fold the others onto the nearest.
function statTone(tone: StatKpi['tone']): 'primary' | 'success' | 'warning' | 'info' {
  switch (tone) {
    case 'success':
      return 'success'
    case 'warning':
    case 'destructive':
      return 'warning'
    case 'info':
    case 'muted':
      return 'info'
    default:
      return 'primary'
  }
}

function kpiDelta(kpi: StatKpi): { label: string; tone: 'success' | 'destructive' } | undefined {
  if (kpi.delta == null) return undefined
  const pct = Math.round(kpi.delta * 100)
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, tone: kpi.delta >= 0 ? 'success' : 'destructive' }
}

// gifted-charts renders a chart `actualContainerWidth = width + yAxisLabelWidth`
// wide (verified in gifted-charts-core). So the plottable `width` we pass MUST be
// `measuredContainerWidth - Y_AXIS_W - SAFETY`, or the chart overflows to the
// right and gets clipped by the card. Y_AXIS_W is the gutter the y-axis number
// labels live in; SAFETY absorbs sub-pixel rounding + borders so we stay strictly
// inside the card.
const Y_AXIS_W = 36
const CHART_SAFETY = 8

// Compute the plot width that fits inside a measured container width.
function plotWidth(containerWidth: number): number {
  return Math.max(0, containerWidth - Y_AXIS_W - CHART_SAFETY)
}

// Compact a y-axis number (12_500 → "12,5B", 1_200_000 → "1,2M") so axis labels
// stay inside Y_AXIS_W without clipping. Passed to gifted-charts via `formatYLabel`.
function compactNumber(raw: string): string {
  const value = Number(raw)
  if (!Number.isFinite(value)) return raw
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${numberFmt.format(value / 1_000_000)}M`
  if (abs >= 1_000) return `${numberFmt.format(value / 1_000)}B`
  return numberFmt.format(value)
}

// Truncate a long category label so x-axis ticks don't overlap/overflow.
function shortLabel(name: string, max = 8): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

// Measure available width, then render charts at the right size (RN charts need
// an explicit pixel width). `width` is the card's inner content width.
function Measured({ children }: { children: (width: number) => React.ReactNode }) {
  const [width, setWidth] = React.useState(0)
  return (
    <View
      style={{ width: '100%', overflow: 'hidden' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? children(width) : null}
    </View>
  )
}

// ── View ──────────────────────────────────────────────────────────────────────

export function ModuleAnalyticsView({ stats, loading }: { stats?: ModuleStatsDto; loading: boolean }) {
  const t = useTheme()

  if (loading || !stats) {
    return (
      <View style={{ gap: t.spacing[3] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ width: '47%', flexGrow: 1 }}>
              <Skeleton width="100%" height={96} />
            </View>
          ))}
        </View>
        <Skeleton width="100%" height={240} />
        <Skeleton width="100%" height={200} />
      </View>
    )
  }

  const currency = stats.currency ?? 'TRY'
  const { kpis, trend, breakdowns, topLists } = stats
  const hasValue2 = trend.points.some((p) => p.value2 != null)

  return (
    <View style={{ gap: t.spacing[4] }}>
      {/* KPI grid (2-up) */}
      {kpis.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          {kpis.map((kpi) => {
            const delta = kpiDelta(kpi)
            return (
              <View key={kpi.key} style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>
                <StatCard
                  icon={UNIT_ICON[kpi.unit] ?? 'hash'}
                  tone={statTone(kpi.tone)}
                  label={kpi.label}
                  value={formatValue(kpi.value, kpi.unit, currency)}
                  delta={delta?.label}
                  deltaTone={delta?.tone}
                />
              </View>
            )
          })}
        </View>
      ) : null}

      {/* Main trend (area line; second series overlaid when present) */}
      <ChartCard
        title={trend.label}
        subtitle={hasValue2 && trend.label2 ? `${trend.label} · ${trend.label2}` : undefined}
        isEmpty={trend.points.length === 0}
      >
        <Measured>
          {(width) => {
            const count = trend.points.length
            // Plot area = container minus the y-axis gutter and a safety margin, so
            // the chart's footprint (Y_AXIS_W + plotW) stays strictly inside the card.
            const plotW = plotWidth(width)
            // Spread the line across the full plot width: first point at x=0, last
            // at x=plotW. No initial/end padding ⇒ no empty left band.
            const spacing = count > 1 ? plotW / (count - 1) : plotW
            const step = Math.max(1, Math.ceil(count / 6))
            return (
              <LineChart
                areaChart
                curved
                data={trend.points.map((p, i) => ({
                  value: p.value,
                  label: i % step === 0 ? shortPeriod(p.period) : '',
                }))}
                data2={hasValue2 ? trend.points.map((p) => ({ value: p.value2 ?? 0 })) : undefined}
                width={plotW}
                height={180}
                spacing={spacing}
                initialSpacing={0}
                endSpacing={0}
                yAxisLabelWidth={Y_AXIS_W}
                formatYLabel={compactNumber}
                thickness={2}
                color={t.colors.primary}
                color2={t.colors.info}
                startFillColor={t.colors.primary}
                startFillColor2={t.colors.info}
                startOpacity={0.25}
                endOpacity={0.02}
                startOpacity2={0.18}
                endOpacity2={0.02}
                hideDataPoints
                noOfSections={4}
                yAxisThickness={0}
                xAxisColor={t.colors.border}
                rulesColor={t.colors.border}
                rulesType="dashed"
                yAxisTextStyle={{ color: t.colors.mutedForeground, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: t.colors.mutedForeground, fontSize: 9 }}
                xAxisLabelsVerticalShift={2}
                disableScroll
              />
            )
          }}
        </Measured>
      </ChartCard>

      {/* Breakdowns — donut or bar */}
      {breakdowns.map((b) => (
        <ChartCard key={b.key} title={b.label} isEmpty={b.data.length === 0}>
          {b.chart === 'donut' ? (
            <DonutBreakdown slices={b.data} unit={b.unit} currency={currency} />
          ) : (
            <Measured>
              {(width) => {
                const count = b.data.length || 1
                // Plot area = container minus the y-axis gutter + safety margin
                // (keeps total width < card). Small initialSpacing kills the left band.
                const plotW = plotWidth(width)
                const initialSpacing = 10
                // Divide the remaining width into one slot per bar, then split each
                // slot into a bar + gap so bars fill the width evenly.
                const slot = (plotW - initialSpacing) / count
                const barWidth = Math.max(8, Math.min(44, slot * 0.62))
                const spacing = Math.max(4, slot - barWidth)
                return (
                  <BarChart
                    data={b.data.map((s, i) => ({
                      value: s.value,
                      label: shortLabel(s.name),
                      frontColor: s.color ?? PALETTE[i % PALETTE.length],
                    }))}
                    width={plotW}
                    height={170}
                    barWidth={barWidth}
                    spacing={spacing}
                    initialSpacing={initialSpacing}
                    endSpacing={0}
                    yAxisLabelWidth={Y_AXIS_W}
                    formatYLabel={compactNumber}
                    barBorderRadius={4}
                    noOfSections={4}
                    yAxisThickness={0}
                    xAxisColor={t.colors.border}
                    rulesColor={t.colors.border}
                    rulesType="dashed"
                    yAxisTextStyle={{ color: t.colors.mutedForeground, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: t.colors.mutedForeground, fontSize: 9 }}
                    xAxisTextNumberOfLines={1}
                    xAxisLabelsVerticalShift={2}
                    disableScroll
                  />
                )
              }}
            </Measured>
          )}
        </ChartCard>
      ))}

      {/* Top lists */}
      {topLists.map((list) =>
        list.rows.length === 0 ? null : (
          <View key={list.key} style={{ gap: t.spacing[2] }}>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.label}
            </Text>
            <ListCard>
              {list.rows.map((row, i) => (
                <ListRow
                  key={row.id ?? `${list.key}-${i}`}
                  icon="bar-chart-2"
                  iconTone="muted"
                  title={row.name}
                  subtitle={row.sub}
                  chevron={false}
                  trailing={
                    <Text variant="label" weight="semibold" style={{ fontFamily: 'monospace' }}>
                      {formatValue(row.value, list.unit, currency)}
                    </Text>
                  }
                />
              ))}
            </ListCard>
          </View>
        ),
      )}
    </View>
  )
}

// A donut with a legend (name + formatted value) beside the slices.
function DonutBreakdown({
  slices,
  unit,
  currency,
}: {
  slices: StatSlice[]
  unit: StatUnit
  currency: string
}) {
  const t = useTheme()
  const total = slices.reduce((s, d) => s + d.value, 0)
  const data = slices.map((s, i) => ({ value: s.value, color: s.color ?? PALETTE[i % PALETTE.length] }))

  const legend = (
    <View style={{ flex: 1, minWidth: 140, gap: t.spacing[2] }}>
      {slices.map((s, i) => (
        <View key={s.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color ?? PALETTE[i % PALETTE.length] }}
          />
          <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {s.name}
          </Text>
          <Text variant="caption" weight="semibold" style={{ fontFamily: 'monospace' }}>
            {formatValue(s.value, unit, currency)}
          </Text>
        </View>
      ))}
    </View>
  )

  return (
    <Measured>
      {(width) => {
        // The donut needs ~190px alongside its legend; below that, stack so the
        // legend gets the full width and is never clipped.
        const stacked = width < 320
        const radius = Math.min(76, Math.max(56, Math.floor((stacked ? width : width * 0.42) / 2)))
        const pie = (
          <PieChart
            donut
            data={data}
            radius={radius}
            innerRadius={Math.round(radius * 0.62)}
            innerCircleColor={t.colors.card}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text variant="caption" tone="muted">
                  Toplam
                </Text>
                <Text variant="label" weight="semibold">
                  {formatValue(total, unit, currency)}
                </Text>
              </View>
            )}
          />
        )
        return stacked ? (
          <View style={{ gap: t.spacing[4], alignItems: 'stretch' }}>
            <View style={{ alignItems: 'center' }}>{pie}</View>
            {legend}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[4] }}>
            {pie}
            {legend}
          </View>
        )
      }}
    </Measured>
  )
}

// EChart — a thin React wrapper around Apache ECharts for the dashboards. Inits
// one chart per mount, applies the option, auto-resizes, re-themes on light/dark,
// and disposes on unmount. Option-builder helpers (donut / bar / line) below keep
// the dashboards declarative.

import * as React from 'react'
import * as echarts from 'echarts'

import { useTheme } from '@/lib/theme/use-theme'

// A categorical palette tuned to the violet brand; concrete hex so the canvas
// renderer is happy in every browser.
export const CHART_COLORS = [
  '#6d34d6', '#2e74e6', '#1a9e6b', '#d9962b', '#e0454a',
  '#9d6cf2', '#19b6c9', '#7b61ff', '#e0731a', '#c026a3',
]

export function EChart({
  option,
  height = 260,
  className,
}: {
  option: echarts.EChartsOption
  height?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const chartRef = React.useRef<echarts.ECharts | null>(null)
  const { resolvedMode } = useTheme()

  // Init / dispose once.
  React.useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // Apply option (+ theme defaults) whenever it or the mode changes.
  React.useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const dark = resolvedMode === 'dark'
    const text = dark ? '#ECECEF' : '#1E1E29'
    const sub = dark ? '#9E9EAE' : '#6E6E7E'
    const split = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,20,30,0.07)'
    chart.setOption(
      {
        color: CHART_COLORS,
        textStyle: { color: text, fontFamily: 'inherit' },
        legend: { textStyle: { color: sub } },
        xAxis: undefined,
        ...option,
      },
      { notMerge: true },
    )
    // Patch axis/grid colors after merge (so callers don't repeat them).
    chart.setOption({
      xAxis: arr(option.xAxis).map((a) => withAxisTheme(a, sub, split)),
      yAxis: arr(option.yAxis).map((a) => withAxisTheme(a, sub, split)),
    } as echarts.EChartsOption)
  }, [option, resolvedMode])

  return <div ref={ref} className={className} style={{ width: '100%', height }} />
}

function arr<T>(v: T | T[] | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function withAxisTheme(axis: unknown, sub: string, split: string): Record<string, unknown> {
  const a = (axis ?? {}) as Record<string, unknown>
  return {
    ...a,
    axisLine: { lineStyle: { color: split }, ...(a.axisLine as object) },
    axisLabel: { color: sub, ...(a.axisLabel as object) },
    splitLine: { lineStyle: { color: split }, ...(a.splitLine as object) },
    axisTick: { show: false, ...(a.axisTick as object) },
  }
}

// ── Option builders ──────────────────────────────────────────────────────────

export interface Datum {
  name: string
  value: number
}

/** Donut chart with a centred total. */
export function donutOption(data: Datum[], centerLabel?: string): echarts.EChartsOption {
  const total = data.reduce((s, d) => s + d.value, 0)
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{v|${total}}\n{l|${centerLabel ?? 'Toplam'}}`,
          rich: {
            v: { fontSize: 24, fontWeight: 700, lineHeight: 30 },
            l: { fontSize: 11, color: '#9E9EAE' },
          },
        },
        labelLine: { show: false },
        data,
      },
    ],
  }
}

/** Horizontal/vertical bar chart from name/value data. */
export function barOption(
  data: Datum[],
  opts: { horizontal?: boolean; color?: string } = {},
): echarts.EChartsOption {
  const cat = data.map((d) => d.name)
  const val = data.map((d) => d.value)
  const catAxis = { type: 'category' as const, data: cat }
  const valAxis = { type: 'value' as const }
  return {
    grid: { left: opts.horizontal ? 8 : 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: opts.horizontal ? valAxis : catAxis,
    yAxis: opts.horizontal ? catAxis : valAxis,
    series: [
      {
        type: 'bar',
        data: val,
        barMaxWidth: 28,
        itemStyle: { color: opts.color ?? CHART_COLORS[0], borderRadius: opts.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
      },
    ],
  }
}

/** Smooth area line chart. */
export function lineOption(categories: string[], values: number[], color = CHART_COLORS[0]): echarts.EChartsOption {
  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', boundaryGap: false, data: categories },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        data: values,
        lineStyle: { color, width: 3 },
        itemStyle: { color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '05' },
          ]),
        },
      },
    ],
  }
}

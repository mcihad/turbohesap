// StatCard — a compact, soft-tinted metric tile for dashboards: a colored icon
// chip, a big value, a label, and an optional delta badge. Sits two-up in a row.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Badge, type BadgeTone, withAlpha } from './Badge'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export function StatCard({
  icon,
  label,
  value,
  delta,
  deltaTone = 'success',
  tone = 'primary',
}: {
  icon: IconName
  label: string
  value: string
  delta?: string
  deltaTone?: BadgeTone
  tone?: 'primary' | 'success' | 'warning' | 'info'
}) {
  const t = useTheme()
  const color = {
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    info: t.colors.info,
  }[tone]
  const dark = t.scheme === 'dark'

  return (
    <View
      style={{
        flex: 1,
        gap: t.spacing[2.5],
        padding: t.spacing[3.5],
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.18),
        backgroundColor: withAlpha(color, dark ? 0.12 : 0.07),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: t.radius.lg,
            backgroundColor: withAlpha(color, 0.18),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={18} color={color} />
        </View>
        {delta ? <Badge label={delta} tone={deltaTone} /> : null}
      </View>
      <View style={{ gap: 1 }}>
        <Text variant="h2" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  )
}

// Detail field primitives — a label-over-value pair and a 2-column grid, used by
// the read-only detail screens (sales channel, branch, user, role…).

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Text } from './Text'

export function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  return (
    <View style={{ gap: 2, width: full ? '100%' : '47%', flexGrow: full ? 1 : 0 }}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text variant="label" weight="medium" style={mono ? { fontFamily: 'monospace' } : undefined}>
          {String(value)}
        </Text>
      ) : (
        value
      )}
    </View>
  )
}

/** Wrap Field children in a wrapping 2-column row inside a card body. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: t.spacing[4],
        columnGap: t.spacing[4],
      }}
    >
      {children}
    </View>
  )
}

// Section — a labelled block: an uppercase overline title (+ optional trailing
// action) above its children. Groups content on long screens.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Text } from './Text'

export function Section({
  title,
  action,
  children,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[2.5] }}>
      {title || action ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: t.spacing[1],
          }}
        >
          {title ? (
            <Text variant="overline" tone="muted">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  )
}

/** A card that wraps a vertical list of ListRows with hairline dividers. */
export function ListCard({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <View
      style={{
        backgroundColor: t.colors.card,
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
        ...t.elevation('sm'),
      }}
    >
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: t.colors.border, marginLeft: t.spacing[4] }} /> : null}
          {child}
        </View>
      ))}
    </View>
  )
}

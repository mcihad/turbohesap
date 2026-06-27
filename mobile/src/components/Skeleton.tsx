// Skeleton — a pulsing placeholder block for loading states. `SkeletonRows`
// renders a few list-row-shaped skeletons inside a card.

import * as React from 'react'
import { Animated, View } from 'react-native'

import { useTheme } from '../theme/theme-context'

export function Skeleton({
  width = '100%',
  height = 16,
  radius,
}: {
  width?: number | `${number}%` | 'auto'
  height?: number
  radius?: number
}) {
  const t = useTheme()
  const opacity = React.useRef(new Animated.Value(0.5)).current

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius ?? t.radius.sm,
        backgroundColor: t.colors.muted,
        opacity,
      }}
    />
  )
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  const t = useTheme()
  return (
    <View
      style={{
        backgroundColor: t.colors.card,
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing[3],
            padding: t.spacing[4],
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.colors.border,
          }}
        >
          <Skeleton width={40} height={40} radius={t.radius.lg} />
          <View style={{ flex: 1, gap: t.spacing[2] }}>
            <Skeleton width="60%" height={13} />
            <Skeleton width="40%" height={11} />
          </View>
        </View>
      ))}
    </View>
  )
}

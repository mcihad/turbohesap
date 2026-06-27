// EmptyState — centred icon + message for empty lists, errors and the
// "no permission" page guard. Optional action button.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'muted',
}: {
  icon?: IconName
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'muted' | 'destructive'
}) {
  const t = useTheme()
  const chipFg = tone === 'destructive' ? t.colors.destructive : t.colors.mutedForeground
  const chipBg = tone === 'destructive' ? t.colors.muted : t.colors.muted
  return (
    <View style={{ alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[12] }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius.full,
          backgroundColor: chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={28} color={chipFg} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text variant="label" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="outline" size="sm" onPress={onAction} />
      ) : null}
    </View>
  )
}

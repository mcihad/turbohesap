// RecentCard — "Son eklenenler" for the mobile dashboards: a titled card of
// recent rows (icon, title, subtitle, relative time). Optional onPress per row.

import * as React from 'react'
import { View } from 'react-native'

import { formatRelative } from '../lib/datetime'
import { useTheme } from '../theme/theme-context'
import { type IconName } from './Icon'
import { ListRow } from './ListRow'
import { ListCard, Section } from './Section'
import { Text } from './Text'

export interface RecentItem {
  id: string
  title: string
  subtitle?: string
  at?: string
  onPress?: () => void
}

export function RecentCard({
  title = 'Son eklenenler',
  icon = 'clock',
  items,
  emptyText = 'Henüz kayıt yok',
}: {
  title?: string
  icon?: IconName
  items: RecentItem[]
  emptyText?: string
}) {
  const t = useTheme()
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <View
          style={{
            borderRadius: t.radius.xl,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.card,
            padding: t.spacing[4],
          }}
        >
          <Text variant="caption" tone="muted">
            {emptyText}
          </Text>
        </View>
      ) : (
        <ListCard>
          {items.map((it) => (
            <ListRow
              key={it.id}
              icon={icon}
              title={it.title}
              subtitle={it.subtitle}
              trailing={
                it.at ? (
                  <Text variant="caption" tone="muted">
                    {formatRelative(it.at)}
                  </Text>
                ) : undefined
              }
              chevron={!!it.onPress}
              onPress={it.onPress}
            />
          ))}
        </ListCard>
      )}
    </Section>
  )
}

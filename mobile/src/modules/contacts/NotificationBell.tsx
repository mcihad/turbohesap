// NotificationBell — a reusable header action that opens the notifications inbox
// and surfaces the unread count as a small badge over a bell icon. Poll-based:
// the count loads on mount via useAsync. Drop into any screen header's `right`
// slot, or let the orchestrator mount it app-wide.

import * as React from 'react'
import { View } from 'react-native'

import { HeaderAction, Text } from '../../components'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function NotificationBell() {
  const t = useTheme()
  const nav = useNav()
  const { data } = useAsync(() => api.contacts.notifications.unreadCount(), [])
  const count = data?.count ?? 0

  return (
    <View>
      <HeaderAction
        icon="bell"
        onPress={() => nav.navigate('contacts.notifications', {}, 'Bildirimler')}
      />
      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: t.colors.destructive,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: t.colors.background,
          }}
        >
          <Text variant="caption" weight="bold" style={{ color: t.colors.destructiveForeground, fontSize: 9, lineHeight: 12 }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

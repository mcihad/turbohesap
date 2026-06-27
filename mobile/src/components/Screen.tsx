// Screen — the page shell every screen renders into. Owns the themed background,
// safe-area insets, an optional pinned Header, and a scroll body with the
// standard page gutter + pull-to-refresh. The RN counterpart of the web
// PageWrapper (DESIGN.md §11.1).

import * as React from 'react'
import { RefreshControl, ScrollView, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '../theme/theme-context'
import { Header } from './Header'

interface ScreenProps {
  children: React.ReactNode
  header?: React.ComponentProps<typeof Header>
  /** Apply the standard horizontal page gutter to the body (default true). */
  padded?: boolean
  /** Scrollable body (default true). Set false for full-bleed/fixed layouts. */
  scroll?: boolean
  onRefresh?: () => void
  refreshing?: boolean
  /** Sticky bottom slot (e.g. a primary action bar). */
  footer?: React.ReactNode
  contentStyle?: ViewStyle
}

export function Screen({
  children,
  header,
  padded = true,
  scroll = true,
  onRefresh,
  refreshing = false,
  footer,
  contentStyle,
}: ScreenProps) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  const bodyPadding: ViewStyle = {
    paddingHorizontal: padded ? t.spacing[4] : 0,
    paddingTop: padded ? t.spacing[4] : 0,
    paddingBottom: t.spacing[8],
    gap: padded ? t.spacing[4] : 0,
  }

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[bodyPadding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, bodyPadding, contentStyle]}>{children}</View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      {header ? <Header {...header} /> : null}
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: t.spacing[4],
            paddingTop: t.spacing[3],
            paddingBottom: insets.bottom + t.spacing[3],
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.background,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}

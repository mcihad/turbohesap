// LoadMoreFooter — the bottom-of-list status for an infinite-scroll list: a
// spinner while the next page loads, or a quiet "all shown" line once exhausted.

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Text } from './Text'

export function LoadMoreFooter({
  loadingMore,
  hasMore,
  total,
}: {
  loadingMore: boolean
  hasMore: boolean
  total: number
}) {
  const t = useTheme()

  if (loadingMore) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing[2], paddingVertical: t.spacing[4] }}>
        <ActivityIndicator color={t.colors.primary} />
        <Text variant="caption" tone="muted">
          Yükleniyor…
        </Text>
      </View>
    )
  }

  if (!hasMore && total > 0) {
    return (
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingVertical: t.spacing[3] }}>
        Tümü gösterildi · {total} kayıt
      </Text>
    )
  }

  return null
}

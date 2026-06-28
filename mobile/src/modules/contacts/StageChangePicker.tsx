// Bottom sheet listing a pipeline's stages (colored dot + name + probability).
// Tapping a stage calls onPick(stageId). Used by the Kanban board to move a deal
// without native drag & drop. Same slide-up Modal pattern as the other sheets.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { PipelineStageDto } from '@turbohesap/shared'

import { Icon, Text } from '../../components'
import { useTheme } from '../../theme/theme-context'

export function StageChangePicker({
  visible,
  stages,
  currentStageId,
  onClose,
  onPick,
}: {
  visible: boolean
  stages: PipelineStageDto[]
  currentStageId: string | null
  onClose: () => void
  onPick: (stageId: string) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  const sorted = React.useMemo(() => [...stages].sort((a, b) => a.sortOrder - b.sortOrder), [stages])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[3],
            paddingBottom: insets.bottom + t.spacing[4],
            maxHeight: '70%',
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[2],
            }}
          >
            <Text variant="title" weight="semibold">
              Aşama seç
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView>
            {sorted.map((stage) => {
              const active = stage.id === currentStageId
              return (
                <Pressable
                  key={stage.id}
                  onPress={() => onPick(stage.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[3],
                    paddingHorizontal: t.spacing[5],
                    paddingVertical: t.spacing[3.5],
                  }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: stage.color }} />
                  <Text variant="body" weight={active ? 'semibold' : 'normal'} style={{ flex: 1 }}>
                    {stage.name}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                    %{stage.probability}
                  </Text>
                  {active ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                </Pressable>
              )
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Satış hattı ayarları (Pipeline settings) — pipeline'ları listele/oluştur/sil,
// seçili pipeline'ın aşamalarını ekle/sil ve yukarı/aşağı taşı (reorderStages).
// Bir aşamaya dokununca tam düzenleme için PipelineStageFormScreen açılır.
// pipelinesWrite ile korunur. Web'deki pipeline-settings-page'in mobil eşleniği.

import * as React from 'react'
import { Pressable, View } from 'react-native'
import { ContactsPermissions, type StageType } from '@turbohesap/shared'

import {
  Badge,
  Button,
  EmptyState,
  Icon,
  type IconName,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const STAGE_TYPE_LABEL: Record<StageType, string> = {
  open: 'Açık',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
}

const STAGE_TYPE_TONE: Record<StageType, 'info' | 'success' | 'destructive'> = {
  open: 'info',
  won: 'success',
  lost: 'destructive',
}

export function PipelineSettingsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ContactsPermissions.pipelinesWrite)
  const { submit, busy } = useSubmit()

  const pipelinesQ = useAsync(() => api.contacts.pipelines.list(), [])
  const pipelines = pipelinesQ.data ?? []

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = pipelines.find((p) => p.id === selectedId) ?? pipelines[0] ?? null

  const [newPipelineName, setNewPipelineName] = React.useState('')
  const [newStageName, setNewStageName] = React.useState('')

  const refetch = pipelinesQ.refetch

  const createPipeline = () => {
    const name = newPipelineName.trim()
    if (!name) return
    submit(
      async () => {
        const created = await api.contacts.pipelines.create({ name })
        setNewPipelineName('')
        setSelectedId(created.id)
      },
      { onSuccess: refetch },
    )
  }

  const removePipeline = (id: string, name: string) => {
    confirmDestructive('Pipeline sil', `"${name}" pipeline silinsin mi?`, () => {
      submit(() => api.contacts.pipelines.remove(id).then(() => undefined), {
        onSuccess: () => {
          setSelectedId(null)
          refetch()
        },
      })
    })
  }

  const addStage = () => {
    if (!selected) return
    const name = newStageName.trim()
    if (!name) return
    submit(
      async () => {
        await api.contacts.pipelines.addStage(selected.id, { name })
        setNewStageName('')
      },
      { onSuccess: refetch },
    )
  }

  const removeStage = (stageId: string, name: string) => {
    if (!selected) return
    confirmDestructive('Aşama sil', `"${name}" aşaması silinsin mi?`, () => {
      submit(
        () => api.contacts.pipelines.removeStage(selected.id, stageId).then(() => undefined),
        { onSuccess: refetch },
      )
    })
  }

  const move = (index: number, dir: -1 | 1) => {
    if (!selected) return
    const ids = [...selected.stages].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    submit(
      () => api.contacts.pipelines.reorderStages(selected.id, { stageIds: ids }).then(() => undefined),
      { onSuccess: refetch },
    )
  }

  const orderedStages = selected
    ? [...selected.stages].sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  return (
    <PermissionRequired
      permission={ContactsPermissions.pipelinesWrite}
      title="Satış hattı ayarları"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Satış hattı ayarları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={refetch}
        refreshing={pipelinesQ.refreshing}
      >
        {pipelinesQ.loading ? (
          <SkeletonRows count={5} />
        ) : pipelinesQ.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={pipelinesQ.error}
            actionLabel="Tekrar dene"
            onAction={refetch}
          />
        ) : (
          <>
            <Section title="Pipeline'lar">
              {pipelines.length === 0 ? (
                <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                  Henüz pipeline yok.
                </Text>
              ) : (
                <ListCard>
                  {pipelines.map((p) => (
                    <ListRow
                      key={p.id}
                      icon="columns"
                      title={p.name}
                      subtitle={`${p.stages.length} aşama · ${p.openOpportunityCount} açık fırsat`}
                      trailing={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                          {p.isDefault ? <Badge label="Varsayılan" tone="muted" /> : null}
                          {selected?.id === p.id ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                        </View>
                      }
                      chevron={false}
                      onPress={() => setSelectedId(p.id)}
                    />
                  ))}
                </ListCard>
              )}
              {canWrite ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Yeni pipeline"
                      placeholder="Pipeline adı"
                      value={newPipelineName}
                      onChangeText={setNewPipelineName}
                    />
                  </View>
                  <Button
                    title="Ekle"
                    icon="plus"
                    onPress={createPipeline}
                    loading={busy}
                    disabled={!newPipelineName.trim()}
                  />
                </View>
              ) : null}
            </Section>

            {selected ? (
              <Section
                title={`${selected.name} aşamaları`}
                action={
                  canWrite && !selected.isDefault ? (
                    <Button
                      title="Pipeline sil"
                      variant="ghost"
                      size="sm"
                      icon="trash-2"
                      onPress={() => removePipeline(selected.id, selected.name)}
                    />
                  ) : undefined
                }
              >
                {orderedStages.length === 0 ? (
                  <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                    Bu pipeline'da aşama yok.
                  </Text>
                ) : (
                  <ListCard>
                    {orderedStages.map((stage, i) => (
                      <ListRow
                        key={stage.id}
                        leading={
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: stage.color }} />
                        }
                        title={stage.name}
                        subtitle={`${STAGE_TYPE_LABEL[stage.type]} · %${stage.probability}`}
                        trailing={
                          canWrite ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[0.5] }}>
                              <IconButton
                                icon="arrow-up"
                                disabled={i === 0 || busy}
                                onPress={() => move(i, -1)}
                              />
                              <IconButton
                                icon="arrow-down"
                                disabled={i === orderedStages.length - 1 || busy}
                                onPress={() => move(i, 1)}
                              />
                              <IconButton
                                icon="trash-2"
                                tone={t.colors.destructive}
                                onPress={() => removeStage(stage.id, stage.name)}
                              />
                            </View>
                          ) : (
                            <Badge label={STAGE_TYPE_LABEL[stage.type]} tone={STAGE_TYPE_TONE[stage.type]} />
                          )
                        }
                        onPress={
                          canWrite
                            ? () =>
                                nav.navigate(
                                  'contacts.pipelines.stage.form',
                                  { pipelineId: selected.id, stageId: stage.id },
                                  stage.name,
                                )
                            : undefined
                        }
                      />
                    ))}
                  </ListCard>
                )}
                {canWrite ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Yeni aşama"
                        placeholder="Aşama adı"
                        value={newStageName}
                        onChangeText={setNewStageName}
                      />
                    </View>
                    <Button
                      title="Ekle"
                      icon="plus"
                      onPress={addStage}
                      loading={busy}
                      disabled={!newStageName.trim()}
                    />
                  </View>
                ) : null}
              </Section>
            ) : null}
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}

/** Compact icon-only tap target for inline row actions. */
function IconButton({
  icon,
  onPress,
  disabled,
  tone,
}: {
  icon: IconName
  onPress: () => void
  disabled?: boolean
  tone?: string
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
        backgroundColor: pressed ? t.colors.muted : 'transparent',
      })}
    >
      <Icon name={icon} size={18} color={tone ?? t.colors.mutedForeground} />
    </Pressable>
  )
}

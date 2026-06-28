// AI insights for an opportunity — Claude-powered conversion scoring and an
// activity summary. Two actions ("AI Skorla" / "Özetle") call the integrations
// AI endpoints and render the result inline. A missing/unconfigured AI provider
// surfaces gracefully via an Alert. Mirrors the web AI insights panel.

import * as React from 'react'
import { Alert, View } from 'react-native'

import { toApiError, type AiScoreResult } from '@turbohesap/shared'

import { Badge, Button, Card, Icon, Text, withAlpha } from '../../components'
import { api } from '../../lib/api'
import { useTheme } from '../../theme/theme-context'

export function AiInsightsCard({ opportunityId }: { opportunityId: string }) {
  const t = useTheme()

  const [score, setScore] = React.useState<AiScoreResult | null>(null)
  const [summary, setSummary] = React.useState<string | null>(null)
  const [scoring, setScoring] = React.useState(false)
  const [summarizing, setSummarizing] = React.useState(false)

  const runScore = async () => {
    if (scoring) return
    setScoring(true)
    try {
      setScore(await api.contacts.integrations.aiScore({ opportunityId }))
    } catch (e) {
      Alert.alert('Skorlama başarısız', toApiError(e).message)
    } finally {
      setScoring(false)
    }
  }

  const runSummary = async () => {
    if (summarizing) return
    setSummarizing(true)
    try {
      const res = await api.contacts.integrations.aiSummarize({ opportunityId })
      setSummary(res.text)
    } catch (e) {
      Alert.alert('Özet başarısız', toApiError(e).message)
    } finally {
      setSummarizing(false)
    }
  }

  const scoreColor = score
    ? score.score >= 66
      ? t.colors.success
      : score.score >= 33
        ? t.colors.warning
        : t.colors.destructive
    : t.colors.mutedForeground

  return (
    <Card>
      <View style={{ gap: t.spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <Icon name="cpu" size={18} color={t.colors.primary} />
          <Text variant="title" weight="semibold" style={{ flex: 1 }}>
            AI Asistan
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
          <Button title="AI Skorla" icon="zap" loading={scoring} onPress={runScore} style={{ flex: 1 }} />
          <Button
            title="Özetle"
            icon="file-text"
            variant="outline"
            loading={summarizing}
            onPress={runSummary}
            style={{ flex: 1 }}
          />
        </View>

        {score ? (
          <View style={{ gap: t.spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
              <View
                style={{
                  paddingHorizontal: t.spacing[3],
                  paddingVertical: t.spacing[1.5],
                  borderRadius: t.radius.full,
                  backgroundColor: withAlpha(scoreColor, 0.15),
                }}
              >
                <Text weight="bold" style={{ color: scoreColor, fontFamily: 'monospace' }}>
                  {score.score}/100
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                Dönüşüm olasılığı
              </Text>
            </View>
            <Field label="Gerekçe" value={score.rationale} />
            <Field label="Sonraki adım" value={score.nextAction} />
          </View>
        ) : null}

        {summary ? (
          <View style={{ gap: t.spacing[1.5] }}>
            <Badge label="Özet" tone="primary" />
            <Text variant="body">{summary}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const t = useTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  )
}

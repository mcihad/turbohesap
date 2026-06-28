// AI içgörüleri — bir fırsat için Claude ile kazanma skoru (skor + gerekçe +
// sonraki adım) ve etkinlik özeti üretir. AI yapılandırılmamışsa (backend 400)
// nazikçe bilgilendirir.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Sparkles, Target } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type AiScoreResult } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function scoreTone(score: number): { stroke: string; text: string } {
  if (score >= 70) return { stroke: 'stroke-success', text: 'text-success' }
  if (score >= 40) return { stroke: 'stroke-warning', text: 'text-warning' }
  return { stroke: 'stroke-destructive', text: 'text-destructive' }
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const tone = scoreTone(clamped)
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" className="stroke-border" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          className={tone.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${clamped} ${100 - clamped}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn('text-2xl font-semibold tabular-nums', tone.text)}>{clamped}</span>
      </div>
    </div>
  )
}

export function AiInsights({ opportunityId }: { opportunityId: string }) {
  const [score, setScore] = React.useState<AiScoreResult | null>(null)
  const [summary, setSummary] = React.useState<string | null>(null)

  const scoreMutation = useMutation({
    mutationFn: () => api.contacts.integrations.aiScore({ opportunityId }),
    onSuccess: (res) => setScore(res),
    onError: (e) => {
      const err = toApiError(e)
      toast.error(err.statusCode === 400 ? 'AI yapılandırılmamış' : 'Skorlanamadı', {
        description: err.message,
      })
    },
  })

  const summarizeMutation = useMutation({
    mutationFn: () => api.contacts.integrations.aiSummarize({ opportunityId }),
    onSuccess: (res) => setSummary(res.text),
    onError: (e) => {
      const err = toApiError(e)
      toast.error(err.statusCode === 400 ? 'AI yapılandırılmamış' : 'Özetlenemedi', {
        description: err.message,
      })
    },
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          AI içgörüleri
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scoreMutation.mutate()}
            disabled={scoreMutation.isPending}
          >
            {scoreMutation.isPending ? <Loader2 className="animate-spin" /> : <Target />}
            AI ile Skorla
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => summarizeMutation.mutate()}
            disabled={summarizeMutation.isPending}
          >
            {summarizeMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Özetle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!score && !summary && !scoreMutation.isPending && !summarizeMutation.isPending ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Bu fırsat için skor veya özet üretmek üzere yukarıdaki butonları kullanın.
          </p>
        ) : null}

        {score ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ScoreRing score={score.score} />
            <div className="space-y-2">
              <div>
                <div className="text-2xs tracking-wide text-muted-foreground uppercase">Gerekçe</div>
                <p className="text-sm leading-snug">{score.rationale}</p>
              </div>
              <div>
                <div className="text-2xs tracking-wide text-muted-foreground uppercase">
                  Sonraki adım
                </div>
                <p className="text-sm leading-snug">{score.nextAction}</p>
              </div>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-1">
            <div className="text-2xs tracking-wide text-muted-foreground uppercase">Özet</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

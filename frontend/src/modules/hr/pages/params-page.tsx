import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  computePayslip,
  DEFAULT_PAYROLL_PARAMS_2026,
  HrPermissions,
  toApiError,
  type PayrollParams,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '../format'

const now = new Date()
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i)

export function ParamsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canParams = hasPermission(HrPermissions.params)

  const [year, setYear] = React.useState(now.getFullYear())
  const [draft, setDraft] = React.useState<PayrollParams>(DEFAULT_PAYROLL_PARAMS_2026)
  const [sample, setSample] = React.useState('')

  const paramsQuery = useQuery({
    queryKey: ['hr', 'params', year],
    queryFn: async () => {
      try {
        return await api.hr.params.get(year)
      } catch {
        return { year, params: DEFAULT_PAYROLL_PARAMS_2026 } as { year: number; params: PayrollParams }
      }
    },
  })

  // Reseed the form whenever a different year's params load.
  React.useEffect(() => {
    if (paramsQuery.data) setDraft(paramsQuery.data.params)
  }, [paramsQuery.data])

  React.useEffect(() => {
    if (!sample) setSample(String(draft.asgariUcretBrut))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.asgariUcretBrut])

  const setField = <K extends keyof PayrollParams>(key: K, value: PayrollParams[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const save = useMutation({
    mutationFn: () => api.hr.params.upsert({ year, params: draft }),
    onSuccess: () => {
      toast.success('Parametreler kaydedildi')
      void qc.invalidateQueries({ queryKey: ['hr', 'params'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  // Live preview using the edited (unsaved) params.
  const preview = React.useMemo(
    () =>
      computePayslip({
        amount: Number(sample) || 0,
        salaryType: 'gross',
        days: 30,
        params: draft,
      }),
    [sample, draft],
  )

  return (
    <PermissionRequired permission={HrPermissions.params}>
      <PageWrapper>
        <PageHeader
          title="Bordro Parametreleri"
          description="Oran, dilim ve asgari ücret değerleri — yıla göre"
          actions={
            <div className="flex items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canParams ? (
                <Button disabled={save.isPending} onClick={() => save.mutate()}>
                  <Save />
                  Kaydet
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Asgari ücret ve SGK tabanları</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyField label="Aylık Brüt Asgari Ücret" value={draft.asgariUcretBrut} onChange={(v) => setField('asgariUcretBrut', v)} />
                <MoneyField label="SGK Taban" value={draft.sgkTaban} onChange={(v) => setField('sgkTaban', v)} />
                <MoneyField label="SGK Tavan" value={draft.sgkTavan} onChange={(v) => setField('sgkTavan', v)} />
                <MoneyField label="Asgari Ücret GV İstisnası (aylık)" value={draft.asgariUcretGvIstisna} onChange={(v) => setField('asgariUcretGvIstisna', v)} />
                <MoneyField label="Asgari Ücret Damga İstisnası (aylık)" value={draft.asgariUcretDamgaIstisna} onChange={(v) => setField('asgariUcretDamgaIstisna', v)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Oranlar</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PercentField label="SGK İşçi Oranı" value={draft.sgkIsciOran} onChange={(v) => setField('sgkIsciOran', v)} />
                <PercentField label="İşsizlik İşçi Oranı" value={draft.issizlikIsciOran} onChange={(v) => setField('issizlikIsciOran', v)} />
                <PercentField label="SGK İşveren Oranı" value={draft.sgkIsverenOran} onChange={(v) => setField('sgkIsverenOran', v)} />
                <PercentField label="İşsizlik İşveren Oranı" value={draft.issizlikIsverenOran} onChange={(v) => setField('issizlikIsverenOran', v)} />
                <PercentField label="Damga Vergisi Oranı" value={draft.damgaOran} onChange={(v) => setField('damgaOran', v)} step={0.001} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">Gelir Vergisi Dilimleri</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setField('gelirVergisiDilimleri', [
                      ...draft.gelirVergisiDilimleri,
                      { ust: 0, oran: 0 },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Dilim ekle
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_40px] items-center gap-2 text-2xs uppercase tracking-wide text-muted-foreground">
                  <span>Üst Sınır (yıllık kümülatif matrah)</span>
                  <span>Oran %</span>
                  <span />
                </div>
                {draft.gelirVergisiDilimleri.map((dilim, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_40px] items-center gap-2">
                    <Input
                      type="number"
                      value={dilim.ust}
                      className="text-right tabular-nums"
                      onChange={(e) => {
                        const ust = Number(e.target.value) || 0
                        setField(
                          'gelirVergisiDilimleri',
                          draft.gelirVergisiDilimleri.map((d, idx) => (idx === i ? { ...d, ust } : d)),
                        )
                      }}
                    />
                    <Input
                      type="number"
                      step={0.1}
                      value={Math.round(dilim.oran * 10000) / 100}
                      className="text-right tabular-nums"
                      onChange={(e) => {
                        const oran = (Number(e.target.value) || 0) / 100
                        setField(
                          'gelirVergisiDilimleri',
                          draft.gelirVergisiDilimleri.map((d, idx) => (idx === i ? { ...d, oran } : d)),
                        )
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Sil"
                      onClick={() =>
                        setField(
                          'gelirVergisiDilimleri',
                          draft.gelirVergisiDilimleri.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Live bordro önizleme */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Canlı Bordro Önizleme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Örnek Brüt Ücret (aylık)</Label>
                <Input
                  type="number"
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  className="text-right tabular-nums"
                />
              </div>
              <div className="space-y-1.5 border-t pt-2">
                <PrevRow label="Brüt" value={formatMoney(preview.brut)} />
                <PrevRow label="SGK İşçi" value={`− ${formatMoney(preview.sgkIsci)}`} muted />
                <PrevRow label="İşsizlik İşçi" value={`− ${formatMoney(preview.issizlikIsci)}`} muted />
                <PrevRow label="Gelir Vergisi" value={`− ${formatMoney(preview.gelirVergisi)}`} muted />
                {preview.gvIstisna > 0 ? <PrevRow label="GV İstisnası" value={`+ ${formatMoney(preview.gvIstisna)}`} muted /> : null}
                <PrevRow label="Damga Vergisi" value={`− ${formatMoney(preview.damga)}`} muted />
                {preview.damgaIstisna > 0 ? <PrevRow label="Damga İstisnası" value={`+ ${formatMoney(preview.damgaIstisna)}`} muted /> : null}
                <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                  <span>Net</span>
                  <span className="tabular-nums text-primary">{formatMoney(preview.net)}</span>
                </div>
                <PrevRow label="İşveren Maliyeti" value={formatMoney(preview.isverenMaliyet)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        className="text-right tabular-nums"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}

function PercentField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label} (%)</Label>
      <Input
        type="number"
        step={step}
        value={Math.round(value * 100000) / 1000}
        className="text-right tabular-nums"
        onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
      />
    </div>
  )
}

function PrevRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

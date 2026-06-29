import * as React from 'react'
import { View } from 'react-native'
import { HrPermissions } from '@turbohesap/shared'
import {
  Badge,
  Card,
  EmptyState,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, MONTH_LABELS } from './format'

export function PayslipDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)

  const id = String(nav.current.params?.id ?? '')
  const payslip = useAsync(() => api.hr.payroll.getPayslip(id), [id], { enabled: canRead && !!id })
  const p = payslip.data

  if (!canRead) {
    return (
      <Screen header={{ title: 'Maaş Pusulası', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  // İncome tax / stamp duty net of the minimum-wage exemptions.
  const gelirVergisiNet = p ? Math.max(0, p.gelirVergisi - p.gvIstisna) : 0
  const damgaNet = p ? Math.max(0, p.damga - p.damgaIstisna) : 0

  return (
    <Screen
      header={{
        title: 'Maaş Pusulası',
        subtitle: p ? `${p.employeeName} · ${MONTH_LABELS[p.month - 1]} ${p.year}` : undefined,
        onBack: nav.goBack,
      }}
      onRefresh={payslip.refetch}
      refreshing={payslip.refreshing}
    >
      {payslip.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : payslip.error || !p ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={payslip.error ?? 'Pusula bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={payslip.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Net Ödenecek
                </Text>
                <Badge label={p.paidAt ? 'Ödendi' : 'Bekliyor'} tone={p.paidAt ? 'success' : 'warning'} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(p.net)}
              </Text>
              <Text variant="caption" tone="muted">
                {p.employeeName} · {MONTH_LABELS[p.month - 1]} {p.year} · {p.days} gün
                {p.paidAt ? ` · Ödendi ${formatDate(p.paidAt)}` : ''}
              </Text>
            </View>
          </Card>

          <Section title="Kazançlar">
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <Row label="Brüt Ücret" value={formatMoney(p.brut)} />
                <Row label="SGK Matrahı" value={formatMoney(p.sgkMatrah)} muted />
                <Row label="Gelir Vergisi Matrahı" value={formatMoney(p.gvMatrah)} muted />
              </View>
            </Card>
          </Section>

          <Section title="Kesintiler">
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <Row label="SGK İşçi Payı" value={`- ${formatMoney(p.sgkIsci)}`} />
                <Row label="İşsizlik İşçi Payı" value={`- ${formatMoney(p.issizlikIsci)}`} />
                <Row label="Gelir Vergisi" value={`- ${formatMoney(p.gelirVergisi)}`} />
                {p.gvIstisna > 0 ? <Row label="Asgari Ücret GV İstisnası" value={`+ ${formatMoney(p.gvIstisna)}`} muted /> : null}
                <Row label="Damga Vergisi" value={`- ${formatMoney(p.damga)}`} />
                {p.damgaIstisna > 0 ? <Row label="Asgari Ücret Damga İstisnası" value={`+ ${formatMoney(p.damgaIstisna)}`} muted /> : null}
                <Divider />
                <Row label="Net Gelir Vergisi" value={`- ${formatMoney(gelirVergisiNet)}`} muted />
                <Row label="Net Damga Vergisi" value={`- ${formatMoney(damgaNet)}`} muted />
                <Divider />
                <Row label="Net Ödenecek" value={formatMoney(p.net)} bold />
              </View>
            </Card>
          </Section>

          <Section title="İşveren Maliyeti">
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <Row label="Brüt Ücret" value={formatMoney(p.brut)} />
                <Row label="SGK İşveren Payı" value={`+ ${formatMoney(p.sgkIsveren)}`} />
                <Row label="İşsizlik İşveren Payı" value={`+ ${formatMoney(p.issizlikIsveren)}`} />
                <Divider />
                <Row label="Toplam İşveren Maliyeti" value={formatMoney(p.isverenMaliyet)} bold />
              </View>
            </Card>
          </Section>
        </>
      )}
    </Screen>
  )
}

function Divider() {
  const t = useTheme()
  return <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant={bold ? 'title' : 'label'} tone={bold ? 'default' : muted ? 'muted' : 'default'} weight={bold ? 'bold' : 'medium'}>
        {label}
      </Text>
      <Text
        variant={bold ? 'title' : 'label'}
        tone={muted && !bold ? 'muted' : 'default'}
        weight={bold ? 'bold' : 'medium'}
        style={{ fontFamily: 'monospace' }}
      >
        {value}
      </Text>
    </View>
  )
}

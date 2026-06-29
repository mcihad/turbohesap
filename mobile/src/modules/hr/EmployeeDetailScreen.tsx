import * as React from 'react'
import { View } from 'react-native'
import {
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
  SALARY_TYPE_LABELS,
  SGK_STATUS_LABELS,
  type PayslipDto,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, MONTH_LABELS } from './format'

export function EmployeeDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)

  const id = String(nav.current.params?.id ?? '')
  const employee = useAsync(() => api.hr.employees.get(id), [id], { enabled: canRead && !!id })
  const balance = useAsync(() => api.hr.employees.leaveBalance(id), [id], { enabled: canRead && !!id })
  // No "payslips by employee" endpoint — gather from the most recent runs.
  const payslips = useAsync<PayslipDto[]>(
    async () => {
      const runs = await api.hr.payroll.listRuns()
      const recent = runs.slice(0, 6)
      const groups = await Promise.all(recent.map((r) => api.hr.payroll.payslips(r.id).catch(() => [])))
      return groups
        .flat()
        .filter((p) => p.employeeId === id)
        .sort((a, b) => b.year - a.year || b.month - a.month)
        .slice(0, 6)
    },
    [id],
    { enabled: canRead && !!id },
  )
  const { submit, busy } = useSubmit()

  const emp = employee.data

  const handleDelete = () => {
    confirmDestructive('Personeli sil', 'Bu personel kaydı silinecek. Devam edilsin mi?', () =>
      submit(async () => {
        await api.hr.employees.remove(id)
        nav.goBack()
      }),
    )
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Personel', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: emp?.fullName ?? 'Personel',
        subtitle: emp ? [emp.departmentKey, emp.positionKey].filter(Boolean).join(' · ') || undefined : undefined,
        onBack: nav.goBack,
        right:
          emp && canWrite ? (
            <HeaderAction icon="edit-2" onPress={() => nav.navigate('hr.employee.entry', { id }, 'Personel düzenle')} />
          ) : undefined,
      }}
      onRefresh={() => {
        employee.refetch()
        balance.refetch()
        payslips.refetch()
      }}
      refreshing={employee.refreshing}
      footer={
        emp && canWrite ? (
          <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={handleDelete} />
        ) : undefined
      }
    >
      {employee.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : employee.error || !emp ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={employee.error ?? 'Personel bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={employee.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  {SALARY_TYPE_LABELS[emp.salaryType]} Maaş
                </Text>
                <Badge label={emp.isActive ? 'Aktif' : 'Pasif'} tone={emp.isActive ? 'success' : 'muted'} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(emp.salaryAmount)}
              </Text>
              <Text variant="caption" tone="muted">
                {EMPLOYMENT_TYPE_LABELS[emp.employmentType]} · İşe giriş {formatDate(emp.hireDate)}
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Ad Soyad" value={emp.fullName} full />
                {emp.tcKimlikNo ? <Field label="TC Kimlik No" value={emp.tcKimlikNo} mono /> : null}
                <Field label="İşe Giriş" value={formatDate(emp.hireDate)} />
                {emp.terminationDate ? <Field label="İşten Çıkış" value={formatDate(emp.terminationDate)} /> : null}
                {emp.departmentKey ? <Field label="Departman" value={emp.departmentKey} /> : null}
                {emp.positionKey ? <Field label="Pozisyon" value={emp.positionKey} /> : null}
                <Field label="Çalışma Türü" value={EMPLOYMENT_TYPE_LABELS[emp.employmentType]} />
                <Field label="SGK Durumu" value={SGK_STATUS_LABELS[emp.sgkStatus]} />
                {emp.sgkSicilNo ? <Field label="SGK Sicil" value={emp.sgkSicilNo} mono /> : null}
                <Field label="Yıllık İzin" value={`${emp.annualLeaveDays} gün`} />
                {emp.phone ? <Field label="Telefon" value={emp.phone} /> : null}
                {emp.email ? <Field label="E-posta" value={emp.email} /> : null}
                {emp.iban ? <Field label="IBAN" value={emp.iban} mono full /> : null}
                {emp.bankName ? <Field label="Banka" value={emp.bankName} /> : null}
                {emp.address ? <Field label="Adres" value={emp.address} full /> : null}
                {emp.notes ? <Field label="Notlar" value={emp.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title="İzin Bakiyesi">
            {balance.loading ? (
              <Card>
                <Skeleton width="50%" height={20} />
              </Card>
            ) : balance.data ? (
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <BalanceCell label="Hak Edilen" value={`${balance.data.entitlement}`} />
                  <BalanceCell label="Kullanılan" value={`${balance.data.used}`} />
                  <BalanceCell label="Bekleyen" value={`${balance.data.pending}`} />
                  <BalanceCell label="Kalan" value={`${balance.data.remaining}`} highlight />
                </View>
              </Card>
            ) : (
              <Card>
                <Text variant="caption" tone="muted">
                  İzin bakiyesi yüklenemedi.
                </Text>
              </Card>
            )}
          </Section>

          <Section title="Son Maaş Pusulaları">
            {payslips.loading ? (
              <Card>
                <Skeleton width="60%" height={18} />
              </Card>
            ) : payslips.data && payslips.data.length > 0 ? (
              <ListCard>
                {payslips.data.map((p) => (
                  <ListRow
                    key={p.id}
                    icon="file-text"
                    title={`${MONTH_LABELS[p.month - 1]} ${p.year}`}
                    subtitle={`Brüt ${formatMoney(p.brut)}`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatMoney(p.net)}</Text>
                        {p.paidAt ? <Badge label="Ödendi" tone="success" /> : null}
                      </View>
                    }
                    onPress={() => nav.navigate('hr.payslip', { id: p.id }, 'Maaş Pusulası')}
                  />
                ))}
              </ListCard>
            ) : (
              <EmptyState icon="file-text" title="Pusula yok" description="Bu personel için maaş pusulası bulunmuyor." />
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}

function BalanceCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text variant="h2" tone={highlight ? 'primary' : 'default'}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  )
}

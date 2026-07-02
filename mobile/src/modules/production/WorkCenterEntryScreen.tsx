// İş Merkezi ekle/düzenle — the create/edit form for a work center (station):
// name/code/branch + the cost & capacity fields used by the operation-cost rollup
// and planning. Mirrors OrderEntryScreen's Card + Section + footer-button shell.

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { OrgPermissions, ProductionPermissions, type CreateWorkCenterRequest } from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function WorkCenterEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ProductionPermissions.write)
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.production.workCenters.get(id as string), [id], { enabled: editing })
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: canReadBranches })

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [branchId, setBranchId] = React.useState('')
  const [costPerHour, setCostPerHour] = React.useState('0')
  const [setupCostPerHour, setSetupCostPerHour] = React.useState('')
  const [currency, setCurrency] = React.useState('TRY')
  const [capacityPerHour, setCapacityPerHour] = React.useState('')
  const [parallelCapacity, setParallelCapacity] = React.useState('1')
  const [efficiencyRate, setEfficiencyRate] = React.useState('1')
  const [setupTimeMinutes, setSetupTimeMinutes] = React.useState('0')
  const [cleanupTimeMinutes, setCleanupTimeMinutes] = React.useState('0')
  const [costAccountCode, setCostAccountCode] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setName(d.name)
    setCode(d.code)
    setBranchId(d.branchId ?? '')
    setCostPerHour(String(d.costPerHour))
    setSetupCostPerHour(d.setupCostPerHour != null ? String(d.setupCostPerHour) : '')
    setCurrency(d.currency)
    setCapacityPerHour(d.capacityPerHour != null ? String(d.capacityPerHour) : '')
    setParallelCapacity(String(d.parallelCapacity))
    setEfficiencyRate(String(d.efficiencyRate))
    setSetupTimeMinutes(String(d.setupTimeMinutes))
    setCleanupTimeMinutes(String(d.cleanupTimeMinutes))
    setCostAccountCode(d.costAccountCode ?? '')
    setIsActive(d.isActive)
    setNotes(d.notes ?? '')
  }, [existing.data])

  const branchOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Şube yok' },
      ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches.data],
  )

  const save = () => {
    if (!name.trim()) {
      alert('Ad gerekli')
      return
    }
    submit(
      async () => {
        const body: CreateWorkCenterRequest = {
          name: name.trim(),
          code: code.trim() || undefined,
          branchId: branchId || null,
          costPerHour: Number(costPerHour) || 0,
          setupCostPerHour: setupCostPerHour === '' ? null : Number(setupCostPerHour),
          currency: currency.trim() || 'TRY',
          capacityPerHour: capacityPerHour === '' ? null : Number(capacityPerHour),
          parallelCapacity: Number(parallelCapacity) || 1,
          efficiencyRate: Number(efficiencyRate) || 1,
          setupTimeMinutes: Number(setupTimeMinutes) || 0,
          cleanupTimeMinutes: Number(cleanupTimeMinutes) || 0,
          costAccountCode: costAccountCode.trim() || null,
          isActive,
          notes: notes.trim() || null,
        }
        if (editing) await api.production.workCenters.update(id as string, body)
        else await api.production.workCenters.create(body)
        nav.goBack()
      },
      { errorTitle: 'Kaydedilemedi' },
    )
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'İş merkezi düzenle' : 'Yeni iş merkezi', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'İş merkezi düzenle' : 'Yeni iş merkezi', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={save} />
        ) : undefined
      }
    >
      {loadingExisting ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[4] }}>
              <Input label="Ad" placeholder="örn. CNC Torna" value={name} onChangeText={setName} />
              <Input label="Kod (opsiyonel)" placeholder="Otomatik" value={code} onChangeText={setCode} />
              {canReadBranches ? (
                <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />
              ) : null}
            </View>
          </Card>

          <Section title="Maliyet & Kapasite">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Saat Ücreti" keyboardType="numeric" value={costPerHour} onChangeText={setCostPerHour} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Hazırlık Saat Ücreti"
                      keyboardType="numeric"
                      value={setupCostPerHour}
                      onChangeText={setSetupCostPerHour}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Kapasite (adet/saat)"
                      keyboardType="numeric"
                      value={capacityPerHour}
                      onChangeText={setCapacityPerHour}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Paralel Kapasite"
                      keyboardType="numeric"
                      value={parallelCapacity}
                      onChangeText={setParallelCapacity}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Verimlilik (0-1)"
                      keyboardType="numeric"
                      value={efficiencyRate}
                      onChangeText={setEfficiencyRate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Hazırlık (dk)"
                      keyboardType="numeric"
                      value={setupTimeMinutes}
                      onChangeText={setSetupTimeMinutes}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Temizlik (dk)"
                      keyboardType="numeric"
                      value={cleanupTimeMinutes}
                      onChangeText={setCleanupTimeMinutes}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Maliyet Hesap Kodu"
                      value={costAccountCode}
                      onChangeText={setCostAccountCode}
                    />
                  </View>
                </View>
              </View>
            </Card>
          </Section>

          <Card>
            <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
          </Card>

          <Section title="Notlar">
            <FormTextArea label="Notlar" placeholder="İş merkezi notları..." value={notes} onChangeText={setNotes} />
          </Section>
        </>
      )}
    </Screen>
  )
}

// Yeni fason sevk — bir üretim emri + fasoncu (cari) seç, sevk/iade tarihleri ve
// işçilik ücretini gir. Gönderilecek malzemeler üretim emrinin bileşenlerinden
// otomatik alınır (lines omitted → backend MO snapshot'ını kullanır). Mirrors
// OrderEntryScreen'in form kabuğu.

import * as React from 'react'
import { View } from 'react-native'
import {
  ProductionPermissions,
  type CreateSubcontractDispatchRequest,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Input,
  Screen,
  type SelectOption,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function SubcontractEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(ProductionPermissions.subcontractManage)
  const { submit, busy } = useSubmit()

  const orders = useAsync(() => api.production.orders.list(), [], { enabled: canManage })
  const contacts = useAsync(() => api.contacts.contacts.list(), [], { enabled: canManage })

  const [manufacturingOrderId, setManufacturingOrderId] = React.useState('')
  const [contactId, setContactId] = React.useState('')
  const [dispatchDate, setDispatchDate] = React.useState(() => new Date().toISOString())
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('')
  const [serviceCost, setServiceCost] = React.useState('0')
  const [notes, setNotes] = React.useState('')

  const orderOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Üretim emri seçin' },
      ...(orders.data ?? []).map((o) => ({ value: o.id, label: `${o.orderNo} · ${o.productName}` })),
    ],
    [orders.data],
  )
  const contactOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Fasoncu seçin' },
      ...(contacts.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [contacts.data],
  )

  if (!canManage) {
    return (
      <Screen header={{ title: 'Yeni fason sevk', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada işlem yapma yetkiniz yok." />
      </Screen>
    )
  }

  const save = () => {
    if (!manufacturingOrderId) {
      alert('Üretim emri seçilmelidir')
      return
    }
    if (!contactId) {
      alert('Fasoncu seçilmelidir')
      return
    }
    void submit(
      async () => {
        const body: CreateSubcontractDispatchRequest = {
          manufacturingOrderId,
          contactId,
          dispatchDate,
          expectedReturnDate: expectedReturnDate || null,
          serviceCost: Number(serviceCost) || 0,
          notes: notes.trim() || null,
        }
        const created = await api.production.subcontract.create(body)
        nav.navigate('production.subcontract.detail', { id: created.id }, created.dispatchNo || 'Fason')
      },
      { errorTitle: 'Oluşturulamadı' },
    )
  }

  return (
    <Screen
      header={{ title: 'Yeni fason sevk', onBack: nav.goBack }}
      footer={<Button title="Oluştur" icon="check" fullWidth loading={busy} onPress={save} />}
    >
      <Card>
        <View style={{ gap: t.spacing[4] }}>
          <FormSelect
            label="Üretim Emri"
            value={manufacturingOrderId}
            options={orderOptions}
            onChange={setManufacturingOrderId}
          />
          <FormSelect label="Fasoncu (Cari)" value={contactId} options={contactOptions} onChange={setContactId} />
          <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
            <View style={{ flex: 1 }}>
              <FormDatePicker label="Sevk Tarihi" value={dispatchDate} onChange={setDispatchDate} mode="date" />
            </View>
            <View style={{ flex: 1 }}>
              <FormDatePicker
                label="Beklenen İade"
                value={expectedReturnDate}
                onChange={setExpectedReturnDate}
                mode="date"
              />
            </View>
          </View>
          <Input label="İşçilik Ücreti" keyboardType="numeric" value={serviceCost} onChangeText={setServiceCost} />
          <FormTextArea label="Notlar" placeholder="Fason notları..." value={notes} onChangeText={setNotes} />
          <Text variant="caption" tone="muted">
            Gönderilecek malzemeler üretim emrinin bileşenlerinden otomatik alınır.
          </Text>
        </View>
      </Card>
    </Screen>
  )
}

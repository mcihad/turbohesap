// Bottom sheet to convert a lead (aday) into a customer/supplier, optionally
// spawning an opportunity at the same time. Mirrors the web ConvertLeadDialog;
// same slide-up Modal pattern as CloseOpportunitySheet.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ContactDto, ContactRole, ConvertLeadRequest } from '@turbohesap/shared'

import { Button, FormSelect, FormSwitchRow, Icon, Input, Text } from '../../components'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'

const ROLE_OPTIONS: { value: ContactRole; label: string }[] = [
  { value: 'customer', label: 'Müşteri' },
  { value: 'supplier', label: 'Tedarikçi' },
  { value: 'both', label: 'Müşteri+Tedarikçi' },
]

export function ConvertLeadSheet({
  visible,
  contact,
  onClose,
  onConverted,
}: {
  visible: boolean
  contact: ContactDto | null
  onClose: () => void
  onConverted: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const [toRole, setToRole] = React.useState<ContactRole>('customer')
  const [createOpportunity, setCreateOpportunity] = React.useState(false)
  const [oppName, setOppName] = React.useState('')
  const [pipelineId, setPipelineId] = React.useState('')
  const [amount, setAmount] = React.useState('')

  const pipelines = useAsync(() => api.contacts.pipelines.list(), [], { enabled: visible })
  const pipelineOptions = (pipelines.data ?? []).map((p) => ({ value: p.id, label: p.name }))

  React.useEffect(() => {
    if (!visible) return
    setToRole('customer')
    setCreateOpportunity(false)
    setOppName(contact ? `${contact.name} fırsatı` : '')
    setPipelineId('')
    setAmount('')
  }, [visible, contact])

  const save = () => {
    if (!contact) return
    const payload: ConvertLeadRequest = { toRole, createOpportunity }
    if (createOpportunity) {
      payload.opportunity = {
        name: oppName.trim() || contact.name,
        pipelineId: pipelineId || pipelineOptions[0]?.value || undefined,
        amount: Number(amount) || undefined,
      }
    }
    submit(() => api.contacts.contacts.convert(contact.id, payload).then(() => undefined), {
      onSuccess: onConverted,
      errorTitle: 'Dönüştürme başarısız',
    })
  }

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
            maxHeight: '85%',
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
              paddingBottom: t.spacing[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                Adayı dönüştür
              </Text>
              {contact ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {contact.name}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], gap: t.spacing[4] }}>
            <FormSelect label="Yeni rol" value={toRole} onChange={setToRole} options={ROLE_OPTIONS} />

            <FormSwitchRow
              label="Fırsat da oluştur"
              description="Dönüştürürken bu cari için bir satış fırsatı aç."
              value={createOpportunity}
              onValueChange={setCreateOpportunity}
            />

            {createOpportunity ? (
              <>
                <Input label="Fırsat adı" placeholder="Fırsat başlığı" value={oppName} onChangeText={setOppName} />
                {pipelineOptions.length > 0 ? (
                  <FormSelect
                    label="Satış hattı"
                    value={pipelineId || pipelineOptions[0].value}
                    onChange={setPipelineId}
                    options={pipelineOptions}
                  />
                ) : null}
                <Input
                  label="Tutar"
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                />
              </>
            ) : null}

            <Button
              title="Dönüştür"
              icon="user-check"
              fullWidth
              loading={busy}
              disabled={!contact}
              onPress={save}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

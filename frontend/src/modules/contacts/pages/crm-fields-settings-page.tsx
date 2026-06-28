// CRM özel alan ayarları — Cari (contact) ve Fırsat (opportunity) için
// kategoriye benzer şekilde özel alan şeması tanımlanır. Tanımlar her kayıdın
// `attributes` bag'ine yazılan değerleri yönetir. pipelinesWrite ile korunur.

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type CrmFieldDef,
  type CrmFieldEntity,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper, PageHeader } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FieldDefBuilder } from '@/modules/inventory/components/field-def-builder'

const ENTITY_LABEL: Record<CrmFieldEntity, string> = {
  contact: 'Cari',
  opportunity: 'Fırsat',
}

const ENTITIES: CrmFieldEntity[] = ['contact', 'opportunity']

export function CrmFieldsSettingsPage() {
  const qc = useQueryClient()
  const [entity, setEntity] = React.useState<CrmFieldEntity>('contact')
  const [fields, setFields] = React.useState<CrmFieldDef[]>([])

  const query = useQuery({
    queryKey: ['contacts', 'field-defs', entity],
    queryFn: () => api.contacts.fields.get(entity),
  })

  // Seed local editing state whenever the loaded defs change (entity switch / refetch).
  React.useEffect(() => {
    if (query.data) setFields(query.data.fields)
  }, [query.data])

  const save = useMutation({
    mutationFn: () => api.contacts.fields.set(entity, { fields }),
    onSuccess: (saved) => {
      toast.success('Özel alanlar kaydedildi')
      setFields(saved.fields)
      void qc.invalidateQueries({ queryKey: ['contacts', 'field-defs', entity] })
    },
    onError: (e) => toast.error('Kayıt başarısız', { description: toApiError(e).message }),
  })

  return (
    <PermissionRequired permission={ContactsPermissions.pipelinesWrite}>
      <PageWrapper>
        <PageHeader
          title="CRM özel alanları"
          description="Cari ve fırsat kayıtlarına eklenecek özel alanları tanımlayın"
          actions={
            <Button onClick={() => save.mutate()} disabled={save.isPending || query.isLoading}>
              <Save className="size-4" />
              Kaydet
            </Button>
          }
        />

        {/* Pill-style segmented control: a distinct element, spaced above the card. */}
        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
          {ENTITIES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEntity(e)}
              aria-pressed={entity === e}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors outline-none',
                'focus-visible:ring-[3px] focus-visible:ring-ring/40',
                entity === e
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ENTITY_LABEL[e]}
            </button>
          ))}
        </div>

        <Card className="mt-4 rounded-xl border-border">
          <CardHeader>
            <CardTitle className="text-sm">{ENTITY_LABEL[entity]} için özel alanlar</CardTitle>
            <p className="text-xs text-muted-foreground">
              Bu kayıt türüne eklenecek özel alanları tanımlayın; değerler her kaydın
              ek bilgileri olarak saklanır.
            </p>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <FieldDefBuilder value={fields} onChange={setFields} />
            )}
          </CardContent>
        </Card>
      </PageWrapper>
    </PermissionRequired>
  )
}

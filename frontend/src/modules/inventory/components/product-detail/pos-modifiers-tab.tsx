import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Save } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type ProductDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

// Product detail "POS" tab — attach reusable modifier groups (Ekstra Soslar,
// Pişme Derecesi, …) to this product. These drive the POS modifier sheet shown
// when the cashier picks the product.
export function PosModifiersTab({ product }: { product: ProductDto }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.modifiersWrite)

  const allGroupsQuery = useQuery({
    queryKey: ['inventory', 'modifier-groups'],
    queryFn: () => api.inventory.modifiers.listGroups(),
    enabled: hasPermission(InventoryPermissions.modifiersRead),
  })
  const attachedQuery = useQuery({
    queryKey: ['inventory', 'products', product.id, 'modifiers'],
    queryFn: () => api.inventory.modifiers.listForProduct(product.id),
  })

  const [selected, setSelected] = React.useState<string[] | null>(null)
  // Initialise selection from the server once both queries resolve.
  React.useEffect(() => {
    if (attachedQuery.data && selected === null) {
      setSelected(attachedQuery.data.map((g) => g.id))
    }
  }, [attachedQuery.data, selected])

  const sel = selected ?? []
  const groups = allGroupsQuery.data ?? []

  const save = useMutation({
    mutationFn: () => api.inventory.modifiers.setForProduct(product.id, { groupIds: sel }),
    onSuccess: () => {
      toast.success('Ürün seçenekleri güncellendi')
      qc.invalidateQueries({ queryKey: ['inventory', 'products', product.id, 'modifiers'] })
      // keep the POS sell screen's "needs options?" map fresh
      qc.invalidateQueries({ queryKey: ['inventory', 'modifier-map'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const toggle = (id: string) =>
    setSelected((cur) => {
      const base = cur ?? []
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })

  const dirty =
    attachedQuery.data != null &&
    JSON.stringify([...sel].sort()) !== JSON.stringify(attachedQuery.data.map((g) => g.id).sort())

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm">POS Ürün Seçenekleri</CardTitle>
          <p className="text-2xs text-muted-foreground">
            Bu ürün satışta hangi seçenek gruplarını göstersin?
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" /> Kaydet
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tanımlı seçenek grubu yok. POS &gt; Ürün Seçenekleri bölümünden ekleyin.
          </p>
        ) : (
          groups.map((g) => {
            const on = sel.includes(g.id)
            return (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-accent"
              >
                <Checkbox checked={on} onCheckedChange={() => canWrite && toggle(g.id)} disabled={!canWrite} />
                <GripVertical className="size-4 text-muted-foreground/50" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-2xs text-muted-foreground">
                    {g.selectionType === 'single' ? 'Tek seçim' : 'Çok seçim'}
                    {g.required ? ' · zorunlu' : ''} ·{' '}
                    {g.options.map((o) => o.name).join(', ') || 'seçenek yok'}
                  </p>
                </div>
              </label>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

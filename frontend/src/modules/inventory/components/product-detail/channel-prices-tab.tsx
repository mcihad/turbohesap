import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Layers, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SalesPermissions, toApiError, type ProductDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { money } from '../../labels'
import { BulkChannelPriceDialog } from './bulk-price'

const NONE = '__none__'

export function ChannelPricesTab({
  product,
  canWrite,
  refetch,
}: {
  product: ProductDto
  canWrite: boolean
  refetch: () => void
}) {
  const { hasPermission } = useAuth()
  const channelsQuery = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const channels = channelsQuery.data ?? []
  const variants = product.variants ?? []

  const [variantId, setVariantId] = React.useState<string>(NONE)
  const [channelId, setChannelId] = React.useState<string>('')
  const [price, setPrice] = React.useState('')
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const save = useMutation({
    mutationFn: () => {
      if (!channelId) throw new Error('Kanal seçin')
      return api.inventory.products.setChannelPrice(product.id, {
        variantId: variantId === NONE ? null : variantId,
        channelId,
        salePrice: Number(price) || 0,
      })
    },
    onSuccess: () => { toast.success('Kanal fiyatı kaydedildi'); setPrice(''); refetch() },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.inventory.products.removeChannelPrice(product.id, id),
    onSuccess: () => { toast.success('Kanal fiyatı silindi'); refetch() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const rows = product.channelPrices ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Taban satış fiyatı{' '}
          <span className="font-medium text-foreground">{money(product.salePrice, product.currency)}</span>.
          Kanal fiyatı girilen kanallarda bu fiyat geçersiz kılınır.
        </p>
        {canWrite && variants.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Layers className="size-4" />
            Kanala göre toplu
          </Button>
        ) : null}
      </div>

      {bulkOpen ? (
        <BulkChannelPriceDialog
          product={product}
          onClose={() => setBulkOpen(false)}
          onSaved={() => { setBulkOpen(false); refetch() }}
        />
      ) : null}

      {canWrite ? (
        <div className="grid items-end gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          {variants.length > 0 ? (
            <Cell label="Varyant">
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tüm ürün</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label || v.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Cell>
          ) : null}
          <Cell label="Kanal">
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue placeholder="Kanal seçin" /></SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Cell>
          <Cell label={`Fiyat (${product.currency})`}>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-32" />
          </Cell>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        </div>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varyant</TableHead>
              <TableHead>Kanal</TableHead>
              <TableHead className="text-right">Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              {canWrite ? <TableHead className="w-14 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.variantLabel || <span className="text-muted-foreground">Tüm ürün</span>}</TableCell>
                <TableCell>{c.channel?.name || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{money(c.salePrice, c.currency || product.currency)}</TableCell>
                <TableCell><Badge variant={c.isActive ? 'success' : 'outline'}>{c.isActive ? 'Aktif' : 'Pasif'}</Badge></TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(c.id)} aria-label="Sil">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 5 : 4} className="text-center text-muted-foreground">
                  Kanal fiyatı yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

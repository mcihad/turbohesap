import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { OrgPermissions, toApiError, type ProductDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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

const NONE = '__none__'

export function StockTab({
  product,
  canStock,
  refetch,
}: {
  product: ProductDto
  canStock: boolean
  refetch: () => void
}) {
  const { hasPermission } = useAuth()
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const branches = branchesQuery.data ?? []
  const variants = product.variants ?? []

  const [variantId, setVariantId] = React.useState<string>(NONE)
  const [branchId, setBranchId] = React.useState<string>(NONE)
  const [qty, setQty] = React.useState('0')

  const save = useMutation({
    mutationFn: () =>
      api.inventory.products.setStock(product.id, {
        variantId: variantId === NONE ? null : variantId,
        branchId: branchId === NONE ? null : branchId,
        quantity: Number(qty) || 0,
      }),
    onSuccess: () => { toast.success('Stok güncellendi'); setQty('0'); refetch() },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  const remove = useMutation({
    mutationFn: (stockId: string) => api.inventory.products.removeStock(product.id, stockId),
    onSuccess: () => { toast.success('Stok kaydı silindi'); refetch() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const rows = product.stock ?? []
  const total = rows.length ? rows.reduce((s, r) => s + r.quantity, 0) : product.quantity

  return (
    <div className="space-y-4">
      {canStock ? (
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
          <Cell label="Şube">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Şube" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Genel (şubesiz)</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Cell>
          <Cell label="Miktar">
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-28" />
          </Cell>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        </div>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varyant</TableHead>
              <TableHead>Şube</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              {canStock ? <TableHead className="w-14 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.variantLabel || <span className="text-muted-foreground">Tüm ürün</span>}</TableCell>
                <TableCell>{s.branch?.name || <span className="text-muted-foreground">Genel</span>}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.quantity}
                  {product.unit ? <span className="ml-1 text-xs text-muted-foreground">{product.unit}</span> : null}
                </TableCell>
                {canStock ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(s.id)} aria-label="Sil">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canStock ? 4 : 3} className="text-center text-muted-foreground">
                  Henüz stok kaydı yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <p className="text-right text-sm text-muted-foreground">
        Toplam stok: <span className="font-medium text-foreground tabular-nums">{total}</span>
        {product.unit ? ` ${product.unit}` : ''}
      </p>
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

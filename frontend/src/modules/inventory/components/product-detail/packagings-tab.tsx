import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type ProductDto, type ProductPackagingDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { LookupSelect } from '@/components/lookup-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

const NONE = '__none__'

export function PackagingsTab({
  product,
  canWrite,
  refetch,
}: {
  product: ProductDto
  canWrite: boolean
  refetch: () => void
}) {
  const [dialog, setDialog] = React.useState<{ pkg: ProductPackagingDto | null } | null>(null)

  const remove = useMutation({
    mutationFn: (id: string) => api.inventory.products.removePackaging(product.id, id),
    onSuccess: () => { toast.success('Paket silindi'); refetch() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const rows = product.packagings ?? []

  // The un-discounted total = pack quantity × base unit price (the variant's or
  // the product's). Shown alongside the pack price so the saving is visible
  // (e.g. 6 × 10 = 60 vs the 50 pack price).
  const rawTotal = (pk: ProductPackagingDto): number | null => {
    const base = pk.variantId
      ? product.variants.find((v) => v.id === pk.variantId)?.effectiveSalePrice ?? product.salePrice
      : product.salePrice
    return base == null ? null : base * pk.quantity
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Çarpanlı satış birimleri — tekli taban fiyat{' '}
          <span className="font-medium text-foreground">{money(product.salePrice, product.currency)}</span>.
        </p>
        {canWrite ? (
          <Button size="sm" onClick={() => setDialog({ pkg: null })}>
            <Plus className="size-4" />
            Paket ekle
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Çarpan</TableHead>
              <TableHead>Barkod</TableHead>
              <TableHead className="text-right">Fiyat</TableHead>
              <TableHead>Varyant</TableHead>
              {canWrite ? <TableHead className="w-20 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((pk) => (
              <TableRow key={pk.id} className={pk.isActive ? '' : 'opacity-55'}>
                <TableCell className="font-medium">{pk.name}</TableCell>
                <TableCell>{pk.unit || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">×{pk.quantity}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{pk.barcode || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>
                    {money(pk.effectiveSalePrice, product.currency)}
                    {pk.salePrice != null ? <span className="ml-1 text-2xs text-muted-foreground">(sabit)</span> : null}
                  </div>
                  {(() => {
                    const raw = rawTotal(pk)
                    const show = raw != null && pk.effectiveSalePrice != null && Math.abs(raw - pk.effectiveSalePrice) > 0.001
                    return show ? (
                      <div className="text-2xs text-muted-foreground">
                        çarpansız <span className="line-through">{money(raw, product.currency)}</span>
                      </div>
                    ) : null
                  })()}
                </TableCell>
                <TableCell>{pk.variantLabel ? <Badge variant="secondary">{pk.variantLabel}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ pkg: pk })} aria-label="Düzenle">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { if (confirm(`"${pk.name}" paketi silinsin mi?`)) remove.mutate(pk.id) }}
                      aria-label="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground">
                  Paket yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {dialog ? (
        <PackagingDialog
          product={product}
          pkg={dialog.pkg}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refetch() }}
        />
      ) : null}
    </div>
  )
}

function PackagingDialog({
  product,
  pkg,
  onClose,
  onSaved,
}: {
  product: ProductDto
  pkg: ProductPackagingDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const variants = product.variants ?? []
  const [name, setName] = React.useState(pkg?.name ?? '')
  const [unit, setUnit] = React.useState<string | null>(pkg?.unit || null)
  const [quantity, setQuantity] = React.useState(String(pkg?.quantity ?? 6))
  const [barcode, setBarcode] = React.useState(pkg?.barcode ?? '')
  const [salePrice, setSalePrice] = React.useState(pkg?.salePrice == null ? '' : String(pkg.salePrice))
  const [variantId, setVariantId] = React.useState<string>(pkg?.variantId ?? NONE)
  const [isActive, setIsActive] = React.useState(pkg?.isActive ?? true)

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        quantity: Number(quantity) || 1,
        unit: unit ?? '',
        barcode,
        salePrice: salePrice.trim() === '' ? null : Number(salePrice),
        variantId: variantId === NONE ? null : variantId,
        isActive,
      }
      return pkg
        ? api.inventory.products.updatePackaging(product.id, pkg.id, payload)
        : api.inventory.products.createPackaging(product.id, payload)
    },
    onSuccess: () => { toast.success(pkg ? 'Paket güncellendi' : 'Paket eklendi'); onSaved() },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  const preview = salePrice.trim() === '' && product.salePrice != null
    ? `Otomatik: ${money((Number(quantity) || 0) * product.salePrice, product.currency)}`
    : null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pkg ? 'Paketi düzenle' : 'Yeni paket'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 px-1 py-1">
          <Row label="Ad">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="6'lı Koli" />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Birim">
              <LookupSelect list="birim" value={unit} onChange={setUnit} placeholder="Birim" />
            </Row>
            <Row label="Çarpan (adet)">
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Row>
            <Row label="Barkod">
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="font-mono" />
            </Row>
            <Row label={`Sabit fiyat (${product.currency})`}>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Otomatik" />
            </Row>
          </div>
          {preview ? <p className="text-xs text-muted-foreground">{preview}</p> : null}
          {variants.length > 0 ? (
            <Row label="Varyant (ops.)">
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tüm ürün</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label || v.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            Aktif
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {pkg ? 'Kaydet' : 'Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import {
  STOCK_COUNT_KINDS,
  STOCK_COUNT_KIND_LABELS,
  StocktakePermissions,
  toApiError,
  type CreateStockCountRequest,
  type SellableUnitDto,
  type StockCountDto,
  type StockCountKind,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'

const ABC_CLASSES = ['A', 'B', 'C'] as const

export function StocktakeCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (count: StockCountDto) => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission(StocktakePermissions.create)

  const [kind, setKind] = React.useState<StockCountKind>('full')
  const [name, setName] = React.useState('')
  const [branchId, setBranchId] = React.useState<string>('')
  const [blind, setBlind] = React.useState(false)
  const [threshold, setThreshold] = React.useState('5')
  const [categoryIds, setCategoryIds] = React.useState<string[]>([])
  const [products, setProducts] = React.useState<SellableUnitDto[]>([])
  const [abcClass, setAbcClass] = React.useState<string>('A')
  const [allowAddUnlisted, setAllowAddUnlisted] = React.useState(false)
  const [countUnscannedAsZero, setCountUnscannedAsZero] = React.useState(false)

  // Reset the form whenever the dialog (re)opens.
  React.useEffect(() => {
    if (open) {
      setKind('full')
      setName('')
      setBranchId('')
      setBlind(false)
      setThreshold('5')
      setCategoryIds([])
      setProducts([])
      setAbcClass('A')
      setAllowAddUnlisted(false)
      setCountUnscannedAsZero(false)
    }
  }, [open])

  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: open,
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: open && kind === 'partial',
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateStockCountRequest) => api.stocktake.create(input),
    onSuccess: (count) => {
      toast.success('Sayım oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['stocktake'] })
      onOpenChange(false)
      onCreated(count)
    },
    onError: (e) => toast.error('Sayım oluşturulamadı', { description: toApiError(e).message }),
  })

  const submit = () => {
    const input: CreateStockCountRequest = {
      kind,
      name: name.trim() || undefined,
      branchId: branchId || null,
      blind,
      recountThresholdPct: threshold ? Number(threshold) : undefined,
      allowAddUnlisted,
      countUnscannedAsZero,
    }
    if (kind === 'partial') {
      input.scopeCategoryIds = categoryIds
      input.scopeProductIds = products.map((p) => p.productId)
    }
    if (kind === 'cycle') {
      input.abcClass = abcClass
    }
    createMutation.mutate(input)
  }

  const categories = categoriesQuery.data ?? []
  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  const addProducts = (units: SellableUnitDto[]) =>
    setProducts((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      return [...prev, ...units.filter((u) => !seen.has(u.id))]
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Sayım</DialogTitle>
          <DialogDescription>
            Sayım oturumu oluşturun. Oluşturulduğunda ürün satırları otomatik hazırlanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tür (kind) */}
          <div className="space-y-1.5">
            <Label>Tür</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={kind}
              onValueChange={(v) => {
                if (v) setKind(v as StockCountKind)
              }}
              className="w-full"
            >
              {STOCK_COUNT_KINDS.map((k) => (
                <ToggleGroupItem key={k} value={k} className="flex-1">
                  {STOCK_COUNT_KIND_LABELS[k]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Ad (name) */}
          <div className="space-y-1.5">
            <Label htmlFor="stk-name">Ad</Label>
            <Input
              id="stk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Mayıs Ayı Sayımı"
            />
          </div>

          {/* Şube (branch) */}
          <div className="space-y-1.5">
            <Label>Şube</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Şube seç" />
              </SelectTrigger>
              <SelectContent>
                {(branchesQuery.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fark eşiği % (recountThresholdPct) */}
          <div className="space-y-1.5">
            <Label htmlFor="stk-threshold">Fark eşiği (%)</Label>
            <Input
              id="stk-threshold"
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Bu yüzdenin üzerindeki farklar tekrar sayım için işaretlenir.
            </p>
          </div>

          {/* Kör sayım (blind) */}
          <SwitchRow
            id="stk-blind"
            label="Kör sayım"
            hint="Sayanlar beklenen miktarı görmez (doğrulama yanlılığını azaltır)."
            checked={blind}
            onCheckedChange={setBlind}
          />

          {/* Partial scope: categories + products */}
          {kind === 'partial' ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label>Kategoriler</Label>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Kategori yok.</p>
                  ) : (
                    categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                      >
                        <Badge variant={categoryIds.includes(c.id) ? 'info' : 'outline'}>
                          {c.name}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Ürünler</Label>
                <ProductPickerField
                  value={null}
                  onChange={(u) => {
                    if (u) addProducts([u])
                  }}
                  allowMulti
                  onPickMulti={addProducts}
                  placeholder="Ürün ekle…"
                  title="Sayıma ürün ekle"
                />
                {products.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {products.map((p) => (
                      <Badge key={p.id} variant="secondary" className="gap-1">
                        {p.label}
                        <button
                          type="button"
                          onClick={() =>
                            setProducts((prev) => prev.filter((x) => x.id !== p.id))
                          }
                          aria-label="Kaldır"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Cycle scope: ABC class */}
          {kind === 'cycle' ? (
            <div className="space-y-1.5">
              <Label>ABC Sınıfı</Label>
              <Select value={abcClass} onValueChange={setAbcClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Sınıf seç" />
                </SelectTrigger>
                <SelectContent>
                  {ABC_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} sınıfı
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-3">
            <SwitchRow
              id="stk-add-unlisted"
              label="Listede olmayan ürünlere izin ver"
              hint="Kapsam dışı ürünler tarandığında otomatik eklenir."
              checked={allowAddUnlisted}
              onCheckedChange={setAllowAddUnlisted}
            />
            <SwitchRow
              id="stk-unscanned-zero"
              label="Sayılmayanları sıfır say"
              hint="Onayda sayılmayan satırlar 0 olarak işlenir."
              checked={countUnscannedAsZero}
              onCheckedChange={setCountUnscannedAsZero}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={!canCreate || createMutation.isPending}>
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

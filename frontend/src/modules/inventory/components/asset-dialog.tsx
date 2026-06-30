import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  toApiError,
  type AssetDto,
  type CreateAssetRequest,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LookupSelect } from '@/components/lookup-select'
import { BranchSelect, ContactSelect } from './asset-pickers'

interface FormState {
  name: string
  code: string
  assetTypeKey: string | null
  barcode: string
  serialNo: string
  brand: string
  model: string
  branchId: string | null
  notes: string
  isActive: boolean
  // Purchase
  purchaseDate: string
  purchaseValue: string
  currency: string
  supplierContactId: string | null
  warrantyEnd: string
  // Vehicle
  isVehicle: boolean
  plate: string
  chassisNo: string
  engineNo: string
  modelYear: string
  fuelTypeKey: string | null
}

const EMPTY: FormState = {
  name: '',
  code: '',
  assetTypeKey: null,
  barcode: '',
  serialNo: '',
  brand: '',
  model: '',
  branchId: null,
  notes: '',
  isActive: true,
  purchaseDate: '',
  purchaseValue: '',
  currency: 'TRY',
  supplierContactId: null,
  warrantyEnd: '',
  isVehicle: false,
  plate: '',
  chassisNo: '',
  engineNo: '',
  modelYear: '',
  fuelTypeKey: null,
}

function fromDto(a: AssetDto): FormState {
  return {
    name: a.name,
    code: a.code,
    assetTypeKey: a.assetTypeKey,
    barcode: a.barcode ?? '',
    serialNo: a.serialNo ?? '',
    brand: a.brand ?? '',
    model: a.model ?? '',
    branchId: a.branchId,
    notes: a.notes ?? '',
    isActive: a.isActive,
    purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
    purchaseValue: a.purchaseValue ? String(a.purchaseValue) : '',
    currency: a.currency || 'TRY',
    supplierContactId: a.supplierContactId,
    warrantyEnd: a.warrantyEnd ? a.warrantyEnd.slice(0, 10) : '',
    isVehicle: a.isVehicle,
    plate: a.plate ?? '',
    chassisNo: a.chassisNo ?? '',
    engineNo: a.engineNo ?? '',
    modelYear: a.modelYear == null ? '' : String(a.modelYear),
    fuelTypeKey: a.fuelTypeKey,
  }
}

function toPayload(form: FormState): CreateAssetRequest {
  const str = (s: string) => (s.trim() === '' ? null : s.trim())
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  return {
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    assetTypeKey: form.assetTypeKey,
    barcode: str(form.barcode),
    serialNo: str(form.serialNo),
    brand: str(form.brand),
    model: str(form.model),
    branchId: form.branchId,
    notes: str(form.notes),
    isActive: form.isActive,
    purchaseDate: str(form.purchaseDate),
    purchaseValue: num(form.purchaseValue) ?? 0,
    currency: form.currency || 'TRY',
    supplierContactId: form.supplierContactId,
    warrantyEnd: str(form.warrantyEnd),
    isVehicle: form.isVehicle,
    plate: form.isVehicle ? str(form.plate) : null,
    chassisNo: form.isVehicle ? str(form.chassisNo) : null,
    engineNo: form.isVehicle ? str(form.engineNo) : null,
    modelYear: form.isVehicle ? num(form.modelYear) : null,
    fuelTypeKey: form.isVehicle ? form.fuelTypeKey : null,
  }
}

/** Create/edit dialog for a demirbaş. Saves only on "Kaydet"/"Oluştur". */
export function AssetDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AssetDto | null
  onSaved: (saved: AssetDto) => void
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? fromDto(editing) : EMPTY)
  }, [open, editing])

  const save = useMutation({
    mutationFn: () => {
      const payload = toPayload(form)
      return editing
        ? api.inventory.assets.update(editing.id, payload)
        : api.inventory.assets.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Demirbaş güncellendi' : 'Demirbaş oluşturuldu')
      onOpenChange(false)
      onSaved(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Demirbaşı düzenle' : 'Yeni demirbaş'}</DialogTitle>
          <DialogDescription>
            Demirbaşın kimlik, araç ve satınalma bilgilerini girin.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="genel" className="py-1">
          <TabsList>
            <TabsTrigger value="genel">Genel</TabsTrigger>
            <TabsTrigger value="arac">Araç</TabsTrigger>
            <TabsTrigger value="satinalma">Satınalma</TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto px-1 pt-3">
            <TabsContent value="genel" className="m-0">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ad" className="col-span-2">
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
                </Field>
                <Field label="Kod">
                  <Input
                    value={form.code}
                    onChange={(e) => set('code', e.target.value)}
                    placeholder="Boş bırakılırsa otomatik"
                    className="font-mono"
                  />
                </Field>
                <Field label="Tür">
                  <LookupSelect list="asset_type" value={form.assetTypeKey} onChange={(v) => set('assetTypeKey', v)} />
                </Field>
                <Field label="Barkod / QR">
                  <Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className="font-mono" />
                </Field>
                <Field label="Seri no">
                  <Input value={form.serialNo} onChange={(e) => set('serialNo', e.target.value)} className="font-mono" />
                </Field>
                <Field label="Marka">
                  <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} />
                </Field>
                <Field label="Model">
                  <Input value={form.model} onChange={(e) => set('model', e.target.value)} />
                </Field>
                <Field label="Şube" className="col-span-2">
                  <BranchSelect value={form.branchId} onChange={(v) => set('branchId', v)} />
                </Field>
                <Field label="Notlar" className="col-span-2">
                  <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
                </Field>
              </div>
              <label className="flex items-center gap-2 pt-3 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
                Aktif
              </label>
            </TabsContent>

            <TabsContent value="arac" className="m-0">
              <label className="flex items-center gap-2 pb-3 text-sm">
                <Switch checked={form.isVehicle} onCheckedChange={(v) => set('isVehicle', v)} />
                Bu demirbaş bir araç
              </label>
              {form.isVehicle ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Plaka">
                    <Input value={form.plate} onChange={(e) => set('plate', e.target.value)} className="font-mono uppercase" />
                  </Field>
                  <Field label="Yakıt türü">
                    <LookupSelect list="fuel_type" value={form.fuelTypeKey} onChange={(v) => set('fuelTypeKey', v)} />
                  </Field>
                  <Field label="Şasi no">
                    <Input value={form.chassisNo} onChange={(e) => set('chassisNo', e.target.value)} className="font-mono" />
                  </Field>
                  <Field label="Motor no">
                    <Input value={form.engineNo} onChange={(e) => set('engineNo', e.target.value)} className="font-mono" />
                  </Field>
                  <Field label="Model yılı">
                    <Input
                      type="number"
                      value={form.modelYear}
                      onChange={(e) => set('modelYear', e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Araç bilgilerini girmek için yukarıdaki anahtarı açın.
                </p>
              )}
            </TabsContent>

            <TabsContent value="satinalma" className="m-0">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Satınalma tarihi">
                  <Input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
                </Field>
                <Field label="Satınalma değeri">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.purchaseValue}
                    onChange={(e) => set('purchaseValue', e.target.value)}
                  />
                </Field>
                <Field label="Para birimi">
                  <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} className="uppercase" />
                </Field>
                <Field label="Garanti bitiş">
                  <Input type="date" value={form.warrantyEnd} onChange={(e) => set('warrantyEnd', e.target.value)} />
                </Field>
                <Field label="Tedarikçi (cari)" className="col-span-2">
                  <ContactSelect value={form.supplierContactId} onChange={(v) => set('supplierContactId', v)} />
                </Field>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  DEFAULT_REGISTER_SETTINGS,
  PosPermissions,
  toApiError,
  type CreatePosRegisterRequest,
  type PosRegisterDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export function RegistersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(PosPermissions.registersWrite)

  const registersQuery = useQuery({ queryKey: ['pos', 'registers'], queryFn: () => api.pos.registers.list() })
  const [editing, setEditing] = React.useState<PosRegisterDto | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const remove = useMutation({
    mutationFn: (id: string) => api.pos.registers.remove(id),
    onSuccess: () => {
      toast.success('Kasa silindi')
      qc.invalidateQueries({ queryKey: ['pos', 'registers'] })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const registers = registersQuery.data ?? []

  return (
    <PermissionRequired permission={PosPermissions.registersRead}>
      <PageWrapper className="space-y-6">
        <PageHeader
          title="Kasalar"
          description="POS terminalleri — şube, satış kanalı ve kasa ayarları"
          actions={
            canWrite ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Yeni Kasa
              </Button>
            ) : null
          }
        />
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Şube</TableHead>
                <TableHead>Satış kanalı</TableHead>
                <TableHead>Sepet</TableHead>
                <TableHead>KDV</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.code}</TableCell>
                  <TableCell>{r.branch?.name ?? '—'}</TableCell>
                  <TableCell>{r.salesChannel?.name ?? 'Tümü'}</TableCell>
                  <TableCell>{r.settings.cartSide === 'left' ? 'Sol' : 'Sağ'}</TableCell>
                  <TableCell>{r.settings.taxInclusive ? 'Dahil' : 'Hariç'}</TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <span className="text-emerald-600">Aktif</span>
                    ) : (
                      <span className="text-muted-foreground">Pasif</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`"${r.name}" silinsin mi?`)) remove.mutate(r.id)
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {registers.length === 0 && !registersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Henüz kasa eklenmedi.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {(createOpen || editing) && (
          <RegisterDialog
            register={editing}
            onClose={() => {
              setCreateOpen(false)
              setEditing(null)
            }}
            onSaved={() => {
              setCreateOpen(false)
              setEditing(null)
              qc.invalidateQueries({ queryKey: ['pos', 'registers'] })
            }}
          />
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function RegisterDialog({
  register,
  onClose,
  onSaved,
}: {
  register: PosRegisterDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const branchesQuery = useQuery({ queryKey: ['org', 'branches'], queryFn: () => api.org.branches.list() })
  const channelsQuery = useQuery({ queryKey: ['sales', 'channels'], queryFn: () => api.sales.channels.list() })
  const cashQuery = useQuery({ queryKey: ['finance', 'cash-accounts'], queryFn: () => api.finance.cashAccounts.list() })

  const [name, setName] = React.useState(register?.name ?? '')
  const [code, setCode] = React.useState(register?.code ?? '')
  const [branchId, setBranchId] = React.useState(register?.branchId ?? '')
  const [salesChannelId, setSalesChannelId] = React.useState(register?.salesChannelId ?? NONE)
  const [cashAccountId, setCashAccountId] = React.useState(register?.defaultCashAccountId ?? NONE)
  const [cartSide, setCartSide] = React.useState(register?.settings.cartSide ?? DEFAULT_REGISTER_SETTINGS.cartSide)
  const [taxInclusive, setTaxInclusive] = React.useState(register?.settings.taxInclusive ?? DEFAULT_REGISTER_SETTINGS.taxInclusive)
  const [kitchenEnabled, setKitchenEnabled] = React.useState(register?.settings.kitchenEnabled ?? DEFAULT_REGISTER_SETTINGS.kitchenEnabled)
  const [isActive, setIsActive] = React.useState(register?.isActive ?? true)

  const save = useMutation({
    mutationFn: () => {
      const payload: CreatePosRegisterRequest = {
        name: name.trim(),
        code: code.trim() || undefined,
        branchId,
        salesChannelId: salesChannelId === NONE ? null : salesChannelId,
        defaultCashAccountId: cashAccountId === NONE ? null : cashAccountId,
        settings: { cartSide, taxInclusive, kitchenEnabled },
        isActive,
      }
      return register ? api.pos.registers.update(register.id, payload) : api.pos.registers.create(payload)
    },
    onSuccess: () => {
      toast.success(register ? 'Kasa güncellendi' : 'Kasa oluşturuldu')
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const valid = name.trim() && branchId

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{register ? 'Kasa Düzenle' : 'Yeni Kasa'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ad">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Kod (boşsa otomatik)">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="K1" />
          </Field>
          <Field label="Şube">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {(branchesQuery.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Satış kanalı (ops.)">
            <Select value={salesChannelId} onValueChange={setSalesChannelId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Tümü (kanalsız)</SelectItem>
                {(channelsQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Varsayılan kasa hesabı (ops.)">
            <Select value={cashAccountId} onValueChange={setCashAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Seçilmedi</SelectItem>
                {(cashQuery.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sepet tarafı">
            <Select value={cartSide} onValueChange={(v) => setCartSide(v as 'left' | 'right')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Sağ</SelectItem>
                <SelectItem value="left">Sol</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleField label="KDV dahil fiyat" checked={taxInclusive} onChange={setTaxInclusive} />
          <ToggleField label="Mutfak ekranı (KDS)" checked={kitchenEnabled} onChange={setKitchenEnabled} />
          <ToggleField label="Aktif" checked={isActive} onChange={setIsActive} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-2xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

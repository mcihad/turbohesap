import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  IamPermissions,
  OrgPermissions,
  SALARY_TYPES,
  SALARY_TYPE_LABELS,
  SGK_STATUSES,
  SGK_STATUS_LABELS,
  toApiError,
  type CreateEmployeeRequest,
  type EmployeeDto,
  type EmploymentType,
  type SalaryType,
  type SgkStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const NO_BRANCH = '__nobranch__'
const NO_USER = '__nouser__'

interface FormState {
  firstName: string
  lastName: string
  tcKimlikNo: string
  birthDate: string
  hireDate: string
  terminationDate: string
  departmentKey: string
  positionKey: string
  employmentType: EmploymentType
  salaryType: SalaryType
  salaryAmount: string
  sgkSicilNo: string
  sgkStatus: SgkStatus
  iban: string
  bankName: string
  phone: string
  email: string
  address: string
  branchId: string
  annualLeaveDays: string
  isActive: boolean
  notes: string
  // User link (create mode only)
  userMode: UserMode
  userId: string
  newUsername: string
  newEmail: string
  newPassword: string
}

/** Which user-link strategy is active when creating a personel. */
type UserMode = 'none' | 'link' | 'create'

/** Random ~14-char password — mirrors the helper in user-detail-page.tsx. */
function generatePassword(length = 14): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%?'
  const buf = new Uint32Array(length)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length]
  return out
}

/** Suggest a username from the personel's email local-part, else firstname.lastname. */
function suggestUsername(f: FormState): string {
  const email = f.email.trim()
  if (email.includes('@')) return email.split('@')[0].toLowerCase()
  const parts = [f.firstName.trim(), f.lastName.trim()]
    .filter(Boolean)
    .map((p) => p.toLowerCase())
  return parts.join('.')
}

function emptyForm(): FormState {
  return {
    firstName: '',
    lastName: '',
    tcKimlikNo: '',
    birthDate: '',
    hireDate: new Date().toISOString().slice(0, 10),
    terminationDate: '',
    departmentKey: '',
    positionKey: '',
    employmentType: 'full_time',
    salaryType: 'gross',
    salaryAmount: '0',
    sgkSicilNo: '',
    sgkStatus: 'normal',
    iban: '',
    bankName: '',
    phone: '',
    email: '',
    address: '',
    branchId: '',
    annualLeaveDays: '14',
    isActive: true,
    notes: '',
    userMode: 'none',
    userId: '',
    newUsername: '',
    newEmail: '',
    newPassword: '',
  }
}

function fromEmployee(emp: EmployeeDto): FormState {
  return {
    firstName: emp.firstName,
    lastName: emp.lastName,
    tcKimlikNo: emp.tcKimlikNo ?? '',
    birthDate: emp.birthDate?.slice(0, 10) ?? '',
    hireDate: emp.hireDate.slice(0, 10),
    terminationDate: emp.terminationDate?.slice(0, 10) ?? '',
    departmentKey: emp.departmentKey ?? '',
    positionKey: emp.positionKey ?? '',
    employmentType: emp.employmentType,
    salaryType: emp.salaryType,
    salaryAmount: String(emp.salaryAmount),
    sgkSicilNo: emp.sgkSicilNo ?? '',
    sgkStatus: emp.sgkStatus,
    iban: emp.iban ?? '',
    bankName: emp.bankName ?? '',
    phone: emp.phone ?? '',
    email: emp.email ?? '',
    address: emp.address ?? '',
    branchId: emp.branchId ?? '',
    annualLeaveDays: String(emp.annualLeaveDays),
    isActive: emp.isActive,
    notes: emp.notes ?? '',
    userMode: 'none',
    userId: emp.userId ?? '',
    newUsername: '',
    newEmail: '',
    newPassword: '',
  }
}

type FieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'hireDate'
    | 'salaryAmount'
    | 'newUsername'
    | 'newEmail'
    | 'newPassword',
    string
  >
>

/**
 * Create/edit dialog for an employee, split into tabs. Handles BOTH create
 * (no `employee`) and edit (with `employee`). The form re-hydrates every time
 * the dialog opens or the target changes — no permanent ref latch — which is
 * the fix for the previous edit-page hydrate-once bug.
 */
export function EmployeeDialog({
  open,
  onOpenChange,
  employee = null,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The employee being edited, or null/undefined to create. */
  employee?: EmployeeDto | null
  onSaved?: (saved: EmployeeDto) => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()

  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [tab, setTab] = React.useState('kisisel')
  const [showPassword, setShowPassword] = React.useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Switch the user-link strategy; prefill create-user fields on first entry.
  const setUserMode = (mode: UserMode) =>
    setForm((f) => {
      if (mode !== 'create') return { ...f, userMode: mode }
      return {
        ...f,
        userMode: mode,
        newUsername: f.newUsername || suggestUsername(f),
        newEmail: f.newEmail || f.email.trim(),
      }
    })

  // Re-hydrate whenever the dialog opens (or the target employee changes).
  React.useEffect(() => {
    if (!open) return
    setForm(employee ? fromEmployee(employee) : emptyForm())
    setErrors({})
    setTab('kisisel')
    setShowPassword(false)
  }, [open, employee])

  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: open && hasPermission(OrgPermissions.branchesRead),
  })
  const branches = branchesQuery.data ?? []

  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    // Load the linkable users whenever the link controls can show (create, or an
    // existing personel that is not yet linked).
    enabled: open && !employee?.userId && hasPermission(IamPermissions.usersRead),
  })
  const users = usersQuery.data ?? []

  const validate = (): FieldErrors => {
    const e: FieldErrors = {}
    if (!form.firstName.trim()) e.firstName = 'Ad zorunludur'
    if (!form.lastName.trim()) e.lastName = 'Soyad zorunludur'
    if (!form.hireDate) e.hireDate = 'İşe giriş tarihi zorunludur'
    const salary = Number(form.salaryAmount)
    if (form.salaryAmount.trim() === '' || Number.isNaN(salary) || salary < 0)
      e.salaryAmount = 'Geçerli bir maaş tutarı girin'
    if (form.userMode === 'create') {
      if (!form.newUsername.trim()) e.newUsername = 'Kullanıcı adı zorunludur'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim()))
        e.newEmail = 'Geçerli bir e-posta girin'
      if (form.newPassword.length < 6)
        e.newPassword = 'Parola en az 6 karakter olmalı'
    }
    return e
  }

  const buildPayload = (): CreateEmployeeRequest => {
    const base: CreateEmployeeRequest = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    tcKimlikNo: form.tcKimlikNo.trim() || undefined,
    birthDate: form.birthDate || null,
    hireDate: form.hireDate,
    terminationDate: form.terminationDate || null,
    departmentKey: form.departmentKey.trim() || null,
    positionKey: form.positionKey.trim() || null,
    employmentType: form.employmentType,
    salaryType: form.salaryType,
    salaryAmount: Number(form.salaryAmount) || 0,
    sgkSicilNo: form.sgkSicilNo.trim() || null,
    sgkStatus: form.sgkStatus,
    iban: form.iban.trim() || null,
    bankName: form.bankName.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    branchId: form.branchId || null,
    annualLeaveDays: Number(form.annualLeaveDays) || 0,
    isActive: form.isActive,
    notes: form.notes.trim() || null,
    }
    // Link an existing user (userId wins; never send createUser alongside it).
    if (form.userMode === 'link' && form.userId) {
      base.userId = form.userId
      return base
    }
    // Create a brand-new login user (create mode, or an unlinked personel on edit).
    if (
      !employee?.userId &&
      form.userMode === 'create' &&
      form.newUsername.trim() &&
      form.newEmail.trim() &&
      form.newPassword
    ) {
      base.createUser = {
        username: form.newUsername.trim(),
        email: form.newEmail.trim(),
        password: form.newPassword,
      }
    }
    return base
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return employee
        ? api.hr.employees.update(employee.id, payload)
        : api.hr.employees.create(payload)
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
      void qc.invalidateQueries({ queryKey: ['hr'] })
      toast.success(employee ? 'Personel güncellendi' : 'Personel oluşturuldu')
      onOpenChange(false)
      onSaved?.(saved)
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const createUserInvalid =
    !employee?.userId &&
    form.userMode === 'create' &&
    (!form.newUsername.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim()) ||
      form.newPassword.length < 6)

  const onSave = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      // Jump to the tab holding the first error so it's visible.
      if (e.firstName || e.lastName) setTab('kisisel')
      else if (e.hireDate) setTab('istihdam')
      else if (e.salaryAmount) setTab('maas')
      else if (e.newUsername || e.newEmail || e.newPassword) setTab('kullanici')
      return
    }
    save.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? 'Personeli Düzenle' : 'Yeni Personel'}</DialogTitle>
          <DialogDescription>
            {employee
              ? 'Personel bilgilerini güncelleyin.'
              : 'Yeni bir personel kaydı oluşturun.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="kisisel">Kişisel</TabsTrigger>
            <TabsTrigger value="istihdam">İstihdam</TabsTrigger>
            <TabsTrigger value="maas">Maaş &amp; SGK</TabsTrigger>
            <TabsTrigger value="iletisim">İletişim &amp; Banka</TabsTrigger>
            <TabsTrigger value="kullanici">Kullanıcı</TabsTrigger>
          </TabsList>

          {/* Kişisel */}
          <TabsContent value="kisisel" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ad" required error={errors.firstName}>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus />
            </Field>
            <Field label="Soyad" required error={errors.lastName}>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </Field>
            <Field label="TC Kimlik No">
              <Input value={form.tcKimlikNo} onChange={(e) => set('tcKimlikNo', e.target.value)} />
            </Field>
            <Field label="Doğum Tarihi">
              <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
            </Field>
          </TabsContent>

          {/* İstihdam */}
          <TabsContent value="istihdam" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="İşe Giriş Tarihi" required error={errors.hireDate}>
              <Input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} />
            </Field>
            <Field label="İşten Çıkış Tarihi">
              <Input type="date" value={form.terminationDate} onChange={(e) => set('terminationDate', e.target.value)} />
            </Field>
            <Field label="Departman">
              <Input value={form.departmentKey} onChange={(e) => set('departmentKey', e.target.value)} />
            </Field>
            <Field label="Pozisyon">
              <Input value={form.positionKey} onChange={(e) => set('positionKey', e.target.value)} />
            </Field>
            <Field label="Çalışma Türü">
              <Select value={form.employmentType} onValueChange={(v) => set('employmentType', v as EmploymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EMPLOYMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {branches.length > 0 ? (
              <Field label="Şube">
                <Select
                  value={form.branchId || NO_BRANCH}
                  onValueChange={(v) => set('branchId', v === NO_BRANCH ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şube seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH}>Şube yok</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label="Yıllık İzin (gün)">
              <Input
                type="number"
                value={form.annualLeaveDays}
                onChange={(e) => set('annualLeaveDays', e.target.value)}
              />
            </Field>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} id="emp-active" />
              <Label htmlFor="emp-active" className="text-sm">
                Aktif personel
              </Label>
            </div>
          </TabsContent>

          {/* Maaş & SGK */}
          <TabsContent value="maas" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Maaş Tipi">
              <ToggleGroup
                type="single"
                variant="outline"
                value={form.salaryType}
                onValueChange={(v) => {
                  if (v) set('salaryType', v as SalaryType)
                }}
                className="w-full"
              >
                {SALARY_TYPES.map((t) => (
                  <ToggleGroupItem key={t} value={t}>
                    {SALARY_TYPE_LABELS[t]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field label="Maaş Tutarı" required error={errors.salaryAmount}>
              <Input
                type="number"
                value={form.salaryAmount}
                onChange={(e) => set('salaryAmount', e.target.value)}
              />
            </Field>
            <Field label="SGK Durumu">
              <Select value={form.sgkStatus} onValueChange={(v) => set('sgkStatus', v as SgkStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SGK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SGK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="SGK Sicil No">
              <Input value={form.sgkSicilNo} onChange={(e) => set('sgkSicilNo', e.target.value)} />
            </Field>
          </TabsContent>

          {/* İletişim & Banka */}
          <TabsContent value="iletisim" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Telefon">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="E-posta">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="IBAN">
              <Input value={form.iban} onChange={(e) => set('iban', e.target.value)} />
            </Field>
            <Field label="Banka">
              <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </Field>
            <Field label="Adres" className="sm:col-span-2">
              <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} />
            </Field>
            <Field label="Notlar" className="sm:col-span-2">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>
          </TabsContent>

          {/* Kullanıcı */}
          <TabsContent value="kullanici" className="space-y-4">
            {employee?.userId ? (
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">Bu personel bir kullanıcıya bağlı.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Detaylı kullanıcı bilgisi için kullanıcılar bölümüne gidin.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/iam/users/$id" params={{ id: employee.userId }}>
                    Kullanıcıya git
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={form.userMode}
                  onValueChange={(v) => {
                    if (v) setUserMode(v as UserMode)
                  }}
                  className="w-full"
                >
                  <ToggleGroupItem value="none">Yok</ToggleGroupItem>
                  <ToggleGroupItem value="link">Mevcut kullanıcıyı bağla</ToggleGroupItem>
                  <ToggleGroupItem value="create">Yeni kullanıcı oluştur</ToggleGroupItem>
                </ToggleGroup>

                {form.userMode === 'link' ? (
                  <Field label="Kullanıcı">
                    <Select
                      value={form.userId || NO_USER}
                      onValueChange={(v) => set('userId', v === NO_USER ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kullanıcı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_USER}>Seçilmedi</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username} · {u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                {form.userMode === 'create' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Kullanıcı Adı" required error={errors.newUsername}>
                      <Input
                        value={form.newUsername}
                        onChange={(e) => set('newUsername', e.target.value)}
                      />
                    </Field>
                    <Field label="E-posta" required error={errors.newEmail}>
                      <Input
                        type="email"
                        value={form.newEmail}
                        onChange={(e) => set('newEmail', e.target.value)}
                      />
                    </Field>
                    <Field label="Parola" required error={errors.newPassword} className="sm:col-span-2">
                      <div className="flex gap-2">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={form.newPassword}
                          onChange={(e) => set('newPassword', e.target.value)}
                          className="font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title={showPassword ? 'Gizle' : 'Göster'}
                          onClick={() => setShowPassword((s) => !s)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Rastgele üret"
                          onClick={() => {
                            set('newPassword', generatePassword())
                            setShowPassword(true)
                          }}
                        >
                          <Wand2 />
                          <span className="hidden sm:inline">Üret</span>
                        </Button>
                      </div>
                    </Field>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Yeni kullanıcı, vardiya görüntüleme + giriş/çıkış + zimmet
                      (devret/devral) standart yetkileriyle açılır.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={onSave} disabled={save.isPending || createUserInvalid}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

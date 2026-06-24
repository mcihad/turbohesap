/* eslint-disable react-refresh/only-export-components --
   This is a showcase REGISTRY: it intentionally co-locates demo components with
   the SHOWCASES data export, so Fast Refresh's "only export components" rule
   doesn't apply. */
import * as React from 'react'
import { toast } from 'sonner'
import {
  ChevronDown,
  Compass,
  FormInput,
  type LucideIcon,
  MessageSquare,
  Plus,
  Table2,
} from 'lucide-react'

import type { AuditLogDto } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AuditTrail } from '@/components/ui/audit-trail'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/date-range-picker'
import { FilterBar, FilterField } from '@/components/ui/filter-bar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// One showcase per component. The sidebar groups these by `category`, and each
// opens a page at /components/<slug> that renders <Demo/>. Add a new entry here
// when you build a new shared component (see the create-component skill).
export interface Showcase {
  slug: string
  title: string
  category: string
  description?: string
  Demo: React.FC
}

/** Frames a single example with an optional label. */
function Example({
  label,
  children,
  className,
}: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border bg-card p-5',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>
}

/* ── Form ─────────────────────────────────────────────────────────────── */

const ButtonDemo: React.FC = () => (
  <Stack>
    <Example label="Varyantlar">
      <Button>Varsayılan</Button>
      <Button variant="secondary">İkincil</Button>
      <Button variant="outline">Dış çizgi</Button>
      <Button variant="ghost">Hayalet</Button>
      <Button variant="link">Bağlantı</Button>
      <Button variant="destructive">Sil</Button>
    </Example>
    <Example label="Boyutlar ve ikon">
      <Button size="sm">Küçük</Button>
      <Button>Orta</Button>
      <Button size="lg">Büyük</Button>
      <Button size="icon" aria-label="Ekle">
        <Plus />
      </Button>
      <Button>
        <Plus />
        İkonlu
      </Button>
      <Button disabled>Pasif</Button>
    </Example>
  </Stack>
)

const InputDemo: React.FC = () => (
  <Example className="max-w-sm flex-col items-stretch">
    <div className="space-y-2">
      <Label htmlFor="d-input">E-posta</Label>
      <Input id="d-input" type="email" placeholder="ornek@turbohesap.local" />
    </div>
    <Input placeholder="Pasif" disabled />
    <Input aria-invalid placeholder="Geçersiz" />
  </Example>
)

const TextareaDemo: React.FC = () => (
  <Example className="max-w-sm flex-col items-stretch">
    <Label htmlFor="d-ta">Not</Label>
    <Textarea id="d-ta" placeholder="Bir şeyler yazın…" />
  </Example>
)

const SwitchDemo: React.FC = () => {
  const [on, setOn] = React.useState(true)
  return (
    <Example>
      <Switch id="d-sw" checked={on} onCheckedChange={setOn} />
      <Label htmlFor="d-sw">{on ? 'Açık' : 'Kapalı'}</Label>
    </Example>
  )
}

const CheckboxDemo: React.FC = () => {
  const [checked, setChecked] = React.useState(true)
  return (
    <Example>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
        Bildirimleri al
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox disabled /> Pasif
      </label>
    </Example>
  )
}

const SelectDemo: React.FC = () => (
  <Example className="max-w-xs">
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Bir seçenek seçin" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Birinci</SelectItem>
        <SelectItem value="b">İkinci</SelectItem>
        <SelectItem value="c">Üçüncü</SelectItem>
      </SelectContent>
    </Select>
  </Example>
)

const SliderDemo: React.FC = () => {
  const [v, setV] = React.useState([40])
  return (
    <Example className="flex-col items-stretch">
      <Slider value={v} onValueChange={setV} max={100} step={1} />
      <span className="text-sm text-muted-foreground">Değer: {v[0]}</span>
    </Example>
  )
}

/* ── Veri gösterimi ───────────────────────────────────────────────────── */

const BadgeDemo: React.FC = () => (
  <Example>
    <Badge>Varsayılan</Badge>
    <Badge variant="secondary">İkincil</Badge>
    <Badge variant="outline">Dış çizgi</Badge>
    <Badge variant="success">Başarılı</Badge>
    <Badge variant="warning">Uyarı</Badge>
    <Badge variant="info">Bilgi</Badge>
    <Badge variant="destructive">Hata</Badge>
  </Example>
)

const CardDemo: React.FC = () => (
  <Example>
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Kart başlığı</CardTitle>
        <CardDescription>Kısa açıklama metni.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Kart gövdesi — token tabanlı yüzey, kenarlık ve gölge.
      </CardContent>
    </Card>
  </Example>
)

const AvatarDemo: React.FC = () => (
  <Example>
    <Avatar>
      <AvatarFallback>TH</AvatarFallback>
    </Avatar>
    <Avatar className="size-12">
      <AvatarFallback className="bg-primary/15 text-primary">SY</AvatarFallback>
    </Avatar>
  </Example>
)

const ProgressDemo: React.FC = () => (
  <Example className="flex-col items-stretch">
    <Progress value={30} />
    <Progress value={70} />
  </Example>
)

const SkeletonDemo: React.FC = () => (
  <Example className="flex-col items-stretch">
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  </Example>
)

const SeparatorDemo: React.FC = () => (
  <Example>
    <span className="text-sm">Sol</span>
    <Separator orientation="vertical" className="h-6" />
    <span className="text-sm">Orta</span>
    <Separator orientation="vertical" className="h-6" />
    <span className="text-sm">Sağ</span>
  </Example>
)

const TableDemo: React.FC = () => (
  <Example className="block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ad</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Durum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Ayşe</TableCell>
          <TableCell>admin</TableCell>
          <TableCell><Badge variant="success">Aktif</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Mehmet</TableCell>
          <TableCell>user</TableCell>
          <TableCell><Badge variant="outline">Pasif</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Example>
)

/* ── Navigasyon ───────────────────────────────────────────────────────── */

const TabsDemo: React.FC = () => (
  <Example className="block">
    <Tabs defaultValue="genel">
      <TabsList>
        <TabsTrigger value="genel">Genel</TabsTrigger>
        <TabsTrigger value="detay">Detay</TabsTrigger>
      </TabsList>
      <TabsContent value="genel" className="pt-3 text-sm text-muted-foreground">
        Genel sekme içeriği.
      </TabsContent>
      <TabsContent value="detay" className="pt-3 text-sm text-muted-foreground">
        Detay sekme içeriği.
      </TabsContent>
    </Tabs>
  </Example>
)

const BreadcrumbDemo: React.FC = () => (
  <Example>
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Yönetim</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Kullanıcılar</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </Example>
)

const DropdownMenuDemo: React.FC = () => (
  <Example>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Menü <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Hesap</DropdownMenuLabel>
        <DropdownMenuItem>Profil</DropdownMenuItem>
        <DropdownMenuItem>Ayarlar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Çıkış</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Example>
)

/* ── Geri bildirim ────────────────────────────────────────────────────── */

const DialogDemo: React.FC = () => (
  <Example>
    <Dialog>
      <DialogTrigger asChild>
        <Button>Dialogu aç</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emin misiniz?</DialogTitle>
          <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">İptal</Button>
          <Button variant="destructive">Onayla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Example>
)

const TooltipDemo: React.FC = () => (
  <Example>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Üzerine gel</Button>
      </TooltipTrigger>
      <TooltipContent>İpucu metni</TooltipContent>
    </Tooltip>
  </Example>
)

const ToastDemo: React.FC = () => (
  <Example>
    <Button onClick={() => toast.success('Kaydedildi')}>Başarı</Button>
    <Button variant="outline" onClick={() => toast.error('Bir hata oluştu')}>
      Hata
    </Button>
    <Button
      variant="outline"
      onClick={() => toast('Bilgi', { description: 'Açıklama metni' })}
    >
      Bilgi
    </Button>
  </Example>
)

type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

const AUDIT_SAMPLE: AuditLogDto[] = [
  {
    id: '1',
    entityType: 'User',
    entityId: 'a1b2c3d4-1111',
    tableName: 'users',
    module: 'iam',
    action: 'Update',
    changeCount: 2,
    changes: [
      { field: 'firstName', oldValue: 'Ali', newValue: 'Ahmet' },
      { field: 'isActive', oldValue: true, newValue: false },
    ],
    ipAddress: '127.0.0.1',
    userId: 'u1',
    userName: 'admin',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: '2',
    entityType: 'Role',
    entityId: 'r1-2222',
    tableName: 'roles',
    module: 'iam',
    action: 'Insert',
    changeCount: 1,
    changes: [{ field: 'name', oldValue: null, newValue: 'Muhasebe' }],
    ipAddress: null,
    userId: 'u1',
    userName: 'admin',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: '3',
    entityType: 'User',
    entityId: 'x9-3333',
    tableName: 'users',
    module: 'iam',
    action: 'Delete',
    changeCount: 1,
    changes: [{ field: 'username', oldValue: 'gecici', newValue: null }],
    ipAddress: null,
    userId: 'u1',
    userName: 'admin',
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
]

const ButtonGroupDemo: React.FC = () => (
  <Example>
    <ButtonGroup>
      <Button variant="outline" size="sm">Gün</Button>
      <Button variant="outline" size="sm">Hafta</Button>
      <Button variant="outline" size="sm">Ay</Button>
    </ButtonGroup>
  </Example>
)

const FilterBarDemo: React.FC = () => {
  const [q, setQ] = React.useState('')
  const [range, setRange] = React.useState<DateRange | undefined>(undefined)
  const active = [q, range?.from].filter(Boolean).length
  return (
    <div className="w-full max-w-2xl">
      <FilterBar
        activeCount={active}
        onClear={() => {
          setQ('')
          setRange(undefined)
        }}
      >
        <FilterField label="Ara" className="sm:col-span-2">
          <Input
            placeholder="Ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </FilterField>
        <FilterField label="Tarih aralığı" className="sm:col-span-2">
          <DateRangePicker value={range} onChange={setRange} max={new Date()} />
        </FilterField>
      </FilterBar>
    </div>
  )
}

const DateRangePickerDemo: React.FC = () => {
  const [range, setRange] = React.useState<DateRange | undefined>(undefined)
  return (
    <Example>
      <DateRangePicker
        value={range}
        onChange={setRange}
        max={new Date()}
        className="w-72"
      />
    </Example>
  )
}

const AuditTrailDemo: React.FC = () => (
  <Example>
    <AuditTrail logs={AUDIT_SAMPLE} className="w-full max-w-xl" />
  </Example>
)

const DrawerDemo: React.FC = () => {
  const [direction, setDirection] = React.useState<DrawerDirection>('bottom')
  return (
    <Example className="items-end gap-4">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Pozisyon</span>
        <Select
          value={direction}
          onValueChange={(v) => setDirection(v as DrawerDirection)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom">Alt</SelectItem>
            <SelectItem value="top">Üst</SelectItem>
            <SelectItem value="left">Sol</SelectItem>
            <SelectItem value="right">Sağ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Drawer direction={direction}>
        <DrawerTrigger asChild>
          <Button variant="outline">Çekmeceyi aç</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtreler</DrawerTitle>
            <DrawerDescription>
              Seçilen yönden kayan, sürüklenebilir panel (vaul). Açılınca arka
              plan hafif bulanıklaşır.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-5 pb-2 text-sm text-muted-foreground">
            İçerik buraya gelir — dokunmatik için filtreler/hızlı formlar.
          </div>
          <DrawerFooter>
            <Button>Uygula</Button>
            <DrawerClose asChild>
              <Button variant="outline">Kapat</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Example>
  )
}

const AccordionDemo: React.FC = () => (
  <Example className="block max-w-md">
    <Accordion type="single" collapsible>
      <AccordionItem value="1">
        <AccordionTrigger>Birinci başlık</AccordionTrigger>
        <AccordionContent>Birinci içerik.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="2">
        <AccordionTrigger>İkinci başlık</AccordionTrigger>
        <AccordionContent>İkinci içerik.</AccordionContent>
      </AccordionItem>
    </Accordion>
  </Example>
)

export const SHOWCASES: Showcase[] = [
  // Form
  { slug: 'button', title: 'Button', category: 'Form', description: 'Aksiyon düğmeleri; varyant ve boyutlar.', Demo: ButtonDemo },
  { slug: 'button-group', title: 'Button Group', category: 'Form', description: 'Bitişik segment buton grubu.', Demo: ButtonGroupDemo },
  { slug: 'input', title: 'Input', category: 'Form', description: 'Tek satır metin girişi.', Demo: InputDemo },
  { slug: 'textarea', title: 'Textarea', category: 'Form', description: 'Çok satırlı metin girişi.', Demo: TextareaDemo },
  { slug: 'switch', title: 'Switch', category: 'Form', description: 'Aç/kapa anahtarı.', Demo: SwitchDemo },
  { slug: 'checkbox', title: 'Checkbox', category: 'Form', description: 'Onay kutusu.', Demo: CheckboxDemo },
  { slug: 'select', title: 'Select', category: 'Form', description: 'Açılır tek seçim.', Demo: SelectDemo },
  { slug: 'slider', title: 'Slider', category: 'Form', description: 'Aralık/değer kaydırıcı.', Demo: SliderDemo },
  { slug: 'date-range-picker', title: 'Date Range Picker', category: 'Form', description: 'Hazır seçimli (son 7 gün, bu ay…) tarih aralığı seçici.', Demo: DateRangePickerDemo },
  // Veri gösterimi
  { slug: 'badge', title: 'Badge', category: 'Veri Gösterimi', description: 'Durum/etiket rozeti.', Demo: BadgeDemo },
  { slug: 'card', title: 'Card', category: 'Veri Gösterimi', description: 'İçerik kartı.', Demo: CardDemo },
  { slug: 'avatar', title: 'Avatar', category: 'Veri Gösterimi', description: 'Kullanıcı avatarı.', Demo: AvatarDemo },
  { slug: 'table', title: 'Table', category: 'Veri Gösterimi', description: 'Veri tablosu.', Demo: TableDemo },
  { slug: 'progress', title: 'Progress', category: 'Veri Gösterimi', description: 'İlerleme çubuğu.', Demo: ProgressDemo },
  { slug: 'skeleton', title: 'Skeleton', category: 'Veri Gösterimi', description: 'Yükleniyor iskeleti.', Demo: SkeletonDemo },
  { slug: 'separator', title: 'Separator', category: 'Veri Gösterimi', description: 'Ayraç.', Demo: SeparatorDemo },
  { slug: 'audit-trail', title: 'Audit Trail', category: 'Veri Gösterimi', description: 'Varlık değişikliklerinin zaman çizelgesi (genişletilebilir diff).', Demo: AuditTrailDemo },
  { slug: 'filter-bar', title: 'Filter Bar', category: 'Veri Gösterimi', description: 'Katlanır, şık filtre kapsayıcısı (FilterField ile).', Demo: FilterBarDemo },
  // Navigasyon
  { slug: 'tabs', title: 'Tabs', category: 'Navigasyon', description: 'Sekmeler.', Demo: TabsDemo },
  { slug: 'breadcrumb', title: 'Breadcrumb', category: 'Navigasyon', description: 'Sayfa kırıntısı.', Demo: BreadcrumbDemo },
  { slug: 'dropdown-menu', title: 'Dropdown Menu', category: 'Navigasyon', description: 'Açılır menü.', Demo: DropdownMenuDemo },
  // Geri bildirim
  { slug: 'dialog', title: 'Dialog', category: 'Geri Bildirim', description: 'Modal pencere.', Demo: DialogDemo },
  { slug: 'drawer', title: 'Drawer', category: 'Geri Bildirim', description: 'Alttan/yandan kayan sürüklenebilir panel (vaul).', Demo: DrawerDemo },
  { slug: 'tooltip', title: 'Tooltip', category: 'Geri Bildirim', description: 'İpucu balonu.', Demo: TooltipDemo },
  { slug: 'toast', title: 'Toast (Sonner)', category: 'Geri Bildirim', description: 'Anlık bildirimler.', Demo: ToastDemo },
  { slug: 'accordion', title: 'Accordion', category: 'Geri Bildirim', description: 'Katlanır bölümler.', Demo: AccordionDemo },
]

// Stable category order for the sidebar.
export const CATEGORY_ORDER = ['Form', 'Veri Gösterimi', 'Navigasyon', 'Geri Bildirim']

// Icon per category — used for the sidebar group header / collapsed flyout.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Form: FormInput,
  'Veri Gösterimi': Table2,
  Navigasyon: Compass,
  'Geri Bildirim': MessageSquare,
}

export function showcasesByCategory(): {
  category: string
  icon?: LucideIcon
  items: Showcase[]
}[] {
  const cats = [
    ...CATEGORY_ORDER,
    ...SHOWCASES.map((s) => s.category).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]
  return [...new Set(cats)].map((category) => ({
    category,
    icon: CATEGORY_ICONS[category],
    items: SHOWCASES.filter((s) => s.category === category),
  }))
}

export function getShowcase(slug: string): Showcase | undefined {
  return SHOWCASES.find((s) => s.slug === slug)
}

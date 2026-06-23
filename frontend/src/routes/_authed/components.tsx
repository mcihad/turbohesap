import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Bookmark,
  Copy,
  FileText,
  Heart,
  MoreHorizontal,
  Pencil,
  Settings2,
  Share2,
  Star,
  Trash2,
} from 'lucide-react'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tree, type TreeNode } from '@/components/ui/tree'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/components')({
  component: ComponentsPage,
})

function Section({
  title,
  description,
  className,
  contentClassName,
  children,
}: {
  title: string
  description?: string
  className?: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent
        className={contentClassName ?? 'flex flex-wrap items-center gap-3'}
      >
        {children}
      </CardContent>
    </Card>
  )
}

/* ----------------------------- Toast demo ------------------------------ */
function ToastDemo() {
  return (
    <>
      <Button
        variant="outline"
        onClick={() =>
          toast('Etkinlik oluşturuldu', { description: '21 Haziran Cuma · 10:00' })
        }
      >
        Varsayılan
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success('Değişiklikler kaydedildi', { description: 'Düzenlemeleriniz yayında.' })
        }
      >
        Başarılı
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error('Kaydetme başarısız', { description: 'Lütfen tekrar deneyin.' })
        }
      >
        Hata
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info('Güncelleme mevcut', { description: 'v2.5.0 hazır.' })
        }
      >
        Bilgi
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast('Davetiye gönderildi', {
            description: 'mira@kentos.io',
            action: { label: 'Geri al', onClick: () => toast('Geri alındı') },
          })
        }
      >
        Eylemli
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1600)),
            {
              loading: 'Yükleniyor…',
              success: 'Dosya yüklendi',
              error: 'Yükleme başarısız',
            },
          )
        }
      >
        İşlem (Promise)
      </Button>
    </>
  )
}

/* -------------------------- Context-menu demo -------------------------- */
function ContextMenuDemo() {
  const [bookmarked, setBookmarked] = React.useState(true)
  const [view, setView] = React.useState('grid')
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Buraya sağ tıklayın
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Eylemler</ContextMenuLabel>
        <ContextMenuItem onSelect={() => toast('Kopyala')}>
          <Copy /> Kopyala <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => toast('Yeniden Adlandır')}>
          <Pencil /> Yeniden Adlandır
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Share2 /> Paylaş
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => toast('Bağlantıyı kopyala')}>Bağlantıyı kopyala</ContextMenuItem>
            <ContextMenuItem onSelect={() => toast('E-posta')}>E-posta</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={bookmarked}
          onCheckedChange={(v) => setBookmarked(Boolean(v))}
          onSelect={() => toast('Yer işareti eklendi')}
        >
          Yer işareti eklendi
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value={view} onValueChange={setView}>
          <ContextMenuLabel inset>Görünüm</ContextMenuLabel>
          <ContextMenuRadioItem value="grid" onSelect={() => toast('Izgara')}>Izgara</ContextMenuRadioItem>
          <ContextMenuRadioItem value="list" onSelect={() => toast('Liste')}>Liste</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => toast('Sil')}>
          <Trash2 /> Sil <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/* ------------------------------ Drawer demo ---------------------------- */
const DRAWER_FILTERS = ['Aktif', 'Arşivlenmiş', 'Yıldızlı', 'Benimle paylaşılanlar']

function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Çekmeceyi aç</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Sonuçları filtrele</DrawerTitle>
            <DrawerDescription>
              Kapatmak için kulpu sürükleyin veya aşağı kaydırın.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-5 pb-2">
            {DRAWER_FILTERS.map((f, i) => (
              <Label
                key={f}
                className="flex items-center gap-2.5 font-normal"
              >
                <Checkbox defaultChecked={i < 2} /> {f}
              </Label>
            ))}
          </div>
          <DrawerFooter>
            <Button>Filtreleri uygula</Button>
            <DrawerClose asChild>
              <Button variant="ghost">İptal</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/* ----------------------------- List view ------------------------------ */
const PEOPLE = [
  { name: 'Mira Patel', role: 'Ürün Tasarımcısı', initials: 'MP', online: true },
  { name: 'Leo Tan', role: 'Önyüz Geliştiricisi', initials: 'LT', online: true },
  { name: 'Ava Reed', role: 'Operasyon Yöneticisi', initials: 'AR', online: false },
  { name: 'Noah Kim', role: 'Veri Analisti', initials: 'NK', online: false },
]

function ListViewDemo() {
  return (
    <div className="w-full divide-y overflow-hidden rounded-lg border">
      {PEOPLE.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
        >
          <Avatar>
            <AvatarFallback className="bg-primary/15 text-primary">
              {p.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">{p.role}</p>
          </div>
          <Badge variant={p.online ? 'success' : 'secondary'}>
            {p.online ? 'Aktif' : 'Dışarıda'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Satır eylemleri">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => toast('Düzenle')}>
                <Pencil /> Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast('Paylaş')}>
                <Share2 /> Paylaş
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => toast('Kaldır')}>
                <Trash2 /> Kaldır
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------- Tree -------------------------------- */
const TREE_DATA: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          {
            id: 'ui',
            label: 'ui',
            badge: '24',
            children: [
              { id: 'button', label: 'button.tsx', icon: FileText },
              { id: 'dialog', label: 'dialog.tsx', icon: FileText },
              { id: 'table', label: 'table.tsx', icon: FileText },
            ],
          },
          { id: 'app-shell', label: 'app-shell.tsx', icon: FileText },
        ],
      },
      {
        id: 'lib',
        label: 'lib',
        children: [{ id: 'utils', label: 'utils.ts', icon: FileText }],
      },
      { id: 'main', label: 'main.tsx', icon: FileText },
    ],
  },
  { id: 'pkg', label: 'package.json', icon: FileText },
  { id: 'readme', label: 'README.md', icon: FileText },
]

function TreeDemo() {
  return (
    <Tree
      data={TREE_DATA}
      defaultExpanded={['src', 'components', 'ui']}
      defaultSelected="button"
      onSelect={(n) => toast(`${n.label} açıldı`)}
      className="w-full"
    />
  )
}

/* -------------------------------- Table ------------------------------- */
const INVOICES = [
  { id: 'INV-001', customer: 'Northwind', status: 'Ödendi', amount: '$1.200' },
  { id: 'INV-002', customer: 'Globex', status: 'Beklemede', amount: '$2.400' },
  { id: 'INV-003', customer: 'Initech', status: 'Vadesi Geçmiş', amount: '$640' },
  { id: 'INV-004', customer: 'Umbrella', status: 'Ödendi', amount: '$580' },
]

function statusVariant(status: string) {
  if (status === 'Ödendi') return 'success' as const
  if (status === 'Beklemede') return 'warning' as const
  return 'destructive' as const
}

function TableDemo() {
  const [selected, setSelected] = React.useState<string[]>(['INV-002'])
  const allSelected = selected.length === INVOICES.length
  const toggleAll = () =>
    setSelected(allSelected ? [] : INVOICES.map((i) => i.id))
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Tümünü seç"
            />
          </TableHead>
          <TableHead>Fatura</TableHead>
          <TableHead>Müşteri</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">Tutar</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {INVOICES.map((inv) => (
          <TableRow
            key={inv.id}
            data-state={selected.includes(inv.id) ? 'selected' : undefined}
          >
            <TableCell>
              <Checkbox
                checked={selected.includes(inv.id)}
                onCheckedChange={() => toggle(inv.id)}
                aria-label={`${inv.id} seç`}
              />
            </TableCell>
            <TableCell className="font-medium">{inv.id}</TableCell>
            <TableCell>{inv.customer}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {inv.amount}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon-sm" aria-label="Satır menüsü">
                <MoreHorizontal />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Toplam</TableCell>
          <TableCell className="text-right">$4.820</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}

function ComponentsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Bileşenler"
        description="Tasarım sistemi öğelerinin canlı referansı. Buradaki her şey aktif temaya göre tepki verir."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Butonlar" description="Varyasyonlar ve boyutlar">
          <Button>Birincil</Button>
          <Button variant="secondary">İkincil</Button>
          <Button variant="outline">Dış Hatlı</Button>
          <Button variant="ghost">Şeffaf</Button>
          <Button variant="destructive">Yıkıcı</Button>
          <Button variant="link">Bağlantı</Button>
          <Button size="sm">Küçük</Button>
          <Button size="icon" aria-label="Ayarlar">
            <Settings2 />
          </Button>
        </Section>

        <Section title="Rozetler" description="Durum ve anlamsal tonlar">
          <Badge>Varsayılan</Badge>
          <Badge variant="secondary">İkincil</Badge>
          <Badge variant="success">Başarı</Badge>
          <Badge variant="warning">Uyarı</Badge>
          <Badge variant="info">Bilgi</Badge>
          <Badge variant="destructive">Hata</Badge>
          <Badge variant="outline">Dış Hatlı</Badge>
        </Section>

        <Section title="Form kontrolleri">
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-email">E-posta</Label>
              <Input id="demo-email" type="email" placeholder="you@kentos.io" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="demo-switch" defaultChecked />
                <Label htmlFor="demo-switch">Bildirimler</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="demo-check" defaultChecked />
                <Label htmlFor="demo-check">Abone Ol</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ses</Label>
              <Slider defaultValue={[60]} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Kullanılan depolama</Label>
              <Progress value={72} />
            </div>
            <Select defaultValue="m">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="s">Küçük</SelectItem>
                <SelectItem value="m">Orta</SelectItem>
                <SelectItem value="l">Büyük</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Katmanlar ve açılır pencereler">
          <div className="w-full space-y-4">
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">İletişim kutusunu aç</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Profili düzenle</DialogTitle>
                    <DialogDescription>
                      Profilinizde değişiklikleri buradan yapın. İşiniz bittiğinde kaydete tıklayın.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="dlg-name">İsim</Label>
                    <Input id="dlg-name" defaultValue="Cihad G." />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">İptal</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button>Değişiklikleri kaydet</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Favori">
                    <Heart />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Favorilere ekle</TooltipContent>
              </Tooltip>

              <div className="flex -space-x-2">
                {['CG', 'MP', 'LT'].map((i) => (
                  <Avatar key={i} className="ring-2 ring-background">
                    <AvatarFallback className="bg-primary/15 text-primary">
                      {i}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            <Separator />

            <Accordion type="single" collapsible defaultValue="a">
              <AccordionItem value="a">
                <AccordionTrigger>Bu şablon nedir?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Tutarlı bir görünüm ve hisse sahip herhangi bir dahili araç oluşturmak için klonlayabileceğiniz belirteç (token) odaklı bir uygulama kabuğudur.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Tema desteği var mı?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Tamamen — renkleri, köşe yuvarlığını, yazı tipini, boşlukları ve gölgeleri canlı olarak değiştirmek için uygulama çubuğundaki palet simgesine tıklayın.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Section>

        <Section title="Sekmeler" description="Segmentli gezinti">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview">
                <Star /> Genel Bakış
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark /> Kaydedilenler
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 /> Ayarlar
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="overview"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Genel bakış içeriği — metrikler ve özetler burada bulunur.
            </TabsContent>
            <TabsContent
              value="saved"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Kaydedilen öğeler bu sekmede görünür.
            </TabsContent>
            <TabsContent
              value="settings"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Bölüme özel ayarlar buraya gelir.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Renk belirteçleri" description="Anlamsal yüzeyler">
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Arka Plan', 'bg-background border'],
              ['Kart', 'bg-card border'],
              ['Sönük', 'bg-muted'],
              ['Birincil', 'bg-primary'],
              ['İkincil', 'bg-secondary'],
              ['Vurgu', 'bg-accent'],
              ['Yıkıcı', 'bg-destructive'],
              ['Başarı', 'bg-success'],
              ['Uyarı', 'bg-warning'],
            ].map(([name, cls]) => (
              <div key={name} className="space-y-1">
                <div className={`h-10 rounded-lg ${cls}`} />
                <p className="text-2xs text-muted-foreground">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Toast" description="Geçici bildirimler (sonner)">
          <ToastDemo />
        </Section>

        <Section title="Bağlam menüsü" description="Sağ tık eylemleri">
          <ContextMenuDemo />
        </Section>

        <Section title="Çekmece" description="Sürükleme kulplu, kaydırılabilir panel (vaul)">
          <DrawerDemo />
        </Section>

        <Section
          title="Liste görünümü"
          description="Profil resmi, meta bilgiler ve satır eylemleri içeren satırlar"
        >
          <ListViewDemo />
        </Section>

        <Section title="Ağaç Görünümü" description="Dosya gezgini tarzında gezinti">
          <TreeDemo />
        </Section>

        <Section
          title="Tablo"
          description="Alt bilgi toplamları içeren seçilebilir veri tablosu"
          className="lg:col-span-2"
        >
          <TableDemo />
        </Section>
      </div>
    </PageWrapper>
  )
}

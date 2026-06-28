# Bileşen Kataloğu (Component Catalog)

> **Önce bu dosyaya bak.** Bir arayüz parçası (buton, dialog, tablo, form alanı…)
> gerektiğinde **önce buradaki mevcut bileşenleri kullan**. İhtiyacın olan burada
> **yoksa**, ancak o zaman yeni/özel bir bileşen üret — ve eklediğinde bu listeyi
> güncelle.
>
> Kurallar (bkz. `../../DESIGN.md`):
> - shadcn/ui (new-york) + Radix primitifleri; ikonlar `lucide-react`.
> - Asla token'ın ifade edebileceği bir değeri sabit yazma; renk/boşluk/radius
>   hep `src/index.css` token'larından gelir.
> - Sınıfları `cn()` (`@/lib/utils`) ile birleştir. Her primitif kökünde
>   `data-slot` taşır — düzenlerken koru.
> - Yeni primitif: `forwardRef` yok (React 19 `ref`'i prop olarak geçer);
>   `React.ComponentProps<...>` alıp `{...props}` yay; çok varyantlı ise `cva`.

## UI primitifleri — `src/components/ui/`

Import: `@/components/ui/<dosya>`.

| Bileşen | Ana export(lar) | Ne için |
| ------- | --------------- | ------- |
| `accordion` | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Katlanır içerik bölümleri (ör. SSS) |
| `audit-trail` | `AuditTrail` (`logs: AuditLogDto[]`) | Varlık değişikliklerinin zaman çizelgesi; genişletilebilir alan diff'i. Varlık detay sayfalarında `EntityAuditTrail` (modules/iam) ile kendi kendine veri çeker |
| `avatar` | `Avatar`, `AvatarImage`, `AvatarFallback` | Kullanıcı/öğe avatarı, baş harf fallback'i |
| `badge` | `Badge` (`variant`: default/secondary/outline/success/warning/info/destructive) | Durum/etiket rozeti |
| `breadcrumb` | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` | Sayfa kırıntısı (app-bar'da kullanılır) |
| `button` | `Button` (`variant`: default/secondary/outline/ghost/link/destructive; `size`: default/sm/lg/icon/icon-sm) | Tüm tıklanabilir aksiyonlar |
| `button-group` | `ButtonGroup` | Bitişik (segment) buton grubu; içine `Button`'lar koyun (genelde `variant="outline"`) |
| `calendar` | `Calendar` (react-day-picker, tr; `mode` single/range) | Takvim / gün seçimi (genelde `date-range-picker` içinde) |
| `card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | İçerik kartı/panel |
| `checkbox` | `Checkbox` (`checked`, `onCheckedChange`) | Tekil onay kutusu, çoklu seçim |
| `collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Aç/kapa tekil bölüm |
| `command` | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem`, `CommandGroup`, `CommandEmpty`, `CommandSeparator`, `CommandShortcut` | Komut paleti / aranabilir liste (⌘K) |
| `context-menu` | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, … | Sağ tık menüsü |
| `date-range-picker` | `DateRangePicker` (`value`, `onChange`, `presets`, `min`/`max`), `defaultDateRangePresets`, `DateRange` | Tarih aralığı seçimi; solda hazır seçimler (son 7 gün, bu ay…), filtrelerde kullanılır |
| `dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | Modal pencere (form/onay) |
| `drawer` | `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerFooter` | Alttan/yandan kayan panel (vaul) |
| `dropdown-menu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuShortcut` | Açılır menü (kullanıcı menüsü vb.) |
| `filter-bar` | `FilterBar` (`activeCount`, `onClear`, `defaultOpen`, `headerClassName`), `FilterField` (`label`) | Liste/tablo filtreleri için katlanır, şık kapsayıcı (varsayılan kapalı; aktif filtre sayısı + Temizle) |
| `input` | `Input` | Tek satır metin/şifre/email girişi |
| `iban-input` | `IbanInput` | Otomatik formatlı TR IBAN giriş alanı (TRxx xxxx...) |
| `kbd` | `Kbd` | Klavye kısayolu rozeti |
| `label` | `Label` | Form alanı etiketi (`htmlFor`) |
| `popover` | `Popover`, `PopoverTrigger`, `PopoverContent` | Konumlu açılır içerik |
| `progress` | `Progress` (`value`) | İlerleme çubuğu |
| `scroll-area` | `ScrollArea`, `ScrollBar` | Özel kaydırma alanı |
| `select` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` | Açılır tek seçim |
| `separator` | `Separator` (`orientation`) | Yatay/dikey ayraç |
| `sheet` | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` | Kenardan açılan panel (mobil menü, ayarlar) |
| `skeleton` | `Skeleton` | Yükleniyor iskeleti |
| `slider` | `Slider` (`value`, `onValueChange`) | Aralık/değer kaydırıcı |
| `sonner` | `Toaster` | Toast bildirim host'u (kullanım: `import { toast } from 'sonner'`) |
| `switch` | `Switch` (`checked`, `onCheckedChange`) | Aç/kapa anahtarı (boolean) |
| `table` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableFooter`, `TableCaption` | Veri tablosu (liste sayfaları) |
| `tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Sekmeler |
| `textarea` | `Textarea` | Çok satırlı metin girişi |
| `toggle` | `Toggle` | Tekil aç/kapa düğme |
| `toggle-group` | `ToggleGroup`, `ToggleGroupItem` | Segment/çoklu toggle |
| `tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent` (`TooltipProvider` main.tsx'te global) | İpucu balonu |
| `tree` | `Tree`, `TreeItem` | Ağaç/iç içe liste (sidebar nav) |

## Düzen (layout) bileşenleri — `src/components/layout/`

Uygulama kabuğu; çoğu yalnızca `AppShell` içinde kullanılır.

| Bileşen | Ne için |
| ------- | ------- |
| `app-shell` | Tüm kabuğu kurar (rail + sidebar + app-bar + içerik + footer) ve layout context'ini sağlar |
| `module-rail` | En soldaki dikey **modül rayı**; modüller arası geçiş (`src/modules/registry.ts`) + altta yardım/geri bildirim |
| `module-launcher` | Modülleri grid olarak gösteren launcher (mobilde modül değiştirme; sidebar başlığındaki buton açar) |
| `sidebar` / `sidebar-nav` | Aktif modülün gezinti ağacı (arama + daraltılabilir) |
| `app-bar` | Üst çubuk: breadcrumb, ⌘K arama, tema/bildirim/mod/kullanıcı |
| `app-breadcrumb` | Aktif modül nav'ından türeyen kırıntı |
| `command-launcher` | ⌘K komut paleti (modüller + gezinti + eylemler) |
| `page` | **`PageWrapper`, `PageHeader`, `PageActions`, `PageFooter`, `PageFooterStat`** — sayfa iskeleti (her sayfa bunu kullanır) |
| `footer` | Alt durum çubuğu |
| `user-menu` | Avatar açılır menüsü (profil, çıkış) |
| `mode-toggle` | Açık/koyu/sistem modu |
| `notifications` | Bildirim popover'ı |
| `feedback-dialog` | "Geri bildirim gönder" dialogu |
| `ai-chat` | Sağ alt yüzen AI sohbet FAB'ı |

## Diğer — `src/components/`

| Bileşen | Ne için |
| ------- | ------- |
| `full-page-loader` | `FullPageLoader` — tam sayfa yükleniyor durumu (auth çözümlenirken) |
| `theme-customizer` | `ThemeCustomizer` — renk/tipografi/boşluk/gölge ayar paneli |
| `lookup-select` | `LookupSelect` — verilen `list`'i (örn. "birim") otomatik çeken key/value combobox; `lookups.write` varsa yanında satır-içi "+" ile yeni değer ekler. `<LookupSelect list="birim" value={v} onChange={setV} />` |

## Yeni bileşen eklerken

1. Genel bir primitif mi? `ui/` altına shadcn kurallarıyla ekle, bu tabloya yaz.
2. Bir modüle özel mi? Bileşeni o modülün altına koy
   (`src/modules/<modul>/...`), genel `ui/` primitiflerinden besle.
3. Sayfa düzeni her zaman `layout/page` (`PageWrapper`/`PageHeader`) ile başlasın.

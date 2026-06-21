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
          toast('Event created', { description: 'Friday, June 21 · 10:00 AM' })
        }
      >
        Default
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success('Changes saved', { description: 'Your edits are live.' })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error('Save failed', { description: 'Please try again.' })
        }
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info('Update available', { description: 'v2.5.0 is ready.' })
        }
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast('Invitation sent', {
            description: 'mira@acme.io',
            action: { label: 'Undo', onClick: () => toast('Reverted') },
          })
        }
      >
        With action
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1600)),
            {
              loading: 'Uploading…',
              success: 'File uploaded',
              error: 'Upload failed',
            },
          )
        }
      >
        Promise
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
          Right-click anywhere here
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem>
          <Copy /> Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <Pencil /> Rename
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Share2 /> Share
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Copy link</ContextMenuItem>
            <ContextMenuItem>Email</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={bookmarked}
          onCheckedChange={(v) => setBookmarked(Boolean(v))}
        >
          Bookmarked
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value={view} onValueChange={setView}>
          <ContextMenuLabel inset>View as</ContextMenuLabel>
          <ContextMenuRadioItem value="grid">Grid</ContextMenuRadioItem>
          <ContextMenuRadioItem value="list">List</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">
          <Trash2 /> Delete <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/* ------------------------------ Drawer demo ---------------------------- */
const DRAWER_FILTERS = ['Active', 'Archived', 'Starred', 'Shared with me']

function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Filter results</DrawerTitle>
            <DrawerDescription>
              Drag the handle or swipe down to dismiss.
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
            <Button>Apply filters</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/* ----------------------------- List view ------------------------------ */
const PEOPLE = [
  { name: 'Mira Patel', role: 'Product Designer', initials: 'MP', online: true },
  { name: 'Leo Tan', role: 'Frontend Engineer', initials: 'LT', online: true },
  { name: 'Ava Reed', role: 'Operations Lead', initials: 'AR', online: false },
  { name: 'Noah Kim', role: 'Data Analyst', initials: 'NK', online: false },
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
            {p.online ? 'Online' : 'Away'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 /> Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 /> Remove
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
      onSelect={(n) => toast(`Opened ${n.label}`)}
      className="w-full"
    />
  )
}

/* -------------------------------- Table ------------------------------- */
const INVOICES = [
  { id: 'INV-001', customer: 'Northwind', status: 'Paid', amount: '$1,200' },
  { id: 'INV-002', customer: 'Globex', status: 'Pending', amount: '$2,400' },
  { id: 'INV-003', customer: 'Initech', status: 'Overdue', amount: '$640' },
  { id: 'INV-004', customer: 'Umbrella', status: 'Paid', amount: '$580' },
]

function statusVariant(status: string) {
  if (status === 'Paid') return 'success' as const
  if (status === 'Pending') return 'warning' as const
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
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
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
                aria-label={`Select ${inv.id}`}
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
              <Button variant="ghost" size="icon-sm" aria-label="Row menu">
                <MoreHorizontal />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Total</TableCell>
          <TableCell className="text-right">$4,820</TableCell>
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
        title="Components"
        description="Living reference of the design-system primitives. Everything here reacts to the active theme."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Buttons" description="Variants & sizes">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="Settings">
            <Settings2 />
          </Button>
        </Section>

        <Section title="Badges" description="Status & semantic tones">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="destructive">Error</Badge>
          <Badge variant="outline">Outline</Badge>
        </Section>

        <Section title="Form controls">
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-email">Email</Label>
              <Input id="demo-email" type="email" placeholder="you@acme.io" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="demo-switch" defaultChecked />
                <Label htmlFor="demo-switch">Notifications</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="demo-check" defaultChecked />
                <Label htmlFor="demo-check">Subscribe</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Volume</Label>
              <Slider defaultValue={[60]} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Storage used</Label>
              <Progress value={72} />
            </div>
            <Select defaultValue="m">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="s">Small</SelectItem>
                <SelectItem value="m">Medium</SelectItem>
                <SelectItem value="l">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Overlays & disclosure">
          <div className="w-full space-y-4">
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your profile here. Click save when you're
                      done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="dlg-name">Name</Label>
                    <Input id="dlg-name" defaultValue="Cihad G." />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button>Save changes</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Favorite">
                    <Heart />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add to favorites</TooltipContent>
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
                <AccordionTrigger>What is this template?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  A token-driven app shell you can clone to build any internal
                  tool with a consistent look and feel.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Is it themeable?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Fully — open the palette icon in the app bar to change colors,
                  radius, typography, spacing, and elevation live.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Section>

        <Section title="Tabs" description="Segmented navigation">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview">
                <Star /> Overview
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark /> Saved
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 /> Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="overview"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Overview content — metrics and summaries live here.
            </TabsContent>
            <TabsContent
              value="saved"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Saved items appear in this tab.
            </TabsContent>
            <TabsContent
              value="settings"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              Per-section settings go here.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Color tokens" description="Semantic surfaces">
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Background', 'bg-background border'],
              ['Card', 'bg-card border'],
              ['Muted', 'bg-muted'],
              ['Primary', 'bg-primary'],
              ['Secondary', 'bg-secondary'],
              ['Accent', 'bg-accent'],
              ['Destructive', 'bg-destructive'],
              ['Success', 'bg-success'],
              ['Warning', 'bg-warning'],
            ].map(([name, cls]) => (
              <div key={name} className="space-y-1">
                <div className={`h-10 rounded-lg ${cls}`} />
                <p className="text-2xs text-muted-foreground">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Toast" description="Transient notifications (sonner)">
          <ToastDemo />
        </Section>

        <Section title="Context menu" description="Right-click actions">
          <ContextMenuDemo />
        </Section>

        <Section title="Drawer" description="Swipeable sheet with drag handle (vaul)">
          <DrawerDemo />
        </Section>

        <Section
          title="List view"
          description="Rows with avatar, meta & row actions"
        >
          <ListViewDemo />
        </Section>

        <Section title="Tree" description="File-explorer navigation">
          <TreeDemo />
        </Section>

        <Section
          title="Table"
          description="Selectable data table with footer totals"
          className="lg:col-span-2"
        >
          <TableDemo />
        </Section>
      </div>
    </PageWrapper>
  )
}

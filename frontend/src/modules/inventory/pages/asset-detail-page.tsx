import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Settings2, Trash2, UserPlus, Undo2, ArrowLeftRight, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  ASSET_ASSIGNMENT_STATUS_LABELS,
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPE_LABELS,
  ASSET_STATUS_LABELS,
  ASSET_TRANSFER_STATUS_LABELS,
  ASSET_VEHICLE_LOG_KIND_LABELS,
  FilesPermissions,
  InventoryPermissions,
  toApiError,
  type AssetAssignmentDto,
  type AssetDto,
  type AssetMaintenanceDto,
  type AssetVehicleLogDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { FileManager } from '@/modules/files/components/file-manager'
import { AssetDialog } from '../components/asset-dialog'
import { AssignDialog } from '../components/assign-dialog'
import { TransferDialog } from '../components/transfer-dialog'
import { ChangeStatusDialog } from '../components/change-status-dialog'
import { MaintenanceDialog } from '../components/maintenance-dialog'
import { VehicleLogDialog } from '../components/vehicle-log-dialog'
import { money } from '../labels'

const ROUTE = '/_authed/inventory/assets/$id'

export function AssetDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canWrite = hasPermission(InventoryPermissions.assetsWrite)

  const query = useQuery({
    queryKey: ['inventory', 'assets', id],
    queryFn: () => api.inventory.assets.get(id),
    enabled: canRead,
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)

  const asset = query.data
  const refetch = () => {
    void qc.invalidateQueries({ queryKey: ['inventory', 'assets', id] })
    void qc.invalidateQueries({ queryKey: ['inventory', 'assets'] })
  }

  return (
    <PermissionRequired permission={InventoryPermissions.assetsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !asset ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={asset.id} name={`${asset.code} · ${asset.name}`} />
            <PageHeader
              title={`${asset.code} · ${asset.name}`}
              description={[
                ASSET_STATUS_LABELS[asset.status],
                asset.currentEmployeeName ? `Zimmet: ${asset.currentEmployeeName}` : null,
                asset.isVehicle ? 'Araç' : null,
              ].filter(Boolean).join(' · ')}
              audit={{ entityType: 'Asset', entityId: asset.id, title: 'Demirbaş denetim kaydı' }}
              actions={
                <div className="flex gap-2">
                  {canWrite ? (
                    <Button size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil />
                      Düzenle
                    </Button>
                  ) : null}
                  {canWrite ? (
                    <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
                      <Settings2 />
                      Durum İşlemleri
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/inventory/assets">
                      <ArrowLeft />
                      Demirbaşlar
                    </Link>
                  </Button>
                </div>
              }
            />

            <AssetTabs asset={asset} refetch={refetch} />

            <AssetDialog open={editOpen} onOpenChange={setEditOpen} editing={asset} onSaved={refetch} />
            <ChangeStatusDialog open={statusOpen} onOpenChange={setStatusOpen} asset={asset} onSaved={refetch} />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function AssetTabs({ asset, refetch }: { asset: AssetDto; refetch: () => void }) {
  const { hasPermission } = useAuth()
  const canFiles = hasPermission(FilesPermissions.write)

  return (
    <Tabs defaultValue="genel" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="genel">Genel</TabsTrigger>
        <TabsTrigger value="zimmet">Zimmet</TabsTrigger>
        <TabsTrigger value="bakim">Bakım/Onarım</TabsTrigger>
        {asset.isVehicle ? <TabsTrigger value="arac">Araç (KM & Yakıt)</TabsTrigger> : null}
        <TabsTrigger value="fotograflar">Fotoğraflar</TabsTrigger>
      </TabsList>

      <TabsContent value="genel">
        <Overview asset={asset} />
      </TabsContent>

      <TabsContent value="zimmet">
        <ZimmetTab asset={asset} refetch={refetch} />
      </TabsContent>

      <TabsContent value="bakim">
        <MaintenanceTab asset={asset} />
      </TabsContent>

      {asset.isVehicle ? (
        <TabsContent value="arac">
          <VehicleTab asset={asset} />
        </TabsContent>
      ) : null}

      <TabsContent value="fotograflar">
        <Card>
          <CardHeader><CardTitle className="text-sm">Fotoğraflar</CardTitle></CardHeader>
          <CardContent>
            <FileManager entityType="Asset" entityId={asset.id} kind="image" canWrite={canFiles} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// --- Genel -----------------------------------------------------------------
function Overview({ asset }: { asset: AssetDto }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">Genel</CardTitle>
          <Badge variant={asset.isActive ? 'success' : 'outline'}>{asset.isActive ? 'Aktif' : 'Pasif'}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Kod" value={asset.code} mono />
          <Field label="Durum" value={ASSET_STATUS_LABELS[asset.status]} />
          <Field label="Barkod" value={asset.barcode || '—'} mono />
          <Field label="Seri no" value={asset.serialNo || '—'} mono />
          <Field label="Marka" value={asset.brand || '—'} />
          <Field label="Model" value={asset.model || '—'} />
          <Field label="Zimmet" value={asset.currentEmployeeName || '—'} />
          <Field label="Notlar" value={asset.notes || '—'} full />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Satınalma & Garanti</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Satınalma tarihi" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : '—'} />
          <Field label="Satınalma değeri" value={money(asset.purchaseValue, asset.currency)} />
          <Field label="Garanti bitiş" value={asset.warrantyEnd ? formatDate(asset.warrantyEnd) : '—'} />
          <Field label="Para birimi" value={asset.currency} />
          <Field label="Oluşturma" value={formatDateTime(asset.createdAt)} />
          <Field label="Güncelleme" value={formatDateTime(asset.updatedAt)} />
        </CardContent>
      </Card>

      {asset.isVehicle ? (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Araç bilgileri</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
            <Field label="Plaka" value={asset.plate || '—'} mono />
            <Field label="Şasi no" value={asset.chassisNo || '—'} mono />
            <Field label="Motor no" value={asset.engineNo || '—'} mono />
            <Field label="Model yılı" value={asset.modelYear == null ? '—' : String(asset.modelYear)} />
            <Field label="Güncel km" value={asset.currentOdometer == null ? '—' : asset.currentOdometer.toLocaleString('tr-TR')} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// --- Zimmet ----------------------------------------------------------------
function ZimmetTab({ asset, refetch }: { asset: AssetDto; refetch: () => void }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canAssign = hasPermission(InventoryPermissions.assetsAssign)

  const [assignOpen, setAssignOpen] = React.useState(false)
  const [transferOpen, setTransferOpen] = React.useState(false)

  const assignmentsQuery = useQuery({
    queryKey: ['inventory', 'asset-assignments', asset.id],
    queryFn: () => api.inventory.assetAssignments.list({ assetId: asset.id }),
    enabled: canRead,
  })
  const transfersQuery = useQuery({
    queryKey: ['inventory', 'asset-transfers', asset.id],
    queryFn: () => api.inventory.assetTransfers.list({ assetId: asset.id, status: 'pending' }),
    enabled: canRead,
  })

  const onSaved = () => {
    void qc.invalidateQueries({ queryKey: ['inventory', 'asset-assignments', asset.id] })
    void qc.invalidateQueries({ queryKey: ['inventory', 'asset-transfers', asset.id] })
    refetch()
  }

  const returnMutation = useMutation({
    mutationFn: () => api.inventory.assetAssignments.returnAsset(asset.id, {}),
    onSuccess: () => {
      toast.success('Demirbaş iade alındı')
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: (transferId: string) => api.inventory.assetTransfers.cancel(transferId),
    onSuccess: () => {
      toast.success('Devir iptal edildi')
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const isAssigned = !!asset.currentEmployeeId

  const ledgerColumns: ColumnDef<AssetAssignmentDto>[] = [
    { id: 'employee', accessorKey: 'employeeName', header: 'Personel', size: 200, cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span> },
    { id: 'status', accessorFn: (a) => ASSET_ASSIGNMENT_STATUS_LABELS[a.status], header: 'Durum', size: 130, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'outline'}>{ASSET_ASSIGNMENT_STATUS_LABELS[row.original.status]}</Badge> },
    { id: 'assignedAt', accessorFn: (a) => a.assignedAt, header: 'Zimmet tarihi', size: 170, cell: ({ row }) => formatDateTime(row.original.assignedAt) },
    { id: 'returnedAt', accessorFn: (a) => a.returnedAt ?? '', header: 'İade/Kapanış', size: 170, cell: ({ row }) => row.original.returnedAt ? formatDateTime(row.original.returnedAt) : '—' },
    { id: 'assignedBy', accessorFn: (a) => a.assignedByName ?? '', header: 'Veren', size: 160, cell: ({ row }) => row.original.assignedByName ?? '—' },
  ]

  const pendingTransfers = transfersQuery.data ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">Mevcut zimmet</CardTitle>
          {canAssign ? (
            <div className="flex gap-2">
              {isAssigned ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending}>
                    <Undo2 />
                    İade Al
                  </Button>
                  <Button size="sm" onClick={() => setTransferOpen(true)}>
                    <ArrowLeftRight />
                    Devret
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <UserPlus />
                  Zimmet Ver
                </Button>
              )}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {isAssigned ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Şu an demirbaş </span>
              <span className="font-medium">{asset.currentEmployeeName}</span>
              <span className="text-muted-foreground"> zimmetinde.</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Demirbaş şu an kimseye zimmetli değil (depoda).</p>
          )}
        </CardContent>
      </Card>

      {pendingTransfers.length ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Bekleyen devirler</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingTransfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex flex-col">
                  <span>
                    <span className="text-muted-foreground">Kod: </span>
                    <span className="font-mono">{t.token}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ASSET_TRANSFER_STATUS_LABELS[t.status]}
                    {t.toEmployeeName ? ` · Hedef: ${t.toEmployeeName}` : ''}
                    {t.expiresAt ? ` · Bitiş: ${formatDateTime(t.expiresAt)}` : ''}
                  </span>
                </div>
                {canAssign ? (
                  <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(t.id)} disabled={cancelMutation.isPending}>
                    <X className="size-4" />
                    İptal
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-sm">Zimmet geçmişi</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            gridId="inventory.asset-assignments"
            data={assignmentsQuery.data ?? []}
            columns={ledgerColumns}
            getRowId={(a) => a.id}
            loading={assignmentsQuery.isLoading}
            emptyText="Zimmet kaydı yok."
            pagination={false}
          />
        </CardContent>
      </Card>

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} assetId={asset.id} onSaved={onSaved} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} assetId={asset.id} onSaved={onSaved} />
    </div>
  )
}

// --- Bakım/Onarım ----------------------------------------------------------
function MaintenanceTab({ asset }: { asset: AssetDto }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canMaintain = hasPermission(InventoryPermissions.assetsMaintain)

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AssetMaintenanceDto | null>(null)

  const listQuery = useQuery({
    queryKey: ['inventory', 'asset-maintenance', asset.id],
    queryFn: () => api.inventory.assetMaintenance.list({ assetId: asset.id }),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory', 'asset-maintenance', asset.id] })

  const deleteMutation = useMutation({
    mutationFn: (mid: string) => api.inventory.assetMaintenance.remove(mid),
    onSuccess: () => {
      toast.success('Kayıt silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<AssetMaintenanceDto>[] = [
    { id: 'date', accessorFn: (m) => m.date, header: 'Tarih', size: 120, cell: ({ row }) => formatDate(row.original.date) },
    { id: 'type', accessorFn: (m) => ASSET_MAINTENANCE_TYPE_LABELS[m.type], header: 'Tür', size: 120, enableGrouping: true, cell: ({ row }) => <Badge variant="secondary">{ASSET_MAINTENANCE_TYPE_LABELS[row.original.type]}</Badge> },
    { id: 'status', accessorFn: (m) => ASSET_MAINTENANCE_STATUS_LABELS[m.status], header: 'Durum', size: 130, enableGrouping: true, cell: ({ row }) => ASSET_MAINTENANCE_STATUS_LABELS[row.original.status] },
    { id: 'cost', accessorKey: 'cost', header: 'Maliyet', size: 120, cell: ({ row }) => <span className="tabular-nums">{money(row.original.cost, row.original.currency)}</span> },
    { id: 'odometer', accessorFn: (m) => m.odometer ?? '', header: 'Km', size: 100, cell: ({ row }) => row.original.odometer == null ? '—' : row.original.odometer.toLocaleString('tr-TR') },
    { id: 'description', accessorFn: (m) => m.description ?? '', header: 'Açıklama', size: 240, cell: ({ row }) => <span className="text-muted-foreground">{row.original.description || '—'}</span> },
    ...(canMaintain
      ? [{
          id: 'actions', header: '', size: 70, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }: { row: { original: AssetMaintenanceDto } }) => (
            <div className="flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Kayıt silinsin mi?')) deleteMutation.mutate(row.original.id) }} aria-label="Sil">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ),
        } as ColumnDef<AssetMaintenanceDto>]
      : []),
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <DataGrid
          gridId="inventory.asset-maintenance"
          data={listQuery.data ?? []}
          columns={columns}
          getRowId={(m) => m.id}
          loading={listQuery.isLoading}
          onRowClick={canMaintain ? (m) => { setEditing(m); setOpen(true) } : undefined}
          emptyText="Bakım kaydı yok."
          pagination={false}
          toolbar={canMaintain ? <Button onClick={() => { setEditing(null); setOpen(true) }}><Plus />Bakım Ekle</Button> : null}
        />
      </CardContent>
      <MaintenanceDialog open={open} onOpenChange={setOpen} assetId={asset.id} editing={editing} isVehicle={asset.isVehicle} onSaved={invalidate} />
    </Card>
  )
}

// --- Araç (KM & Yakıt) -----------------------------------------------------
function VehicleTab({ asset }: { asset: AssetDto }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canMaintain = hasPermission(InventoryPermissions.assetsMaintain)

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AssetVehicleLogDto | null>(null)

  const listQuery = useQuery({
    queryKey: ['inventory', 'asset-vehicle-logs', asset.id],
    queryFn: () => api.inventory.assetVehicleLogs.list({ assetId: asset.id }),
    enabled: canRead,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['inventory', 'asset-vehicle-logs', asset.id] })
    void qc.invalidateQueries({ queryKey: ['inventory', 'assets', asset.id] })
  }

  const deleteMutation = useMutation({
    mutationFn: (lid: string) => api.inventory.assetVehicleLogs.remove(lid),
    onSuccess: () => {
      toast.success('Kayıt silindi')
      invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<AssetVehicleLogDto>[] = [
    { id: 'date', accessorFn: (l) => l.date, header: 'Tarih', size: 120, cell: ({ row }) => formatDate(row.original.date) },
    { id: 'kind', accessorFn: (l) => ASSET_VEHICLE_LOG_KIND_LABELS[l.kind], header: 'Tür', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant="secondary">{ASSET_VEHICLE_LOG_KIND_LABELS[row.original.kind]}</Badge> },
    { id: 'odometer', accessorKey: 'odometer', header: 'Km', size: 110, cell: ({ row }) => <span className="tabular-nums">{row.original.odometer.toLocaleString('tr-TR')}</span> },
    { id: 'liters', accessorFn: (l) => l.liters ?? '', header: 'Litre', size: 90, cell: ({ row }) => row.original.liters == null ? '—' : <span className="tabular-nums">{row.original.liters}</span> },
    { id: 'unitPrice', accessorFn: (l) => l.unitPrice ?? '', header: 'Birim', size: 100, cell: ({ row }) => row.original.unitPrice == null ? '—' : <span className="tabular-nums">{money(row.original.unitPrice, row.original.currency)}</span> },
    { id: 'totalCost', accessorFn: (l) => l.totalCost ?? '', header: 'Tutar', size: 110, cell: ({ row }) => row.original.totalCost == null ? '—' : <span className="tabular-nums">{money(row.original.totalCost, row.original.currency)}</span> },
    { id: 'isFull', accessorKey: 'isFull', header: 'Full', size: 70, cell: ({ row }) => row.original.kind === 'yakit' ? (row.original.isFull ? 'Evet' : 'Hayır') : '—' },
    { id: 'station', accessorFn: (l) => l.station ?? '', header: 'İstasyon', size: 140, cell: ({ row }) => <span className="text-muted-foreground">{row.original.station || '—'}</span> },
    { id: 'driver', accessorFn: (l) => l.driverEmployeeName ?? '', header: 'Sürücü', size: 150, cell: ({ row }) => <span className="text-muted-foreground">{row.original.driverEmployeeName || '—'}</span> },
    ...(canMaintain
      ? [{
          id: 'actions', header: '', size: 70, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }: { row: { original: AssetVehicleLogDto } }) => (
            <div className="flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Kayıt silinsin mi?')) deleteMutation.mutate(row.original.id) }} aria-label="Sil">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ),
        } as ColumnDef<AssetVehicleLogDto>]
      : []),
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">
          Güncel kilometre: {asset.currentOdometer == null ? '—' : asset.currentOdometer.toLocaleString('tr-TR')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGrid
          gridId="inventory.asset-vehicle-logs"
          data={listQuery.data ?? []}
          columns={columns}
          getRowId={(l) => l.id}
          loading={listQuery.isLoading}
          onRowClick={canMaintain ? (l) => { setEditing(l); setOpen(true) } : undefined}
          emptyText="Kayıt yok."
          pagination={false}
          toolbar={canMaintain ? <Button onClick={() => { setEditing(null); setOpen(true) }}><Plus />Kayıt Ekle</Button> : null}
        />
      </CardContent>
      <VehicleLogDialog open={open} onOpenChange={setOpen} assetId={asset.id} editing={editing} onSaved={invalidate} />
    </Card>
  )
}

// --- shared bits -----------------------------------------------------------
function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  useRegisterBreadcrumbLabel(`/inventory/assets/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Demirbaş bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/inventory/assets' })}>
        <ArrowLeft />
        Demirbaşlara dön
      </Button>
    </div>
  )
}

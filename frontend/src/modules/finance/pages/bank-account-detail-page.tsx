import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, FileText, Landmark, Pencil, Plus, Trash2, Coins, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { FinancePermissions, FilesPermissions, toApiError, type FinanceTransactionDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate, formatDateTime, formatTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { FileManager } from '@/modules/files/components/file-manager'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { BankAccountDialog } from '../components/bank-account-dialog'
import { FinanceTransactionDialog } from '../components/finance-transaction-dialog'
import { formatMoney } from './cash-accounts-page'
import { formatIbanForDisplay } from './bank-accounts-page'

const ROUTE = '/_authed/finance/bank-accounts/$id'

export function BankAccountDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(FinancePermissions.bankAccountsRead)
  const canWrite = hasPermission(FinancePermissions.bankAccountsWrite)
  const canTxRead = hasPermission(FinancePermissions.transactionsRead)
  const canTxWrite = hasPermission(FinancePermissions.transactionsWrite)
  const canFiles = hasPermission(FilesPermissions.write)

  const query = useQuery({
    queryKey: ['finance', 'bank-accounts', id],
    queryFn: () => api.finance.bankAccounts.get(id),
    enabled: canRead,
  })

  const txQuery = useQuery({
    queryKey: ['finance', 'transactions', { bankAccountId: id }],
    queryFn: () => api.finance.transactions.list({ bankAccountId: id }),
    enabled: canTxRead,
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [txOpen, setTxOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<FinanceTransactionDto | null>(null)

  const bankAccount = query.data
  useRegisterBreadcrumbLabel(id, bankAccount?.name ?? 'Hesap Detayı')

  const totalIn = txQuery.data?.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0) ?? 0
  const totalOut = txQuery.data?.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0) ?? 0

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['finance', 'bank-accounts', id] })
    void qc.invalidateQueries({ queryKey: ['finance', 'transactions', { bankAccountId: id }] })
  }

  const txDeleteMutation = useMutation({
    mutationFn: (txId: string) => api.finance.transactions.remove(txId),
    onSuccess: () => {
      toast.success('İşlem silindi')
      invalidate()
    },
    onError: (e) => {
      toast.error('İşlem silinemedi', { description: toApiError(e).message })
    },
  })

  const handleCreateTx = () => {
    setEditingTx(null)
    setTxOpen(true)
  }

  const handleEditTx = (row: FinanceTransactionDto) => {
    setEditingTx(row)
    setTxOpen(true)
  }

  const handleDeleteTx = (row: FinanceTransactionDto) => {
    if (confirm('Bu işlem kaydı silinsin mi?')) {
      txDeleteMutation.mutate(row.id)
    }
  }

  const txColumns: ColumnDef<FinanceTransactionDto>[] = [
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Tarih',
      size: 160,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div className="leading-tight">
            <div>{formatDate(row.original.date)}</div>
            <div className="text-2xs tabular-nums text-muted-foreground">{formatTime(row.original.createdAt)}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'İşlem Tipi',
      size: 130,
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'in' ? 'success' : 'destructive'}>
          {row.original.type === 'in' ? 'Giriş (Tahsilat)' : 'Çıkış (Ödeme)'}
        </Badge>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Tutar',
      size: 150,
      cell: ({ row }) => (
        <span className={`font-mono font-medium ${row.original.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
          {row.original.type === 'in' ? '+' : '-'} {formatMoney(row.original.amount, bankAccount?.currency)}
        </span>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Açıklama',
      size: 300,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.description || '—'}</span>
      ),
    },
    ...(canTxWrite
      ? [
          {
            id: 'actions',
            header: '',
            size: 90,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditTx(row.original)
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTx(row.original)
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<FinanceTransactionDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={FinancePermissions.bankAccountsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !bankAccount ? (
          <div className="py-12 text-center text-muted-foreground">Banka hesabı bulunamadı.</div>
        ) : (
          <>
            <PageHeader
              title={bankAccount.name}
              description={
                <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1 mt-1 text-sm">
                  <span>{bankAccount.bankName} - {bankAccount.currency} Hesabı</span>
                  <span className="font-mono text-muted-foreground select-all bg-muted px-1.5 py-0.5 rounded text-xs" title={bankAccount.iban}>
                    {formatIbanForDisplay(bankAccount.iban)}
                  </span>
                  <Badge variant={bankAccount.isActive ? 'success' : 'secondary'} className="h-5 px-1.5 py-0 w-fit">
                    {bankAccount.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              }
              audit={{
                entityType: 'BankAccount',
                entityId: bankAccount.id,
                title: 'Banka Değişiklik Günlüğü',
              }}
              actions={
                <div className="flex gap-2">
                  {canWrite ? (
                    <Button size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil /> Düzenle
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/finance/bank-accounts">
                      <ArrowLeft /> Geri dön
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="mb-6">
              <StatGrid>
                <StatTile
                  icon={Coins}
                  value={formatMoney(bankAccount.openingBalance, bankAccount.currency)}
                  label="Açılış Tutarı"
                  tone="muted"
                  loading={query.isLoading}
                />
                <StatTile
                  icon={ArrowDownLeft}
                  value={formatMoney(totalIn, bankAccount.currency)}
                  label="Toplam Giriş"
                  tone="success"
                  loading={txQuery.isLoading}
                />
                <StatTile
                  icon={ArrowUpRight}
                  value={formatMoney(totalOut, bankAccount.currency)}
                  label="Toplam Çıkış"
                  tone="warning"
                  loading={txQuery.isLoading}
                />
                <StatTile
                  icon={TrendingUp}
                  value={formatMoney(bankAccount.balance, bankAccount.currency)}
                  label="Güncel Bakiye"
                  tone={bankAccount.balance >= 0 ? 'success' : 'destructive'}
                  loading={query.isLoading}
                />
              </StatGrid>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="transactions">Hesap Hareketleri</TabsTrigger>
                <TabsTrigger value="files">Ekler & Belgeler</TabsTrigger>
                <TabsTrigger value="info">Banka Bilgileri</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <DataGrid
                  gridId={`finance.bankAccounts.tx.${bankAccount.id}`}
                  data={txQuery.data ?? []}
                  columns={txColumns}
                  getRowId={(row) => row.id}
                  loading={txQuery.isLoading}
                  emptyText="Bu hesaba ait işlem hareketi bulunamadı."
                  toolbar={
                    canTxWrite ? (
                      <Button onClick={handleCreateTx}>
                        <Plus /> Yeni İşlem Ekle
                      </Button>
                    ) : null
                  }
                />
              </TabsContent>

              <TabsContent value="files">
                <Card>
                  <CardContent className="pt-6">
                    <FileManager
                      entityType="BankAccount"
                      entityId={bankAccount.id}
                      kind="file"
                      canWrite={canFiles}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Landmark className="size-4 text-muted-foreground" />
                      Hesap & Banka Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Banka Adı</div>
                        <div className="text-sm font-semibold">{bankAccount.bankName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Şube / Kodu</div>
                        <div className="text-sm font-semibold">
                          {bankAccount.branchName || '—'}
                          {bankAccount.branchCode ? ` (${bankAccount.branchCode})` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Hesap Numarası</div>
                        <div className="text-sm font-semibold">{bankAccount.accountNumber || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Durum</div>
                        <div className="text-sm font-semibold pt-0.5">
                          <Badge variant={bankAccount.isActive ? 'success' : 'outline'}>
                            {bankAccount.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Oluşturulma Tarihi</div>
                        <div className="text-sm">{formatDateTime(bankAccount.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Son Güncelleme</div>
                        <div className="text-sm">{formatDateTime(bankAccount.updatedAt)}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Açıklama</div>
                      <div className="text-sm p-3 bg-muted rounded-md min-h-16 flex items-start gap-2">
                        <FileText className="size-4 text-muted-foreground mt-0.5" />
                        <span>{bankAccount.description || 'Herhangi bir açıklama girilmemiş.'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <BankAccountDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={bankAccount}
              onSuccess={invalidate}
            />

            <FinanceTransactionDialog
              open={txOpen}
              onOpenChange={setTxOpen}
              bankAccountId={bankAccount.id}
              editing={editingTx}
              onSuccess={invalidate}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

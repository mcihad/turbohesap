import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderTree, Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type CategoryDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tree, type TreeNode } from '@/components/ui/tree'
import { CategoryEditor } from '../components/category-editor'

function buildTree(cats: CategoryDto[]): TreeNode[] {
  const byParent = new Map<string | null, CategoryDto[]>()
  for (const c of cats) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const make = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((c) => ({
        id: c.id,
        label: c.name,
        icon: FolderTree,
        badge: c.fieldDefs.length ? `${c.fieldDefs.length} alan` : undefined,
        children: make(c.id),
      }))
  return make(null)
}

export function CategoriesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.categoriesWrite)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const catsQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory', 'categories'] })

  const createMutation = useMutation({
    mutationFn: (parentId: string | null) =>
      api.inventory.categories.create({ name: 'Yeni kategori', parentId }),
    onSuccess: (cat) => {
      toast.success('Kategori oluşturuldu')
      void invalidate()
      setSelectedId(cat.id)
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  const cats = catsQuery.data ?? []
  const tree = React.useMemo(() => buildTree(cats), [cats])
  const expandedIds = React.useMemo(() => cats.map((c) => c.id), [cats])

  return (
    <PermissionRequired permission={InventoryPermissions.categoriesRead}>
      <PageWrapper>
        <PageHeader
          title="Kategoriler"
          description="Ürün kategorilerini ağaç yapısında yönetin; her kategoriye özel ürün alanları tanımlayın."
          actions={
            canWrite ? (
              <Button onClick={() => createMutation.mutate(null)} disabled={createMutation.isPending}>
                <Plus />
                Yeni kök kategori
              </Button>
            ) : null
          }
        />

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Tree */}
          <Card className="h-fit p-2">
            {cats.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {catsQuery.isLoading ? 'Yükleniyor…' : 'Henüz kategori yok.'}
              </p>
            ) : (
              <Tree
                key={expandedIds.join(',')}
                data={tree}
                defaultExpanded={expandedIds}
                defaultSelected={selectedId}
                onSelect={(node) => setSelectedId(node.id)}
              />
            )}
          </Card>

          {/* Editor */}
          {selectedId ? (
            <CategoryEditor
              key={selectedId}
              categoryId={selectedId}
              canWrite={canWrite}
              onChanged={invalidate}
              onAddChild={(parentId) => createMutation.mutate(parentId)}
              onDeleted={() => {
                setSelectedId(null)
                void invalidate()
              }}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
              <FolderTree className="size-10" />
              <p className="text-sm">Düzenlemek için soldan bir kategori seçin.</p>
            </Card>
          )}
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}

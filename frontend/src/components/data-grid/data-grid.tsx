import * as React from 'react'
import {
  type Column,
  type ColumnDef,
  type ExpandedState,
  type RowData,
  type RowSelectionState,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ListQuery } from '@turbohesap/shared'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  EyeOff,
  Filter,
  Group,
  MoreVertical,
  PinOff,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { defaultGridState, useGridState } from './use-grid-state'
import { ColumnFilterPopover, columnFilterFn, type ColumnFilterMeta } from './column-filter'
import { buildListQuery, type FieldMap } from './build-list-query'
import { QueryBuilder, type QueryBuilderField } from '@/components/query-builder'
import { emptyGroup, isEmptyGroup, isFilterGroup, type FilterGroup } from '@turbohesap/shared'

export type { ColumnDef } from '@tanstack/react-table'

// Per-column filter metadata (typed filter editors + server field mapping).
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filter?: ColumnFilterMeta
  }
}

const SELECT_COL = '__select__'

export interface DataGridProps<T> {
  /** Stable id used to persist this grid's layout per user. */
  gridId: string
  data: T[]
  columns: ColumnDef<T, unknown>[]
  getRowId?: (row: T) => string
  loading?: boolean
  /** Row click (ignored on grouped rows / interactive cells). */
  onRowClick?: (row: T) => void
  /** Extra per-row class (e.g. a transient highlight for a just-saved row). */
  rowClassName?: (row: T) => string | undefined
  selection?: 'none' | 'single' | 'multi'
  onSelectionChange?: (rows: T[]) => void
  /** Extra toolbar content on the right (e.g. a "New" button). */
  toolbar?: React.ReactNode
  emptyText?: string
  pageSize?: number
  /** Provide to render a TREE table: children rows + expand/indent. */
  getSubRows?: (row: T) => T[] | undefined
  /** Which column carries the tree expander/indent (default: first data column). */
  treeColumnId?: string
  /** Paginate (default true). Tree tables usually pass false to show the whole tree. */
  pagination?: boolean
  /** Tree tables: expand every node initially (default false). */
  defaultExpanded?: boolean
  /**
   * Override the built-in global search with a page-controlled box (so a page
   * that already owns its filter state doesn't end up with two search inputs).
   * When set, the grid renders THIS box in its toolbar and leaves its internal
   * global filter untouched.
   */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string }
  /** Hide the search box entirely (e.g. a page renders its own elsewhere). */
  hideSearch?: boolean
  /**
   * Make the grid own the available height: the toolbar/footer stay put while
   * only the table body scrolls. Use inside a flex/height-constrained parent.
   */
  fillHeight?: boolean
  /**
   * Opt into SERVER-side pagination/sorting/filtering. When set, `data` is the
   * CURRENT PAGE only, `total` is the server row count, and the grid emits a
   * derived `ListQuery` (from sort + column filters + query builder + search +
   * page) via `onQueryChange` so the page's query can refetch. When omitted,
   * the grid stays fully client-side (backward compatible).
   */
  server?: {
    total: number
    onQueryChange: (query: ListQuery) => void
  }
  /**
   * Enable the advanced Query Builder (nested AND/OR rules). When set, a
   * "Gelişmiş filtre" toolbar button opens it; its tree persists in grid state
   * and AND-combines with the quick column filters. Best paired with `server`.
   */
  queryBuilder?: { fields: QueryBuilderField[] }
}

export function DataGrid<T>({
  gridId,
  data,
  columns,
  getRowId,
  loading = false,
  onRowClick,
  rowClassName,
  selection = 'none',
  onSelectionChange,
  toolbar,
  emptyText = 'Kayıt yok.',
  pageSize = 25,
  getSubRows,
  treeColumnId,
  pagination = true,
  defaultExpanded = false,
  search,
  hideSearch = false,
  fillHeight = false,
  server,
  queryBuilder,
}: DataGridProps<T>) {
  const tree = !!getSubRows
  const serverMode = !!server
  const { state, setState, ready } = useGridState(gridId, defaultGridState(pageSize))
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>(defaultExpanded ? true : {})
  const [pageIndex, setPageIndex] = React.useState(0)
  const [showFilters, setShowFilters] = React.useState(false)

  // Prepend a selection column when selectable.
  const allColumns = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    if (selection === 'none') return columns
    const selCol: ColumnDef<T, unknown> = {
      id: SELECT_COL,
      enableSorting: false,
      enableHiding: false,
      enableColumnFilter: false,
      enableGrouping: false,
      size: 40,
      header: ({ table }) =>
        selection === 'multi' ? (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Tümünü seç"
          />
        ) : null,
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seç"
        />
      ),
    }
    return [selCol, ...columns]
  }, [columns, selection])

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    getSubRows,
    state: {
      sorting: state.sorting,
      columnOrder: state.columnOrder,
      columnVisibility: state.columnVisibility,
      columnPinning: state.columnPinning,
      columnFilters: state.columnFilters,
      grouping: state.grouping,
      globalFilter: state.globalFilter,
      rowSelection,
      expanded,
      // The pagination row model is what flattens expanded sub-rows into the
      // rendered list (TanStack only does this in the pagination step). So even
      // when pagination is "off" we keep the model and just use a huge page so
      // the whole (tree) table fits on one page.
      pagination: { pageIndex, pageSize: pagination ? state.pageSize : 100000 },
    },
    enableMultiRowSelection: selection === 'multi',
    enableRowSelection: selection !== 'none',
    globalFilterFn: 'includesString',
    // Typed column filters store `{op,value}`; this filterFn honors that shape
    // (and falls back to substring for legacy plain-string filters).
    defaultColumn: { filterFn: columnFilterFn },
    // Server mode: the row models become pass-through and the grid emits a
    // ListQuery instead of slicing locally.
    manualPagination: serverMode,
    manualSorting: serverMode,
    manualFiltering: serverMode,
    ...(serverMode ? { rowCount: server!.total } : {}),
    onSortingChange: (u) => setState((s) => ({ ...s, sorting: typeof u === 'function' ? u(s.sorting) : u })),
    onColumnOrderChange: (u) => setState((s) => ({ ...s, columnOrder: typeof u === 'function' ? u(s.columnOrder) : u })),
    onColumnVisibilityChange: (u) => setState((s) => ({ ...s, columnVisibility: typeof u === 'function' ? u(s.columnVisibility) : u })),
    onColumnPinningChange: (u) => setState((s) => ({ ...s, columnPinning: typeof u === 'function' ? u(s.columnPinning) : u })),
    onColumnFiltersChange: (u) => setState((s) => ({ ...s, columnFilters: typeof u === 'function' ? u(s.columnFilters) : u })),
    onGroupingChange: (u) => setState((s) => ({ ...s, grouping: typeof u === 'function' ? u(s.grouping) : u })),
    onGlobalFilterChange: (u) => setState((s) => ({ ...s, globalFilter: typeof u === 'function' ? u(s.globalFilter) : u })),
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onPaginationChange: (u) => {
      const next = typeof u === 'function' ? u({ pageIndex, pageSize: state.pageSize }) : u
      setPageIndex(next.pageIndex)
      if (next.pageSize !== state.pageSize) setState((s) => ({ ...s, pageSize: next.pageSize }))
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // In tree mode, filtering should keep a parent whose descendants match.
    filterFromLeafRows: tree,
    paginateExpandedRows: false,
  })

  // ── server mode: derive a ListQuery from grid state and emit it ─────────────
  const fieldMap = React.useMemo<FieldMap>(() => {
    const m: FieldMap = {}
    for (const c of columns) {
      const id = c.id ?? ('accessorKey' in c ? (c.accessorKey as string) : undefined)
      if (!id) continue
      m[id] = c.meta?.filter?.field ?? id
    }
    return m
  }, [columns])

  const serverSearch = search ? search.value : state.globalFilter
  const serverQuery = React.useMemo(
    () =>
      buildListQuery({
        sorting: state.sorting,
        columnFilters: state.columnFilters,
        queryBuilder: state.queryBuilder,
        search: serverSearch,
        pageIndex,
        pageSize: state.pageSize,
        fieldMap,
      }),
    [state.sorting, state.columnFilters, state.queryBuilder, serverSearch, pageIndex, state.pageSize, fieldMap],
  )

  // Reset to page 1 whenever the filter/sort/search signature changes.
  const sigRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!serverMode) return
    const sig = JSON.stringify({ sort: serverQuery.sort, filter: serverQuery.filter, search: serverQuery.search })
    if (sigRef.current !== null && sigRef.current !== sig && pageIndex !== 0) setPageIndex(0)
    sigRef.current = sig
  }, [serverMode, serverQuery, pageIndex])

  const onQueryChangeRef = React.useRef(server?.onQueryChange)
  onQueryChangeRef.current = server?.onQueryChange
  React.useEffect(() => {
    if (!serverMode || !ready) return
    const t = setTimeout(() => onQueryChangeRef.current?.(serverQuery), 300)
    return () => clearTimeout(t)
  }, [serverMode, ready, serverQuery])

  // Report selection changes upward.
  React.useEffect(() => {
    if (!onSelectionChange) return
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original))
  }, [rowSelection, onSelectionChange, table])

  // Drag-to-reorder columns.
  const dragCol = React.useRef<string | null>(null)
  const reorder = (target: string) => {
    const dragged = dragCol.current
    if (!dragged || dragged === target) return
    const order = table.getAllLeafColumns().map((c) => c.id)
    const current = state.columnOrder.length ? state.columnOrder : order
    const from = current.indexOf(dragged)
    const to = current.indexOf(target)
    if (from < 0 || to < 0) return
    const next = [...current]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setState((s) => ({ ...s, columnOrder: next }))
  }

  const rows = table.getRowModel().rows
  const leafCount = table.getVisibleLeafColumns().length
  const treeColId = treeColumnId ?? table.getVisibleLeafColumns().find((c) => c.id !== SELECT_COL)?.id
  const selectedCount = table.getSelectedRowModel().rows.length
  const total = serverMode ? server!.total : table.getFilteredRowModel().rows.length
  const qbRuleCount = React.useMemo(() => {
    const count = (g?: FilterGroup): number =>
      g ? g.rules.reduce((n, r) => n + (isFilterGroup(r) ? count(r) : 1), 0) : 0
    return count(state.queryBuilder)
  }, [state.queryBuilder])
  const anyState =
    state.sorting.length > 0 ||
    state.columnFilters.length > 0 ||
    !!state.globalFilter ||
    state.grouping.length > 0 ||
    state.columnOrder.length > 0 ||
    (state.columnPinning.left?.length ?? 0) > 0 ||
    (state.columnPinning.right?.length ?? 0) > 0 ||
    Object.keys(state.columnVisibility).length > 0

  const searchValue = search ? search.value : state.globalFilter
  const onSearch = (v: string) =>
    search ? search.onChange(v) : setState((s) => ({ ...s, globalFilter: v }))

  return (
    <div className={cn('flex flex-col gap-3', fillHeight && 'h-full min-h-0')}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {!hideSearch ? (
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={search?.placeholder ?? 'Tabloda ara…'}
              className="pl-8"
            />
          </div>
        ) : null}

        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="gap-1.5"
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filtreler</span>
          {state.columnFilters.length ? <Badge variant="secondary" className="px-1.5">{state.columnFilters.length}</Badge> : null}
        </Button>

        {queryBuilder ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={state.queryBuilder && !isEmptyGroup(state.queryBuilder) ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
              >
                <SlidersHorizontal className="size-4" />
                <span className="hidden sm:inline">Gelişmiş filtre</span>
                {qbRuleCount ? <Badge variant="secondary" className="px-1.5">{qbRuleCount}</Badge> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(90vw,32rem)] p-2">
              <QueryBuilder
                fields={queryBuilder.fields}
                value={state.queryBuilder ?? emptyGroup()}
                onChange={(g) => setState((s) => ({ ...s, queryBuilder: g }))}
              />
              {state.queryBuilder && !isEmptyGroup(state.queryBuilder) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  onClick={() => setState((s) => ({ ...s, queryBuilder: undefined }))}
                >
                  Gelişmiş filtreyi temizle
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        <ColumnChooser table={table} />

        {anyState ? (
          <Button variant="ghost" size="sm" onClick={() => setState(defaultGridState(state.pageSize))} className="gap-1.5">
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Sıfırla</span>
          </Button>
        ) : null}

        {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : <div className="ml-auto" />}
      </div>

      {/* Active grouping chips */}
      {state.grouping.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Group className="size-3.5" />
          Gruplama:
          {state.grouping.map((g) => {
            const col = table.getColumn(g)
            return (
              <Badge key={g} variant="secondary" className="gap-1">
                {typeof col?.columnDef.header === 'string' ? col.columnDef.header : g}
                <button onClick={() => col?.toggleGrouping()} aria-label="Gruplamayı kaldır"><X className="size-3" /></button>
              </Badge>
            )
          })}
        </div>
      ) : null}

      {/* Table */}
      <div className={cn('overflow-x-auto rounded-lg border', fillHeight && 'min-h-0 flex-1 overflow-auto')}>
        <table className="border-collapse text-sm" style={{ width: table.getTotalSize(), minWidth: '100%' }}>
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const col = header.column
                  const canReorder = col.id !== SELECT_COL && !col.getIsPinned()
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: col.getSize(), ...pinStyle(col, true) }}
                      draggable={canReorder}
                      onDragStart={() => (dragCol.current = col.id)}
                      onDragOver={(e) => { if (dragCol.current) e.preventDefault() }}
                      onDrop={(e) => { e.preventDefault(); reorder(col.id) }}
                      className="group/th h-10 border-b px-3 text-left align-middle text-xs font-semibold tracking-wide text-muted-foreground uppercase select-none"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!col.getCanSort()}
                            onClick={col.getToggleSortingHandler()}
                            className={cn('flex flex-1 items-center gap-1 truncate', col.getCanSort() && 'cursor-pointer hover:text-foreground')}
                          >
                            <span className="truncate">{flexRender(col.columnDef.header, header.getContext())}</span>
                            {col.getIsSorted() === 'asc' ? <ArrowUp className="size-3.5" /> : col.getIsSorted() === 'desc' ? <ArrowDown className="size-3.5" /> : null}
                          </button>
                          {col.id !== SELECT_COL ? <ColumnMenu column={col} /> : null}
                          {showFilters && col.getCanFilter() && (col.columnDef.meta?.filter || !serverMode) ? (
                            <ColumnFilterPopover column={col} />
                          ) : null}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={leafCount} className="p-8 text-center text-muted-foreground">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={leafCount} className="p-8 text-center text-muted-foreground">{emptyText}</td></tr>
            ) : (
              rows.map((row) => {
                if (row.getIsGrouped()) {
                  const gid = row.groupingColumnId!
                  const gcol = table.getColumn(gid)
                  const ghead = typeof gcol?.columnDef.header === 'string' ? gcol.columnDef.header : gid
                  return (
                    <tr key={row.id} className="bg-muted/40">
                      <td colSpan={leafCount} className="px-3 py-1.5">
                        <button type="button" onClick={row.getToggleExpandedHandler()} className="flex items-center gap-1.5 font-medium">
                          {row.getIsExpanded() ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          <span className="text-muted-foreground">{ghead}:</span>
                          <span>{String(row.getGroupingValue(gid) ?? '—')}</span>
                          <Badge variant="secondary" className="ml-1 px-1.5">{row.subRows.length}</Badge>
                        </button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-b transition-colors duration-700 last:border-0 hover:bg-accent/50',
                      row.getIsSelected() && 'bg-primary/5',
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row.original),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isTreeCell = tree && cell.column.id === treeColId
                      return (
                        <td key={cell.id} style={{ width: cell.column.getSize(), ...pinStyle(cell.column, false) }} className="px-3 py-2 align-middle">
                          {isTreeCell ? (
                            <div className="flex items-stretch -my-2">
                              {/* indentation guide rails (one per ancestor level) */}
                              {Array.from({ length: row.depth }).map((_, i) => (
                                <span key={i} className="relative w-5 shrink-0">
                                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
                                </span>
                              ))}
                              <div className="flex min-w-0 flex-1 items-center gap-1.5 py-2">
                                {row.getCanExpand() ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); row.toggleExpanded() }}
                                    className="grid size-5 shrink-0 place-items-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
                                    aria-label={row.getIsExpanded() ? 'Daralt' : 'Genişlet'}
                                  >
                                    <ChevronRight className={cn('size-3.5 transition-transform duration-200', row.getIsExpanded() && 'rotate-90')} />
                                  </button>
                                ) : (
                                  <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
                                    <span className="size-1.5 rounded-full bg-border" />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1 truncate">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </div>
                            </div>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: selection + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>
          {selection !== 'none' && selectedCount > 0 ? <span>{selectedCount} seçili · </span> : null}
          {total} kayıt
          {!ready ? ' · yükleniyor…' : ''}
        </div>
        {pagination ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Sayfa boyutu</span>
            <Select value={String(state.pageSize)} onValueChange={(v) => { setState((s) => ({ ...s, pageSize: Number(v) })); setPageIndex(0) }}>
              <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="tabular-nums">
              {table.getPageCount() === 0 ? 0 : pageIndex + 1} / {table.getPageCount()}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="size-4" /></Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPageIndex((p) => p - 1)} disabled={!table.getCanPreviousPage()}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPageIndex((p) => p + 1)} disabled={!table.getCanNextPage()}><ChevronRight className="size-4" /></Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="size-4" /></Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Sticky positioning for a pinned column (header or cell).
function pinStyle<T>(column: Column<T, unknown>, isHeader: boolean): React.CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) return {}
  return {
    position: 'sticky',
    left: pinned === 'left' ? column.getStart('left') : undefined,
    right: pinned === 'right' ? column.getAfter('right') : undefined,
    zIndex: isHeader ? 11 : 1,
    background: 'var(--background)',
    boxShadow:
      pinned === 'left'
        ? '2px 0 4px -2px rgba(0,0,0,0.12)'
        : '-2px 0 4px -2px rgba(0,0,0,0.12)',
  }
}

function ColumnMenu<T>({ column }: { column: Column<T, unknown> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover/th:opacity-100" aria-label="Sütun menüsü">
          <MoreVertical className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {column.getCanSort() ? (
          <>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}><ArrowUp className="size-4" />Artan sırala</DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}><ArrowDown className="size-4" />Azalan sırala</DropdownMenuItem>
            {column.getIsSorted() ? <DropdownMenuItem onClick={() => column.clearSorting()}><X className="size-4" />Sıralamayı kaldır</DropdownMenuItem> : null}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel className="text-2xs">Sabitle</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => column.pin('left')}><SlidersHorizontal className="size-4" />Sola sabitle</DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.pin('right')}><SlidersHorizontal className="size-4 scale-x-[-1]" />Sağa sabitle</DropdownMenuItem>
        {column.getIsPinned() ? <DropdownMenuItem onClick={() => column.pin(false)}><PinOff className="size-4" />Sabitlemeyi kaldır</DropdownMenuItem> : null}
        {column.getCanGroup() ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => column.toggleGrouping()}><Group className="size-4" />{column.getIsGrouped() ? 'Gruplamayı kaldır' : 'Buna göre grupla'}</DropdownMenuItem>
          </>
        ) : null}
        {column.getCanHide() ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}><EyeOff className="size-4" />Sütunu gizle</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColumnChooser<T>({ table }: { table: TanstackTable<T> }) {
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && c.id !== SELECT_COL)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Sütunlar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>Görünür sütunlar</span>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
            onClick={() => hideable.forEach((c) => c.toggleVisibility(true))}
          >
            Tümü
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-1">
          {hideable.map((col) => (
            <label key={col.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={col.getIsVisible()} onCheckedChange={(v) => col.toggleVisibility(!!v)} />
              <span className="truncate">{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

import * as React from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { router } from '@inertiajs/react'
import { DataTable } from '~/components/data-table/data-table'
import { historyColumns } from './history-columns'

interface WalletHistoryDataTableProps {
  data: any[]
  meta: any
}

export function WalletHistoryDataTable({ data, meta }: WalletHistoryDataTableProps) {
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: meta.currentPage - 1,
    pageSize: meta.perPage,
  })

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])

  const pagination = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  )

  React.useEffect(() => {
    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      const currentSort = sorting[0]
      router.get(
        window.location.pathname,
        {
          sortBy: currentSort?.id || 'createdAt',
          sortOrder: currentSort?.desc ? 'desc' : 'asc',
          page: pageIndex + 1,
          limit: pageSize,
        },
        { preserveState: true, preserveScroll: true }
      )
    }
  }, [pageIndex, pageSize])

  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    router.get(
      window.location.pathname,
      {
        sortBy,
        sortOrder,
        page: 1,
        limit: pageSize,
      },
      { preserveState: true, replace: true }
    )
  }, [sorting])

  const table = useReactTable({
    data,
    columns: historyColumns as ColumnDef<any>[],
    pageCount: meta.lastPage,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  return <DataTable table={table} showSelectionCount={false} />
}

'use client'

import * as React from 'react'
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'

import { DataTable } from '~/components/data-table/data-table'
import { MembersToolbar } from './members-toolbar'
import { columns } from './columns'
import type { Member } from './schema'
import useUser from '~/hooks/use-user'

interface MembersTableProps {
  data: Member[]
  counts: { direct: number; team: number }
  maxDepth: number
}

export function MembersTable({ data, counts, maxDepth }: MembersTableProps) {
  const user = useUser()!
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])

  // Filter out columns based on user role
  const visibleColumns = React.useMemo(() => {
    return columns.filter((col) => {
      // Only admin can see checkbox column
      if (col.id === 'select' && user.role !== 'admin') {
        return false
      }
      // Only admin can see phone column
      if ('accessorKey' in col && col.accessorKey === 'phone' && user.role !== 'admin') {
        return false
      }
      return true
    })
  }, [user.role])

  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: user.role === 'admin',
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4">
      <MembersToolbar table={table} counts={counts} maxDepth={maxDepth} />
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}

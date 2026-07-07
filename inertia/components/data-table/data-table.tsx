import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import type * as React from 'react'

import { DataTablePagination } from '~/components/data-table/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getCommonPinningStyles } from '~/lib/data-table'
import { cn } from '~/lib/utils'

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  showSelectionCount?: boolean
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  showSelectionCount = true,
  ...props
}: DataTableProps<TData>) {
  return (
    <div className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
      {children}
      <div className="overflow-auto rounded-md border">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                      width: header.getSize() !== 150 ? `${header.getSize()}px` : 'auto',
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getCommonPinningStyles({ column: cell.column }),
                        width:
                          cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : 'auto',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} showSelectionCount={showSelectionCount} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  )
}

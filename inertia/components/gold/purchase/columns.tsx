import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatDateWithRelative } from '~/lib/format'
import { formatCurrency, numberToWords } from '~/lib/utils'

import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
import { route } from '@izzyjs/route/client'

export type Purchase = {
  id: number
  amount: number
  buyerName: string
  quantity: number
  status: string
  createdAt: string
}

export const columns: ColumnDef<Purchase>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Requested On" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string
      const { formatted, relative } = formatDateWithRelative(date)
      return (
        <span className="font-medium">
          {formatted}
          <span className="text-xs text-muted-foreground block">({relative})</span>
        </span>
      )
    },
  },
  {
    accessorKey: 'buyerName',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Buyer" />,
    cell: ({ row }) => <span className="font-medium">{row.original.buyerName}</span>,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Quantity" />,
    cell: ({ row }) => <span>{Number(row.original.quantity).toFixed(3)} gm</span>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      return (
        <div className="flex flex-col">
          <div className="font-medium">{formatCurrency(amount)}</div>
          <p className="text-xs text-muted-foreground">({numberToWords(amount)})</p>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <>
          {status === 'approved' && <Badge variant="success">Approved</Badge>}
          {status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
          {status === 'pending' && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
              Pending
            </Badge>
          )}
          {status === 'stopped' && <Badge variant="secondary">Stopped</Badge>}
          {status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
        </>
      )
    },
  },
  {
    id: 'invoice',
    header: 'Invoice',
    cell: ({ row }) => (
      <a
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        href={route('gold.purchase.bill', { params: { id: row.original.id } }).toString()}
      >
        PDF
      </a>
    ),
  },
]

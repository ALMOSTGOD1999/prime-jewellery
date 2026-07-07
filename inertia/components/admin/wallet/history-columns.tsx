import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { Badge } from '~/components/ui/badge'
import { formatCurrency } from '~/lib/utils'
import { formatDateWithRelative } from '~/lib/format'

export type WalletTransaction = {
  id: number
  amount: number
  type: 'wallet_credit' | 'wallet_debit'
  remark: string | null
  createdAt: string
  approvedAt: string | null
}

export const historyColumns: ColumnDef<WalletTransaction>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
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
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      const isCredit = type === 'wallet_credit'
      return (
        <Badge variant={isCredit ? 'default' : 'destructive'} className="capitalize">
          {isCredit ? 'Credit' : 'Debit'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const type = row.original.type
      const isCredit = type === 'wallet_credit'
      return (
        <span className={`font-semibold ${isCredit ? 'text-trading-up' : 'text-destructive'}`}>
          {isCredit ? '+' : '-'}{formatCurrency(amount)}
        </span>
      )
    },
  },
  {
    accessorKey: 'remark',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Remark" />,
    cell: ({ row }) => {
      const remark = row.original.remark
      return (
        <span className="text-sm text-muted-foreground">
          {remark || '—'}
        </span>
      )
    },
  },
]

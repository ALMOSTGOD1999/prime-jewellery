import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { DateTime } from 'luxon'

export type CashbackReward = {
  date: string
  amount: number
}

export const columns: ColumnDef<CashbackReward>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" label="Date" />,
    cell: ({ row }) => {
      const dateValue = row.getValue('date')
      const date = DateTime.fromISO(dateValue as string)
      return <div className="font-medium">{date.toFormat('dd MMM yyyy')}</div>
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const rawAmount = row.getValue('amount')
      const amount =
        rawAmount === null || rawAmount === undefined || Number.isNaN(Number(rawAmount))
          ? 0
          : Number(rawAmount)
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)

      return <div className="font-medium">{formatted}</div>
    },
  },
]

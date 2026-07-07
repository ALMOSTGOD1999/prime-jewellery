import { ColumnDef } from '@tanstack/react-table'
import { DateTime } from 'luxon'
import { Badge } from '~/components/ui/badge'

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
      const date = row.getValue('created_at')
      return date ? DateTime.fromISO(date as string).toFormat('dd MMM yyyy, hh:mm a') : '-'
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      return <span className="capitalize">{row.getValue('type')}</span>
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'
          }
          className="capitalize"
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'approvedAt',
    header: 'Approved At',
    cell: ({ row }) => {
      // Logic to show Approved At or Rejected At based on status
      const status = row.original.status
      let date = null
      if (status === 'approved') date = row.original.approvedAt
      if (status === 'rejected') date = row.original.rejectedAt

      return date ? DateTime.fromISO(date as string).toFormat('dd MMM yyyy, hh:mm a') : '-'
    },
  },
  {
    accessorKey: 'remark',
    header: 'Remark',
  },
]

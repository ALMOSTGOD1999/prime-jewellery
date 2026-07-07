import { ColumnDef } from '@tanstack/react-table'
import { Link } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'

import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatCurrency, formatDateWithRelative } from '~/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { WithdrawalActions } from './actions'
import { formatUserId } from '~/lib/utils'

export type Withdrawal = {
  id: number
  userId: number
  amount: string
  netAmount: string | null
  adminCharges: string | null
  otherDeductions: string | null
  type: string
  status: 'pending' | 'approved' | 'rejected'
  mode: string | null
  ref: string | null
  approvedAt: string | null
  rejectedAt: string | null
  remark: string | null
  createdAt: string
  user: {
    id: number
    name: string
    email: string
    avatar: { url: string } | null
  }
}

export const columns: ColumnDef<Withdrawal>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => {
      const user = row.original.user
      if (!user) return <span className="text-muted-foreground">Unknown</span>

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar?.url} alt={user.name} />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link
              href={route('admin.users.show', { params: { id: user.id } }).toString()}
              className="font-medium hover:underline"
            >
              {user.name}
            </Link>
            <span className="text-xs text-muted-foreground">{formatUserId(user.id)}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
    cell: ({ row }) => <div className="capitalize">{row.getValue('type')}</div>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const netAmount = row.original.netAmount ? parseFloat(row.original.netAmount) : null
      const adminCharges = row.original.adminCharges ? parseFloat(row.original.adminCharges) : null
      const otherDeductions = row.original.otherDeductions
        ? parseFloat(row.original.otherDeductions)
        : null

      const hasDeductions = adminCharges || otherDeductions

      return (
        <div className="space-y-1">
          <div className="font-medium">{formatCurrency(amount)}</div>
          {hasDeductions && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {adminCharges ? <div>Admin: -{formatCurrency(adminCharges)}</div> : null}
              {otherDeductions ? <div>Other: -{formatCurrency(otherDeductions)}</div> : null}
              {netAmount ? (
                <div className="text-green-600 font-medium">Net: {formatCurrency(netAmount)}</div>
              ) : null}
            </div>
          )}
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
        <Badge
          variant={
            status === 'approved' ? 'success' : status === 'rejected' ? 'destructive' : 'secondary'
          }
          className="capitalize"
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string
      const { formatted, relative } = formatDateWithRelative(date)
      return (
        <span className="font-medium">
          {formatted}
          <span className="text-xs text-muted-foreground ml-1">({relative})</span>
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <WithdrawalActions id={row.original.id} status={row.original.status} />,
  },
]

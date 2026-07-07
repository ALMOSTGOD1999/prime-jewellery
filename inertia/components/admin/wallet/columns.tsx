import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { Link } from '@inertiajs/react'
import { buttonVariants } from '~/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { Wallet01Icon } from '@hugeicons/core-free-icons'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { AddBalanceDialog } from './add-balance-dialog'

export type WalletUser = {
  id: number
  name: string
  email: string
  phone: string
  walletBalance: number
  role: string
  activatedAt: string | null
  createdAt: string
}

export const columns: ColumnDef<WalletUser>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => {
      const user = row.original
      return (
        <Link
          href={`/admin/wallet/users/${user.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={undefined} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <span className="text-xs text-muted-foreground">{user.phone}</span>
          </div>
        </Link>
      )
    },
  },
  {
    accessorKey: 'walletBalance',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Wallet Balance" />,
    cell: ({ row }) => {
      const balance = row.original.walletBalance
      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 text-primary" />
          <span className="font-semibold text-lg">
            ₹{balance.toLocaleString('en-IN')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Role" />,
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize">
          {role}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'activatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const activated = row.original.activatedAt
      return (
        <Badge variant={activated ? 'default' : 'secondary'}>
          {activated ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-2">
          <AddBalanceDialog userId={user.id} userName={user.name} />
          <Link
            href={`/admin/wallet/users/${user.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            History
          </Link>
        </div>
      )
    },
  },
]



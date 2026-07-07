import { ColumnDef } from '@tanstack/react-table'
import { Link } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'

import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatDateWithRelative } from '~/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'

export type User = {
  id: number
  name: string
  email: string
  phone: string
  inviteCode: string
  avatar: { url: string } | null
  createdAt: string
  activatedAt: string | null
  parent: {
    id: number
    name: string
  } | null
}

import { formatUserId } from '~/lib/utils'

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} label="ID" />,
    cell: ({ row }) => <div className="w-[80px]">{formatUserId(row.getValue('id'))}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
    cell: ({ row }) => {
      const isActive = !!row.original.activatedAt
      const user = row.original
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar?.url} alt={user.name} preview />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Link
                href={route('admin.users.show', { params: { id: row.original.id } }).toString()}
                className="max-w-[500px] truncate font-medium hover:underline"
              >
                {row.getValue('name')}
              </Link>
              {isActive && (
                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'parent',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Parent" />,
    cell: ({ row }) => {
      const parent = row.original.parent
      if (!parent) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {parent.name} ({parent.id})
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Joined On" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string
      const { formatted, relative } = formatDateWithRelative(date)
      return (
        <span className="font-medium">
          {formatted}
          <span className="text-xs text-muted-foreground">({relative})</span>
        </span>
      )
    },
  },
]

import type { ColumnDef } from '@tanstack/react-table'

import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatDateWithRelative } from '~/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import type { Member } from './schema'

import { formatUserId } from '~/lib/utils'

export const columns: ColumnDef<Member>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    maxSize: 40,
    minSize: 40,
    enableResizing: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} label="ID" />,
    cell: ({ row }) => {
      const activatedAt = row.original.activatedAt
      return (
        <div className="flex items-center gap-2">
          <div className="w-24">{formatUserId(row.getValue('id'), null, row.original.leg)}</div>
          {activatedAt && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
      )
    },
    enableSorting: true,
    meta: {
      label: 'ID',
      variant: 'number',
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
    cell: ({ row }) => {
      const member = row.original

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar || undefined} alt={member.name} preview />
            <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.name}</span>
              {member.depth && member.depth > 0 && (
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  {member.depth === 1 ? 'Direct' : `Level ${member.depth}`}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formatUserId(member.id, null, member.leg)}</span>
          </div>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
    meta: {
      label: 'Name',
      variant: 'text',
    },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Phone" />,
    cell: ({ row }) => <div className="w-32">{row.getValue('phone')}</div>,
    enableSorting: true,
    meta: {
      label: 'Phone',
      variant: 'text',
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Joined Date" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string
      const { formatted, relative } = formatDateWithRelative(date)

      return (
        <>
          <div className="font-medium">{formatted}</div>
          <div className="text-xs text-muted-foreground">({relative})</div>
        </>
      )
    },
    enableSorting: true,
    meta: {
      label: 'Joined Date',
      variant: 'date',
    },
  },
]

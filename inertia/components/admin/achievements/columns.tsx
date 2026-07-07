import { ColumnDef } from '@tanstack/react-table'
import { Link } from '@inertiajs/react'
import { Badge } from '~/components/ui/badge'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatCurrency, formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Achievement } from '~/components/achievements/columns'
import { CollectDialog } from './collect-dialog'
import { useState } from 'react'

export type AdminAchievement = Achievement & {
  user: {
    id: number
    name: string
    avatarUrl: string | null
  }
}

export const columns: ColumnDef<AdminAchievement>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => {
      const user = row.original.user
      return (
        <div className="flex flex-col">
          <Link href={`/achievements/users/${user.id}`} className="font-medium hover:underline">
            {user.name}
          </Link>
          <span className="text-xs text-muted-foreground">ID: {user.id}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'criteria',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Criteria" />,
    cell: ({ row }) => <div>{formatCurrency(row.getValue('criteria'))}</div>,
  },
  {
    accessorKey: 'reward',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Reward" />,
    cell: ({ row }) => <div>{row.getValue('reward')}</div>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Achieved On" />,
    cell: ({ row }) => <div>{formatDate(row.getValue('createdAt'))}</div>,
  },
  {
    accessorKey: 'collectedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Collected" />,
    cell: ({ row }) => {
      const collectedAt = row.getValue('collectedAt') as string | null
      return (
        <div>
          {collectedAt ? (
            <span className="text-green-600 font-medium">{formatDate(collectedAt)}</span>
          ) : (
            <Badge variant="secondary">Pending</Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const achievement = row.original
      const isCollected = !!achievement.collectedAt
      const [open, setOpen] = useState(false)

      if (isCollected) return null

      return (
        <>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Collect
          </Button>
          <CollectDialog achievementId={achievement.id} open={open} onOpenChange={setOpen} />
        </>
      )
    },
  },
]

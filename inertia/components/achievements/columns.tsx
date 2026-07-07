import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '~/components/ui/badge'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatCurrency, formatDate } from '~/lib/format'

export type Achievement = {
  id: number
  power: number
  weaker: number
  criteria: number
  reward: string
  collectedAt: string | null
  createdAt: string
  updatedAt: string
}

export const columns: ColumnDef<Achievement>[] = [
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
    accessorKey: 'power',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Power" />,
    cell: ({ row }) => <div>{formatCurrency(row.getValue('power'))}</div>,
  },
  {
    accessorKey: 'weaker',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Weaker" />,
    cell: ({ row }) => <div>{formatCurrency(row.getValue('weaker'))}</div>,
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
]

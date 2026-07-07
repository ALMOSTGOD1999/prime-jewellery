import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { DateTime } from 'luxon'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { buttonVariants } from '~/components/ui/button'

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {DateTime.fromFormat(row.getValue('date'), 'yyyy-MM-dd HH:mm:ss').toLocaleString(
            DateTime.DATE_MED
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'source',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Source" />,
    cell: ({ row }) => {
      const source = row.getValue('source') as any
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={source.avatar?.url} />
            <AvatarFallback>{source.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{source.name}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'level',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Level" />,
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="font-mono">
          Level {row.getValue('level')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const percentage = row.original.percentage || '0%'
      const level = row.getValue('level')
      const currentMonth = row.original.currentMonth || 1
      const withdrawableAmount = row.original.withdrawableAmount || 0
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)

      return (
        <div className="flex items-center gap-2">
          <div className="font-medium text-green-600 font-mono text-lg">{formatted}</div>
          <Popover>
            <PopoverTrigger
              className={buttonVariants({
                variant: 'ghost',
                className: 'h-4 w-4 p-0 hover:bg-transparent',
              })}
            >
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="bg-primary/10 p-3 border-b border-primary/20">
                <div className="font-semibold text-sm">Level Reward - Month {currentMonth}</div>
                <div className="text-xs text-muted-foreground">
                  Level {level} • {percentage}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm">
                  <div className="font-medium mb-1">Reward for 2 months total</div>
                  <div className="text-muted-foreground text-xs">
                    Month {currentMonth}: {formatted}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    Withdrawable:{' '}
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(withdrawableAmount)}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
  },
]

// Columns for cashback activation rewards (user's own activation)
export const cashbackColumns: ColumnDef<any>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {DateTime.fromFormat(row.getValue('date'), 'yyyy-MM-dd HH:mm:ss').toLocaleString(
            DateTime.DATE_MED
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'month',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Month" />,
    cell: ({ row }) => {
      return (
        <Badge variant="secondary" className="font-mono">
          Month {row.getValue('month')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)

      return (
        <div className="flex items-center gap-2">
          <div className="font-medium text-green-600 font-mono text-lg">{formatted}</div>
          <Popover>
            <PopoverTrigger
              className={buttonVariants({
                variant: 'ghost',
                className: 'h-4 w-4 p-0 hover:bg-transparent',
              })}
            >
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="bg-primary/10 p-3 border-b border-primary/20">
                <div className="font-semibold text-sm">Cashback Activation Reward</div>
                <div className="text-xs text-muted-foreground">
                  10% of ₹1000 activation split over 2 months
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm text-muted-foreground">
                  Released monthly after activation
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
  },
]

// Columns without level (for direct sponsor)
export const columnsWithoutLevel: ColumnDef<any>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {DateTime.fromFormat(row.getValue('date'), 'yyyy-MM-dd HH:mm:ss').toLocaleString(
            DateTime.DATE_MED
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'source',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Source" />,
    cell: ({ row }) => {
      const source = row.getValue('source') as any
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={source.avatar?.url} />
            <AvatarFallback>{source.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{source.name}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Total Reward" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)

      return (
        <div className="flex items-center gap-2">
          <div className="font-medium text-green-600 font-mono text-lg">{formatted}</div>
          <Popover>
            <PopoverTrigger
              className={buttonVariants({
                variant: 'ghost',
                className: 'h-4 w-4 p-0 hover:bg-transparent',
              })}
            >
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="bg-primary/10 p-3 border-b border-primary/20">
                <div className="font-semibold text-sm">Reward Distribution</div>
                <div className="text-xs text-muted-foreground">Direct Sponsor • 10% Instant</div>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm text-muted-foreground">Full amount withdrawable</div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
  },
]

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { Badge } from '~/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Link, router } from '@inertiajs/react'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  ArrowUp01Icon,
  Download01Icon,
  MoreHorizontalCircle01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Label } from '~/components/ui/label'
import { DateTime } from 'luxon'
import { ToWords } from 'to-words'
import { route } from '@izzyjs/route/client'

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: {
        name: 'Paisa',
        plural: 'Paise',
        symbol: '',
      },
    },
  },
})

export type Purchase = {
  id: number
  amount: number
  buyerName: string
  quantity: number
  status: 'pending' | 'approved' | 'rejected' | 'stopped' | 'cancelled'
  createdAt: string
  approvedAt: string | null
  rejectedAt: string | null
  stoppedAt: string | null
  cancelledAt: string | null
  user: {
    id: number
    name: string
    email: string
    phone: string
    avatar: string | null
  }
}

export const columns: ColumnDef<Purchase>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => {
      const user = row.original.user
      return (
        <Link
          href={route('admin.purchases.user.history', { params: { userId: user.id } }).toString()}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
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
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hidden md:flex"
        >
          Date
          <HugeiconsIcon icon={ArrowUp01Icon} className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = DateTime.fromISO(row.original.createdAt)
      return (
        <div className="hidden flex-col md:flex">
          <span className="font-medium">{date.toFormat('MMM d yyyy')}</span>
          <span className="text-xs text-muted-foreground">({date.toRelative()})</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'buyerName',
    header: 'Buyer',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.buyerName}</span>
        <span className="text-xs text-muted-foreground">
          {Number(row.original.quantity).toFixed(3)} gm
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Amount
          <HugeiconsIcon icon={ArrowUp01Icon} className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)
      const inWords = toWords.convert(amount)

      return (
        <div className="flex flex-col">
          <span className="font-medium">{formatted}</span>
          <span className="text-xs text-muted-foreground capitalize">({inWords} Only)</span>
        </div>
      )
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
            status === 'approved'
              ? 'default'
              : status === 'rejected'
                ? 'destructive'
                : status === 'stopped'
                  ? 'secondary'
                  : status === 'cancelled'
                    ? 'destructive'
                    : 'secondary'
          }
          className="capitalize hidden md:inline-flex"
        >
          {status}
        </Badge>
      )
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const purchase = row.original
      return <ActionCell purchase={purchase} />
    },
  },
]

import { EditPurchaseDialog } from './edit-dialog'

function ActionCell({ purchase }: { purchase: Purchase }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'stop' | 'cancel' | null>(
    null
  )
  const [remark, setRemark] = useState('')

  const handleAction = () => {
    if (!actionType) return

    let status = ''
    if (actionType === 'approve') status = 'approved'
    else if (actionType === 'reject') status = 'rejected'
    else if (actionType === 'stop') status = 'stopped'
    else if (actionType === 'cancel') status = 'cancelled'

    router.patch(
      route('admin.purchases.update', { params: { id: purchase.id } }).toString(),
      {
        type: status,
        remark,
      },
      {
        onSuccess: () => {
          setIsOpen(false)
          setRemark('')
        },
      }
    )
  }

  const openDialog = (type: 'approve' | 'reject' | 'stop' | 'cancel') => {
    setActionType(type)
    setIsOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: 'ghost', className: 'h-8 w-8 p-0' })}
        >
          <span className="sr-only">Open menu</span>
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit Details</DropdownMenuItem>
            {purchase.status === 'approved' && (
              <DropdownMenuItem
                onClick={() => window.open(`/admin/purchases/${purchase.id}/invoice`, '_blank')}
              >
                Download Invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {purchase.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => openDialog('approve')}>Approve</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog('reject')}>Reject</DropdownMenuItem>
              </>
            )}
            {purchase.status === 'approved' && (
              <>
                <DropdownMenuItem onClick={() => openDialog('stop')}>Stop</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog('cancel')}>Cancel</DropdownMenuItem>
              </>
            )}
            {purchase.status === 'stopped' && (
              <DropdownMenuItem onClick={() => openDialog('cancel')}>Cancel</DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPurchaseDialog purchase={purchase} isOpen={isEditOpen} onOpenChange={setIsEditOpen} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this purchase? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {(actionType === 'reject' || actionType === 'stop' || actionType === 'cancel') && (
            <div className="grid gap-2 py-4">
              <Label htmlFor="remark">Remark</Label>
              <textarea
                id="remark"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter a remark..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

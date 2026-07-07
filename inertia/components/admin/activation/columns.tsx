import { ColumnDef } from '@tanstack/react-table'
import { Link, router } from '@inertiajs/react'
import { Tick01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { route } from '@izzyjs/route/client'

import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { formatDateWithRelative } from '~/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import { Image } from '~/components/ui/image'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

export type ActivationRequest = {
  id: string
  amount: number
  utr: string
  proof: { url: string } | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  user: {
    id: number
    name: string
    email: string
    phone: string
    avatar: { url: string } | null
  }
  source?: 'transaction' | 'manual'
}

export const columns: ColumnDef<ActivationRequest>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => {
      const user = row.original.user
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar?.url} alt={user.name} />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link
              href={route('admin.users.show', { params: { id: user.id } })}
              className="font-medium hover:underline"
            >
              {user.name}
            </Link>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'utr',
    header: ({ column }) => <DataTableColumnHeader column={column} label="UTR" />,
    cell: ({ row }) => {
      const utr = row.getValue('utr') as string
      const source = row.original.source

      if (source === 'manual') {
        return <div className="font-medium text-destructive">{utr}</div>
      }
      return <div className="font-mono">{utr}</div>
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Amount" />,
    cell: ({ row }) => <div>₹{row.getValue('amount')}</div>,
  },
  {
    accessorKey: 'proof',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Proof" />,
    cell: ({ row }) => {
      const proof = row.original.proof
      if (!proof) return <span className="text-muted-foreground text-xs">N/A</span>

      return (
        <Image src={proof.url} alt="Payment Proof" className="h-10 w-10 rounded-md object-cover" />
      )
    },
    enableSorting: false,
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
          <span className="text-xs text-muted-foreground">({relative})</span>
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <>
          {status === 'approved' && <Badge className="bg-green-500">Approved</Badge>}
          {status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
          {status === 'pending' && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
              Pending
            </Badge>
          )}
        </>
      )
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const request = row.original
      if (request.status !== 'pending') return null

      return (
        <div className="flex justify-end gap-2">
          <Dialog>
            <DialogTrigger className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Request</DialogTitle>
                <DialogDescription>
                  Are you sure you want to approve this activation request? This will activate the
                  user's account.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
                <Button
                  className="bg-primary"
                  onClick={() => {
                    router.patch(
                      route('admin.activation.update', { params: { id: request.id } }).toString(),
                      { type: 'approved' }
                    )
                  }}
                >
                  Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger className={buttonVariants({ size: 'sm', variant: 'destructive' })}>
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Request</DialogTitle>
                <DialogDescription>
                  Are you sure you want to reject this activation request?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    router.patch(
                      route('admin.activation.update', { params: { id: request.id } }).toString(),
                      { type: 'rejected' }
                    )
                  }}
                >
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
    },
  },
]

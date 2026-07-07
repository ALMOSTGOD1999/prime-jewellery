import { ColumnDef } from '@tanstack/react-table'
import { Link, router } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'
import { Tick01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { formatDateWithRelative } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { DataTableColumnHeader } from '~/components/data-table/data-table-column-header'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
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

export type BankRequest = {
  id: string
  name: string
  branch: string
  ifsc: string
  holderName: string
  accountNumber: string
  upi: string | null
  qr: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  user: {
    id: number
    name: string
    email: string
    phone: string
    avatar: { url: string } | null
  }
}

export const columns: ColumnDef<BankRequest>[] = [
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
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Bank Name" />,
    cell: ({ row }) => <div>{row.getValue('name')}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'accountNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Account Number" />,
    cell: ({ row }) => <div className="font-mono">{row.getValue('accountNumber')}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'ifsc',
    header: ({ column }) => <DataTableColumnHeader column={column} label="IFSC" />,
    cell: ({ row }) => <div className="font-mono">{row.getValue('ifsc')}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'holderName',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Holder Name" />,
    cell: ({ row }) => <div>{row.getValue('holderName')}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'upi',
    header: ({ column }) => <DataTableColumnHeader column={column} label="UPI" />,
    cell: ({ row }) => <div className="font-mono">{row.getValue('upi') || '-'}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'qr',
    header: ({ column }) => <DataTableColumnHeader column={column} label="QR Code" />,
    cell: ({ row }) =>
      row.original.qr ? (
        <Image src={row.original.qr} alt="QR Code" className="h-10 w-10 rounded-md object-cover" />
      ) : (
        <span className="text-muted-foreground text-xs">None</span>
      ),
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
                  Are you sure you want to approve this Bank Details request?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
                <Button
                  className="bg-primary"
                  onClick={() => {
                    router.post(route('admin.bank.update', { params: { id: request.id } }), {
                      type: 'approved',
                    })
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
                  Are you sure you want to reject this Bank Details request?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    router.post(route('admin.bank.update', { params: { id: request.id } }), {
                      type: 'rejected',
                    })
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

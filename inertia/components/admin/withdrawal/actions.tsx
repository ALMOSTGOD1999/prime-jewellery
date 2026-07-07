import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { useForm } from '@inertiajs/react'
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  MoreHorizontalCircle01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { route } from '@izzyjs/route/client'

interface WithdrawalActionsProps {
  id: number
  status: string
}

export function WithdrawalActions({ id, status }: WithdrawalActionsProps) {
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)

  const approveForm = useForm({
    status: 'approved',
    remark: '',
  })

  const rejectForm = useForm({
    status: 'rejected',
    remark: '',
  })

  const handleApprove = () => {
    approveForm.post(route('admin.withdrawal.update', { params: { id } }).toString(), {
      onSuccess: () => {
        setIsApproveOpen(false)
        toast.success('Withdrawal approved')
      },
      onError: () => toast.error('Failed to approve withdrawal'),
    })
  }

  const handleReject = () => {
    rejectForm.post(route('admin.withdrawal.update', { params: { id } }).toString(), {
      onSuccess: () => {
        setIsRejectOpen(false)
        toast.success('Withdrawal rejected')
      },
      onError: () => toast.error('Failed to reject withdrawal'),
    })
  }

  if (status !== 'pending') return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsApproveOpen(true)} className="text-green-600">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-2 h-4 w-4" />
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsRejectOpen(true)} className="text-red-600">
            <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
            Reject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this withdrawal request?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveForm.processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveForm.processing ? 'Approving...' : 'Confirm Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectForm.data.remark}
              onChange={(e) => rejectForm.setData('remark', e.target.value)}
            />
            {rejectForm.errors.remark && (
              <p className="text-sm text-red-500 mt-1">{rejectForm.errors.remark}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={rejectForm.processing || !rejectForm.data.remark}
            >
              {rejectForm.processing ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

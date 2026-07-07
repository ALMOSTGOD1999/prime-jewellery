import { useState } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Button, buttonVariants } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface AddBalanceDialogProps {
  userId: number
  userName: string
}

export function AddBalanceDialog({ userId, userName }: AddBalanceDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    if (amount <= 0) return
    setLoading(true)

    router.post(
      '/admin/wallet/add-balance',
      {
        userId,
        amount,
        remark,
      },
      {
        onSuccess: () => {
          setIsOpen(false)
          setAmount(0)
          setRemark('')
          setLoading(false)
        },
        onError: () => {
          setLoading(false)
        },
        onFinish: () => {
          setLoading(false)
        },
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({ variant: 'default', size: 'sm' })}>
        Add Balance
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Wallet Balance</DialogTitle>
          <DialogDescription>
            Add balance to <strong>{userName}</strong>'s wallet. This will create a credit
            transaction and update their wallet balance.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Enter amount"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remark">Remark (Optional)</Label>
            <Input
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Bonus, adjustment, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={amount <= 0 || loading}>
            {loading ? 'Adding...' : `Add ₹${amount.toLocaleString('en-IN')}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

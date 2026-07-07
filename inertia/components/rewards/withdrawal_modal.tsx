import { useState } from 'react'
import { useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from 'sonner'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface WithdrawalModalProps {
  maxAmount: number
  type:
    | 'cashback'
    | 'level'
    | 'salary'
    | 'activation_cashback'
    | 'activation_sponsor'
    | 'activation_level'
    | 'emi_level'
  label: string
  enabled?: boolean
  disabledMessage?: string
}

export function WithdrawalModal({
  maxAmount,
  type,
  label,
  enabled = true,
  disabledMessage,
}: WithdrawalModalProps) {
  const [open, setOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    amount: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (Number(data.amount) > maxAmount) {
      toast.error(
        `Amount cannot exceed ${new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(maxAmount)}`
      )
      return
    }

    if (Number(data.amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    // Handle activation types with nested route structure
    let endpoint = `/rewards/withdraw/${type}`
    if (type.startsWith('activation_')) {
      const subType = type.replace('activation_', '')
      endpoint = `/rewards/withdraw/activation/${subType}`
    }

    post(endpoint, {
      onSuccess: () => {
        setOpen(false)
        reset()
      },
      onError: () => {
        toast.error('Something went wrong. Please try again.')
      },
    })
  }

  if (!enabled) {
    return (
      <div className="flex flex-col gap-2">
        {disabledMessage && (
          <span className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-800">
            ⏰ {disabledMessage}
          </span>
        )}
        <Button disabled className="w-full sm:w-auto">
          Withdraw {label}
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={maxAmount <= 0} className="w-full sm:w-auto">
            Withdraw {label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Withdraw {label}</DialogTitle>
          <DialogDescription>
            Enter the amount you wish to withdraw. Available balance:
            <span className="font-bold ml-1 text-green-600">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(maxAmount)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3">
              <Input
                id="amount"
                type="number"
                value={data.amount}
                onChange={(e) => setData('amount', e.target.value)}
                placeholder="Enter amount"
                className="col-span-3"
                max={maxAmount}
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={processing}>
              {processing && (
                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
              )}
              Withdraw
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

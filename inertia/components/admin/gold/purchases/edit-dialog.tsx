import { useForm } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'
import { DateTime } from 'luxon'
import React, { useEffect } from 'react'
import { Button, buttonVariants } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '~/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import type { Purchase } from '~/components/admin/gold/purchases/columns'

interface EditPurchaseDialogProps {
  purchase: Purchase | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPurchaseDialog({ purchase, isOpen, onOpenChange }: EditPurchaseDialogProps) {
  const { data, setData, patch, processing, errors, reset, setError, clearErrors } = useForm({
    amount: '',
    buyerName: '',
    quantity: '',
    createdAt: '',
    approvedAt: '',
    rejectedAt: '',
    stoppedAt: '',
    cancelledAt: '',
  })

  useEffect(() => {
    if (purchase && isOpen) {
      reset()
      setData({
        amount: purchase.amount.toString(),
        buyerName: purchase.buyerName || purchase.user.name,
        quantity: purchase.quantity?.toString() || '1',
        createdAt: purchase.createdAt
          ? DateTime.fromISO(purchase.createdAt).toFormat("yyyy-MM-dd'T'HH:mm")
          : '',
        approvedAt: purchase.approvedAt
          ? DateTime.fromISO(purchase.approvedAt).toFormat("yyyy-MM-dd'T'HH:mm")
          : '',
        rejectedAt: purchase.rejectedAt
          ? DateTime.fromISO(purchase.rejectedAt).toFormat("yyyy-MM-dd'T'HH:mm")
          : '',
        stoppedAt: purchase.stoppedAt
          ? DateTime.fromISO(purchase.stoppedAt).toFormat("yyyy-MM-dd'T'HH:mm")
          : '',
        cancelledAt: purchase.cancelledAt
          ? DateTime.fromISO(purchase.cancelledAt).toFormat("yyyy-MM-dd'T'HH:mm")
          : '',
      })
    }
  }, [purchase, isOpen])

  // Mutual Exclusion Logic
  useEffect(() => {
    if (data.rejectedAt) {
      if (data.approvedAt) setData('approvedAt', '')
      if (data.stoppedAt) setData('stoppedAt', '')
    }
  }, [data.rejectedAt])

  useEffect(() => {
    if (data.approvedAt) {
      if (data.rejectedAt) setData('rejectedAt', '')
    }
  }, [data.approvedAt])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Client-side Validation
    let hasError = false

    if (data.stoppedAt) {
      if (!data.approvedAt) {
        setError('stoppedAt', 'Available only for approved purchases')
        hasError = true
      } else if (data.stoppedAt < data.approvedAt) {
        setError('stoppedAt', 'Cannot be before Approved Date')
        hasError = true
      }
    }

    if (data.cancelledAt) {
      let refDate = ''
      if (data.stoppedAt) refDate = data.stoppedAt
      else if (data.approvedAt) refDate = data.approvedAt
      else if (data.rejectedAt) refDate = data.rejectedAt

      if (refDate && data.cancelledAt < refDate) {
        setError('cancelledAt', 'Cannot be before previous status date')
        hasError = true
      }
    }

    if (hasError) return
    if (!purchase) return

    patch(route('admin.purchases.update.details', { params: { id: purchase.id } }).toString(), {
      onSuccess: () => {
        onOpenChange(false)
        reset()
      },
    })
  }

  const renderDateField = (label: string, field: keyof typeof data) => {
    const value = data[field]
    const dt = value ? DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm") : null
    const date = dt?.toJSDate()
    const time = dt?.toFormat('HH:mm') || ''

    const handleDateSelect = (newDate: Date | undefined) => {
      if (!newDate) {
        setData(field, '')
        return
      }
      const newDt = DateTime.fromJSDate(newDate).set({
        hour: dt?.hour || 0,
        minute: dt?.minute || 0,
      })
      setData(field, newDt.toFormat("yyyy-MM-dd'T'HH:mm"))
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value
      if (!date) return // Should not happen if time input is disabled when no date

      const [hours, minutes] = newTime.split(':').map(Number)
      const newDt = DateTime.fromJSDate(date).set({ hour: hours, minute: minutes })
      setData(field, newDt.toFormat("yyyy-MM-dd'T'HH:mm"))
    }

    return (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={field} className="text-right">
          {label}
        </Label>
        <div className="col-span-3 flex gap-2">
          <Popover>
            <PopoverTrigger
              className={buttonVariants({
                variant: 'outline',
                className: cn(
                  'flex-1 justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                ),
              })}
            >
              <HugeiconsIcon icon={Calendar03Icon} className="mr-2 h-4 w-4" />
              {date ? (
                DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_MED)
              ) : (
                <span>Pick a date</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date || undefined}
                onSelect={handleDateSelect}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={time}
            onChange={handleTimeChange}
            disabled={!date}
            className="w-auto min-w-[100px]"
          />
        </div>
        {errors[field] && (
          <div className="col-start-2 col-span-3 text-xs text-destructive">{errors[field]}</div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Purchase Details</DialogTitle>
          <DialogDescription>
            Update the purchase amount or timestamps. Use caution as this directly affects records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="buyerName" className="text-right">
              Buyer Name
            </Label>
            <div className="col-span-3">
              <Input
                id="buyerName"
                type="text"
                value={data.buyerName}
                onChange={(e) => setData('buyerName', e.target.value)}
              />
              {errors.buyerName && (
                <span className="text-xs text-destructive">{errors.buyerName}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity (gm)
            </Label>
            <div className="col-span-3">
              <Input
                id="quantity"
                type="number"
                step="0.001"
                value={data.quantity}
                onChange={(e) => setData('quantity', e.target.value)}
                min="0.001"
              />
              {errors.quantity && (
                <span className="text-xs text-destructive">{errors.quantity}</span>
              )}
            </div>
          </div>

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
                min="1"
              />
              {errors.amount && <span className="text-xs text-destructive">{errors.amount}</span>}
            </div>
          </div>

          {renderDateField('Created At', 'createdAt')}
          {!data.rejectedAt && renderDateField('Approved At', 'approvedAt')}
          {!data.approvedAt && renderDateField('Rejected At', 'rejectedAt')}
          {data.approvedAt && renderDateField('Stopped At', 'stoppedAt')}
          {renderDateField('Cancelled At', 'cancelledAt')}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={processing} onClick={submit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

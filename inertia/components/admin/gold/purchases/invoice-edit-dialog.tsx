import { useState, useEffect } from 'react'
import { route } from '@izzyjs/route/client'
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
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading01Icon, Pdf01Icon } from '@hugeicons/core-free-icons'
import type { Purchase } from '~/components/admin/gold/purchases/columns'

const CARATS = ['18ct', '22ct', '24ct'] as const

interface InvoiceEditDialogProps {
  purchase: Purchase | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceEditDialog({ purchase, isOpen, onOpenChange }: InvoiceEditDialogProps) {
  const [buyerName, setBuyerName] = useState('')
  const [ornamentName, setOrnamentName] = useState('')
  const [goldCarat, setGoldCarat] = useState('22ct')
  const [quantity, setQuantity] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (purchase && isOpen) {
      setBuyerName(purchase.buyerName || purchase.user.name)
      setOrnamentName('')
      setGoldCarat('22ct')
      setQuantity(purchase.quantity?.toString() || '')
      setTotalAmount(purchase.amount?.toString() || '')
    }
  }, [purchase, isOpen])

  const handleGenerate = async () => {
    if (!purchase) return
    setGenerating(true)

    try {
      const params = new URLSearchParams()
      if (buyerName) params.set('buyerName', buyerName)
      if (ornamentName) params.set('ornamentName', ornamentName)
      if (goldCarat) params.set('goldCarat', goldCarat)
      if (quantity) params.set('quantity', quantity)
      if (totalAmount) params.set('totalAmount', totalAmount)

      const url = route('purchases.invoice.generate', { params: { id: purchase.id } }).toString()
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      if (!response.ok) {
        const err = await response.json()
        alert(err.error || 'Failed to generate invoice')
        return
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `purchase-invoice-${purchase.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      onOpenChange(false)
    } catch (error) {
      alert('Failed to generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  const fieldRow = (label: string, field: string, value: string, onChange: (v: string) => void, type = 'text', opts?: { min?: string; step?: string; placeholder?: string }) => (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={field} className="text-right text-sm">
        {label}
      </Label>
      <div className="col-span-3">
        <Input
          id={field}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={opts?.min}
          step={opts?.step}
          placeholder={opts?.placeholder}
        />
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Invoice Before Download</DialogTitle>
          <DialogDescription>
            Modify the fields below to customize the invoice PDF. Leave a field blank to keep the
            original value.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {fieldRow('Buyer Name', 'buyerName', buyerName, setBuyerName, 'text', {
            placeholder: purchase?.user.name,
          })}
          {fieldRow('Ornament', 'ornamentName', ornamentName, setOrnamentName, 'text', {
            placeholder: 'e.g. Gold Necklace',
          })}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Gold Carat</Label>
            <div className="col-span-3">
              <Select value={goldCarat} onValueChange={(v) => setGoldCarat(v || '22ct')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select carat" className="capitalize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CARATS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {fieldRow('Weight (gm)', 'quantity', quantity, setQuantity, 'number', {
            min: '0.001',
            step: '0.001',
            placeholder: purchase?.quantity?.toString(),
          })}
          {fieldRow('Total Amount', 'totalAmount', totalAmount, setTotalAmount, 'number', {
            min: '1',
            placeholder: `₹${purchase?.amount}`,
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <HugeiconsIcon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Pdf01Icon} className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

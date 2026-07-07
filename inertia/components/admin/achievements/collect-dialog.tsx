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
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { route } from '@izzyjs/route/client'
import { DateTime } from 'luxon'

interface CollectDialogProps {
  achievementId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CollectDialog({ achievementId, open, onOpenChange }: CollectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined

  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const { data, setData, post, processing, reset, errors } = useForm({
    collectedAt: DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route('admin.achievements.collect', { params: { id: achievementId } }).toString(), {
      onSuccess: () => {
        setIsOpen && setIsOpen(false)
        reset()
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Collect Achievement</DialogTitle>
          <DialogDescription>
            Set the date and time when this achievement was collected.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="collectedAt" className="text-right">
                Collected At
              </Label>
              <Input
                id="collectedAt"
                type="datetime-local"
                value={data.collectedAt}
                onChange={(e) => setData('collectedAt', e.target.value)}
                className="col-span-3"
              />
            </div>
            {errors.collectedAt && <p className="text-red-500 text-sm">{errors.collectedAt}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={processing}>
              {processing ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

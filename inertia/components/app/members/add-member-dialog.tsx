import * as React from 'react'
import { useForm } from '@inertiajs/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button, buttonVariants } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import PasswordInput from '~/components/ui/password-input'

export function AddMemberDialog() {
  const [open, setOpen] = React.useState(false)
  const [parentName, setParentName] = React.useState('')
  const [parentLoading, setParentLoading] = React.useState(false)
  const [parentError, setParentError] = React.useState('')
  const lookupTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm({
    type: 'user',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  })

  const lookupParent = React.useCallback((id: string) => {
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current)
    }

    if (!id) {
      setParentName('')
      setParentError('')
      return
    }

    setParentLoading(true)
    setParentError('')

    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/members/${id}/lookup`)
        if (res.ok) {
          const user = await res.json()
          setParentName(user.name)
          setParentError('')
        } else if (res.status === 404) {
          setParentName('')
          setParentError('User not found')
        } else {
          setParentName('')
          setParentError('Lookup failed')
        }
      } catch {
        setParentName('')
        setParentError('Lookup failed')
      } finally {
        setParentLoading(false)
      }
    }, 400)
  }, [])

  React.useEffect(() => {
    return () => {
      if (lookupTimerRef.current) {
        clearTimeout(lookupTimerRef.current)
      }
    }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/members', {
      onSuccess: () => {
        form.reset()
        setOpen(false)
        setParentName('')
        setParentError('')
      },
      preserveScroll: true,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setParentName('')
          setParentError('')
        }
      }}
    >
      <DialogTrigger className={buttonVariants()}>
        <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
        Add Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>Manually add a new member to your downline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                placeholder="John Doe"
              />
              {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.data.phone}
                onChange={(e) => form.setData('phone', e.target.value)}
                placeholder="9876543210"
              />
              {form.errors.phone && <p className="text-sm text-destructive">{form.errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)}
                placeholder="john@example.com"
              />
              {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                type="password"
                value={form.data.password}
                onChange={(e) => form.setData('password', e.target.value)}
              />
              {form.errors.password && (
                <p className="text-sm text-destructive">{form.errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                type="password"
                value={form.data.confirmPassword}
                onChange={(e) => form.setData('confirmPassword', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode">Parent ID (User ID)</Label>
              <Input
                id="inviteCode"
                type="text"
                value={form.data.inviteCode || ''}
                onChange={(e) => {
                  form.setData('inviteCode', e.target.value)
                  lookupParent(e.target.value)
                }}
                placeholder="Enter parent user ID"
              />
              {parentLoading && <p className="text-xs text-muted-foreground">Looking up user...</p>}
              {parentName && !parentLoading && (
                <p className="text-xs text-green-600 font-medium">{parentName}</p>
              )}
              {parentError && !parentLoading && (
                <p className="text-xs text-destructive">{parentError}</p>
              )}
              {form.errors.inviteCode && (
                <p className="text-sm text-destructive">{form.errors.inviteCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Account Type</Label>
              <Select
                value={form.data.type}
                onValueChange={(value) => value && form.setData('type', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                </SelectContent>
              </Select>
              {form.errors.type && <p className="text-sm text-destructive">{form.errors.type}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

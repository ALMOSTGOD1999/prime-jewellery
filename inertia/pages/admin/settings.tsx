import { Head, useForm } from '@inertiajs/react'
import { useState } from 'react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  LockPasswordIcon,
  CheckmarkCircle01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons'

export default function AdminSettingsPage() {
  const form = useForm({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [success, setSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    if (form.data.newPassword !== form.data.confirmPassword) {
      form.setError('confirmPassword', 'Passwords do not match')
      return
    }

    form.post('/admin/settings/password', {
      onSuccess: () => {
        setSuccess(true)
        form.reset()
        setTimeout(() => setSuccess(false), 3000)
      },
    })
  }

  return (
    <>
      <Head title="Admin Settings" />
      <AppLayout>
        <Header>Settings</Header>
        <Main className="max-w-xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HugeiconsIcon icon={LockPasswordIcon} className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription>Update your admin account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      value={form.data.currentPassword}
                      onChange={(e) => form.setData('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={showCurrent ? ViewOffIcon : ViewIcon}
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={form.data.newPassword}
                      onChange={(e) => form.setData('newPassword', e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon icon={showNew ? ViewOffIcon : ViewIcon} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.data.confirmPassword}
                      onChange={(e) => form.setData('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={showConfirm ? ViewOffIcon : ViewIcon}
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                  {form.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{form.errors.confirmPassword}</p>
                  )}
                </div>

                {success && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="h-5 w-5 text-green-600"
                      />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Password updated successfully!
                      </span>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={form.processing} className="w-full">
                  {form.processing ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}

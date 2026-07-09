import { Head, useForm } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { SecurityLockIcon } from '@hugeicons/core-free-icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export default function BusinessEngineGate() {
  const form = useForm({ password: '' })

  return (
    <>
      <Head title="Business Engine - Access Required" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <Card className="w-full max-w-md border-slate-700/50 bg-slate-900/90 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={SecurityLockIcon} className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Business Engine</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Advanced Configuration — Authorization Required
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.post('/admin/system/advanced/business-engine/gate')
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Enter Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="········"
                  value={form.data.password}
                  onChange={(e) => form.setData('password', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={form.processing}>
                {form.processing ? 'Verifying...' : 'Access Business Engine'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

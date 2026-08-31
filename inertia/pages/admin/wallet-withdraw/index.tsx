import { Head, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  MoneySendSquareIcon,
  Wallet01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { formatCurrency } from '~/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

interface UserResult {
  id: number
  name: string
  email: string
  phone: string
  workingWallet: number
  status: string
  activatedAt: string | null
}

interface WalletWithdrawPageProps {
  users: UserResult[]
  search: string
}

export default function AdminWalletWithdrawPage({ users, search: initialSearch }: WalletWithdrawPageProps) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [remark, setRemark] = useState('')

  const { post, processing } = useForm()

  const handleSearch = () => {
    router.get(
      '/admin/wallet-withdraw',
      { search },
      { preserveState: true, replace: true }
    )
  }

  const handleWithdraw = () => {
    if (!selectedUser) return

    post('/admin/wallet-withdraw/withdraw', {
      userId: selectedUser.id,
      remark: remark || undefined,
    }, {
      onSuccess: () => {
        setIsWithdrawOpen(false)
        setSelectedUser(null)
        setRemark('')
      },
    })
  }

  const openWithdrawDialog = (user: UserResult) => {
    setSelectedUser(user)
    setIsWithdrawOpen(true)
  }

  return (
    <>
      <Head title="Wallet Withdrawal" />
      <AppLayout>
        <Header>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={MoneySendSquareIcon} className="h-5 w-5" />
            Working Wallet Withdrawal
          </div>
        </Header>
        <Main className="space-y-4">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
                Search User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Search by name, ID, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <HugeiconsIcon icon={Search01Icon} className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5" />
                Search Results ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {initialSearch
                    ? 'No users found matching your search.'
                    : 'Enter a search query to find users.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Working Wallet</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs">{user.id}</td>
                          <td className="py-3 px-4 font-medium">{user.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.phone}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-mono font-medium ${user.workingWallet > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                              {formatCurrency(user.workingWallet)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                user.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : user.status === 'blocked'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant={user.workingWallet > 0 ? 'destructive' : 'outline'}
                              disabled={user.workingWallet <= 0}
                              onClick={() => openWithdrawDialog(user)}
                            >
                              <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 mr-1" />
                              Withdraw
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdraw Confirmation Dialog */}
          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Working Wallet Withdrawal</DialogTitle>
                <DialogDescription>
                  This will withdraw the entire working wallet balance and wipe it to ₹0. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>

              {selectedUser && (
                <div className="space-y-4">
                  <div className="rounded-md border p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">User</span>
                      <span className="text-sm font-medium">{selectedUser.name} ({selectedUser.id})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Working Wallet Balance</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedUser.workingWallet)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="remark">Remark (optional)</Label>
                    <Input
                      id="remark"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Reason for withdrawal..."
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm Withdrawal'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Main>
      </AppLayout>
    </>
  )
}

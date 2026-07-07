import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { WalletHistoryDataTable } from '~/components/admin/wallet/history-data-table'
import { Button } from '~/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

interface WalletUserHistoryPageProps {
  targetUser: {
    id: number
    name: string
    email: string
    phone: string
    walletBalance: number
  }
  transactions: {
    data: any[]
    meta: any
  }
}

export default function WalletUserHistoryPage({ targetUser, transactions }: WalletUserHistoryPageProps) {
  return (
    <>
      <Head title={`${targetUser.name} - Wallet History`} />
      <AppLayout>
        <Header>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
            </Button>
            {targetUser.name}'s Wallet History
          </div>
        </Header>
        <Main>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">User</p>
                <p className="text-lg font-semibold">{targetUser.name}</p>
                <p className="text-xs text-muted-foreground">{targetUser.email} · {targetUser.phone}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Current Wallet Balance</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{Number(targetUser.walletBalance).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">User ID: {targetUser.id}</p>
              </div>
            </div>
            <WalletHistoryDataTable data={transactions.data} meta={transactions.meta} />
          </div>
        </Main>
      </AppLayout>
    </>
  )
}

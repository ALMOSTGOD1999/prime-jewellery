import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { WalletHistoryDataTable } from '~/components/admin/wallet/history-data-table'
import { Button } from '~/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

export default function AdminWalletUserHistoryPage({ targetUser, transactions }: any) {
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
          <div className="mb-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Current Wallet Balance</p>
              <p className="text-2xl font-bold text-primary">
                ₹{Number(targetUser.walletBalance).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <WalletHistoryDataTable
            data={transactions.data}
            meta={transactions.meta}
          />
        </Main>
      </AppLayout>
    </>
  )
}

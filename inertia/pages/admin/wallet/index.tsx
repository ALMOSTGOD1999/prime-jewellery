import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { columns } from '~/components/admin/wallet/columns'
import { WalletDataTable } from '~/components/admin/wallet/data-table'

export default function AdminWalletPage({ wallets, totalWalletBalance }: any) {
  return (
    <>
      <Head title="Wallet Management" />
      <AppLayout>
        <Header>Wallet Management</Header>
        <Main>
          <div className="mb-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Wallet Balance (All Users)</p>
              <p className="text-2xl font-bold text-primary">
                ₹{Number(totalWalletBalance).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <WalletDataTable
            columns={columns}
            data={wallets.data}
            meta={wallets.meta}
          />
        </Main>
      </AppLayout>
    </>
  )
}

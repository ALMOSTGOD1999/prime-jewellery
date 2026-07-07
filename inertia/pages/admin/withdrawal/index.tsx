import { Head } from '@inertiajs/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { AdminWithdrawalDataTable } from '~/components/admin/withdrawal/data-table'
import { columns } from '~/components/admin/withdrawal/columns'

export default function AdminWithdrawalPage({ withdrawals, stats }: any) {
  return (
    <>
      <Head title="Withdrawals" />
      <AppLayout>
        <Header>
          <h3 className="text-2xl font-bold">Withdrawals</h3>
        </Header>
        <Main>
          <AdminWithdrawalDataTable
            columns={columns}
            data={withdrawals.data}
            meta={withdrawals.meta}
            stats={stats}
          />
        </Main>
      </AppLayout>
    </>
  )
}

import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { columns } from '~/components/admin/gold/purchases/columns'
import { AdminGoldPurchasesDataTable } from '~/components/admin/gold/purchases/data-table'

export default function AdminGoldPurchasesPage({ purchases }: any) {
  return (
    <>
      <Head title="Gold Purchases" />
      <AppLayout>
        <Header>Gold Purchases</Header>
        <Main>
          <AdminGoldPurchasesDataTable
            columns={columns}
            data={purchases.data}
            meta={purchases.meta}
          />
        </Main>
      </AppLayout>
    </>
  )
}

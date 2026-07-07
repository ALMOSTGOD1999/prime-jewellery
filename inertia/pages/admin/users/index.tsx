import { Head } from '@inertiajs/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { AdminUsersDataTable } from '~/components/admin/users/data-table'
import { columns } from '~/components/admin/users/columns'

export default function AdminUsersPage({ members }: any) {
  return (
    <>
      <Head title="Users" />
      <AppLayout>
        <Header>
          <h3 className="text-2xl font-bold">Users</h3>
        </Header>
        <Main>
          <AdminUsersDataTable
            columns={columns}
            data={members.data}
            meta={members.meta}
            counts={members.counts}
          />
        </Main>
      </AppLayout>
    </>
  )
}

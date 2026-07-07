import { Head } from '@inertiajs/react'

import type { InferPageProps } from '@adonisjs/inertia/types'
import type AdminBankController from '#controllers/admin/bank_controller'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { AdminBankDataTable } from '~/components/admin/bank/data-table'
import { columns } from '~/components/admin/bank/columns'

export default function AdminBankPage({ requests }: InferPageProps<AdminBankController, 'index'>) {
  const { data, meta, counts } = requests as any
  return (
    <AppLayout>
      <Head title="Bank Requests" />
      <Header>Bank Requests</Header>
      <Main className="space-y-6">
        <AdminBankDataTable columns={columns} data={data} meta={meta} counts={counts} />
      </Main>
    </AppLayout>
  )
}

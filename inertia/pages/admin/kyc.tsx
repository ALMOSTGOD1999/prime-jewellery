import { InferPageProps } from '@adonisjs/inertia/types'
import { Head } from '@inertiajs/react'

import type AdminKycController from '#controllers/admin/kyc_controller'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { AdminKycDataTable } from '~/components/admin/kyc/data-table'
import { columns } from '~/components/admin/kyc/columns'

export default function AdminKycPage({ requests }: InferPageProps<AdminKycController, 'index'>) {
  const { data, meta, counts } = requests as any

  return (
    <>
      <Head title="KYC Requests" />
      <AppLayout>
        <Header>KYC Requests</Header>
        <Main className="space-y-6">
          <AdminKycDataTable columns={columns} data={data} meta={meta} counts={counts} />
        </Main>
      </AppLayout>
    </>
  )
}

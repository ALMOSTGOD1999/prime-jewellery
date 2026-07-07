import { Head, Link } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { columns } from '~/components/admin/gold/purchases/columns'
import { AdminGoldPurchasesDataTable } from '~/components/admin/gold/purchases/data-table'
import { Button, buttonVariants } from '~/components/ui/button'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { route } from '@izzyjs/route/client'

export default function AdminGoldUserPurchaseHistoryPage({ purchases, targetUser }: any) {
  return (
    <>
      <Head title={`${targetUser.name}'s Purchase History`} />
      <AppLayout>
        <Header>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
            </Button>
            {targetUser.name}'s Purchase History
          </div>
        </Header>
        <Main>
          <AdminGoldPurchasesDataTable
            columns={columns}
            data={purchases.data}
            meta={purchases.meta}
            hiddenColumns={['user']}
            hideSearch={true}
            toolbarActions={
              <Link
                href={route('admin.users.show', { params: { id: targetUser.id } }).toString()}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                View Profile
              </Link>
            }
          />
        </Main>
      </AppLayout>
    </>
  )
}

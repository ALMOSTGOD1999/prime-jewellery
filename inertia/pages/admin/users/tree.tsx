import { Head, Link } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { buttonVariants } from '~/components/ui/button'
import OrgChart, { type OrgChartUser } from '~/components/tree/org-chart'
import { route } from '@izzyjs/route/client'

export default function AdminUserTreePage({ rootUser }: { rootUser: OrgChartUser }) {
  return (
    <>
      <Head title={`Tree View - ${rootUser.name}`} />
      <AppLayout>
        <Header>Tree View</Header>
        <Main className="h-[calc(100dvh-4rem)] flex flex-col">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="pt-2 pb-4">
              <div className="flex items-center gap-4">
                <Link
                  href={route('admin.users.show', { params: { id: rootUser.id } })}
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
                </Link>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Tree View: {rootUser.name}</h2>
                  <p className="text-muted-foreground">
                    View network hierarchy for {rootUser.name}.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrgChart rootUser={rootUser} />
            </div>
          </div>
        </Main>
      </AppLayout>
    </>
  )
}

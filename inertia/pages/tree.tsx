import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import OrgChart, { type OrgChartUser } from '~/components/tree/org-chart'

export default function TreePage({ rootUser }: { rootUser: OrgChartUser }) {
  return (
    <>
      <Head title="Tree View" />
      <AppLayout>
        <Header>Tree View</Header>
        <Main className="h-[calc(100dvh-4rem)] flex flex-col">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="pt-2 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Tree View</h2>
                  <p className="text-muted-foreground">View your network hierarchy.</p>
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

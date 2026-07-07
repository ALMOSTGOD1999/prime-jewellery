import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Achievement, columns } from '~/components/achievements/columns'
import { AchievementsDataTable } from '~/components/achievements/data-table'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'

export default function AchievementsPage({
  achievements,
  filters,
}: {
  achievements: { data: Achievement[]; meta: any }
  filters: any
}) {
  return (
    <AppLayout>
      <Head title="Achievements" />
      <Header>Achievements</Header>
      <Main>
        <AchievementsDataTable
          columns={columns}
          data={achievements.data}
          meta={achievements.meta}
          filters={filters}
        />
      </Main>
    </AppLayout>
  )
}

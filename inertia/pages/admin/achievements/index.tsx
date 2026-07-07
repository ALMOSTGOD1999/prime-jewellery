import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { AdminAchievement, columns } from '~/components/admin/achievements/columns'
import { AdminAchievementsDataTable } from '~/components/admin/achievements/data-table'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'

export default function AdminAchievementsPage({
  achievements,
  filters,
  targetUser,
}: {
  achievements: { data: AdminAchievement[]; meta: any }
  filters: any
  targetUser?: any
}) {
  return (
    <AppLayout>
      <Head title="All Achievements" />
      <Header>All Achievements</Header>
      <Main>
        <AdminAchievementsDataTable
          columns={columns}
          data={achievements.data}
          meta={achievements.meta}
          filters={filters}
          targetUser={targetUser}
        />
      </Main>
    </AppLayout>
  )
}

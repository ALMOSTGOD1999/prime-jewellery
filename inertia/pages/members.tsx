import { Head } from '@inertiajs/react'
import type { Member } from '~/components/app/members/schema'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { MembersTable } from '~/components/app/members/members-table'

export default function MembersPage({
  members,
  counts,
  maxDepth,
}: {
  members: Member[]
  counts: { direct: number; team: number }
  maxDepth: number
}) {
  return (
    <>
      <Head title="Members" />
      <AppLayout>
        <Header>Members</Header>
        <Main className="">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="h-full overflow-y-auto">
              <MembersTable data={members} counts={counts} maxDepth={maxDepth} />
            </div>
          </div>
        </Main>
      </AppLayout>
    </>
  )
}

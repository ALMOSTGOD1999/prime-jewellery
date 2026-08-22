import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, UserGroup02Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { formatUserId } from '~/lib/utils'
import { formatDate } from '~/lib/format'

interface TeamMember {
  id: number
  name: string
  activated_at: string | null
  created_at: string
  status: string
  total_business: number
}

interface TeamProps {
  members: TeamMember[]
  page: number
  totalPages: number
  total: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function TeamPage({ members, page, totalPages, total }: TeamProps) {
  return (
    <>
      <Head title="Total Team" />
      <AppLayout>
        <Header>Total Team</Header>
        <Main className="space-y-6">
          <button
            onClick={() => router.get('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            Back to Dashboard
          </button>

          {/* Summary */}
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Team Members</p>
            <p className="text-2xl font-bold tracking-tight text-gold">{total}</p>
          </div>

          {/* Members list */}
          {members.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gold/10 text-gold mb-4">
                  <HugeiconsIcon icon={UserGroup02Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No team members yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {members.map((m) => {
                  const isActive = !!m.activated_at
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Active/Inactive dot */}
                      <div className="relative shrink-0">
                        <span
                          className={`block size-3 rounded-full ${
                            isActive
                              ? 'bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                              : 'bg-rose-400'
                          }`}
                        />
                        {isActive && (
                          <span className="absolute inset-0 block size-3 rounded-full bg-emerald animate-ping opacity-40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <span className="text-xs text-muted-foreground">{formatUserId(m.id, 'user')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isActive ? 'Activated' : 'Joined'} {formatDate(m.created_at)}
                        </p>
                      </div>

                      {/* Business */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(m.total_business))}
                        </p>
                        <p className="text-xs text-muted-foreground">Business</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => router.get(`/dashboard/team?page=${page - 1}`)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => router.get(`/dashboard/team?page=${page + 1}`)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}

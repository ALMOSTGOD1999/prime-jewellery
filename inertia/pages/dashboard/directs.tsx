import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, UserIcon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { formatUserId } from '~/lib/utils'
import { formatDate } from '~/lib/format'

interface Direct {
  id: number
  name: string
  activated_at: string | null
  created_at: string
  status: string
  leg: string | null
  total_business: number
  team_count: number
}

interface DirectsProps {
  directs: Direct[]
  total: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function DirectsPage({ directs, total }: DirectsProps) {
  return (
    <>
      <Head title="Self Directs" />
      <AppLayout>
        <Header>Self Directs</Header>
        <Main className="space-y-6">
          <button
            onClick={() => router.get('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            Back to Dashboard
          </button>

          {/* Summary */}
          <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/20 via-sky/5 to-transparent p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Direct Referrals</p>
            <p className="text-2xl font-bold tracking-tight text-sky">{total}</p>
          </div>

          {/* Directs list */}
          {directs.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-sky/10 text-sky mb-4">
                  <HugeiconsIcon icon={UserIcon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No direct referrals yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {directs.map((d) => {
                  const isActive = !!d.activated_at
                  return (
                    <div
                      key={d.id}
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
                          <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                          <span className="text-xs text-muted-foreground">{formatUserId(d.id, 'user')}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(d.created_at)}
                          </p>
                          {d.leg && (
                            <Badge variant="outline" className="text-[10px] bg-sky/5 text-sky border-sky/20">
                              {d.leg === 'left' ? 'Left Leg' : 'Right Leg'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(d.total_business))}
                        </p>
                        <p className="text-xs text-muted-foreground">{d.team_count} in team</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}

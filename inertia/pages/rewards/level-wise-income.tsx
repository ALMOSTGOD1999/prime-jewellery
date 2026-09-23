import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { formatCurrency } from '~/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

type LevelData = {
  level: number
  percentage: number
  memberCount: number
  totalAmount: number
  totalBusiness: number
  members: { userId: number; cumulativeAmount: number; reward: number }[]
}

type LevelWiseProps = {
  levelWise: {
    levels: LevelData[]
    total: number
    totalMembers: number
    totalBusiness: number
  }
  isPayoutReleased: boolean
  user: { id: number; name: string; code: string }
}

export default function LevelWiseIncomePage({ levelWise, isPayoutReleased, user }: LevelWiseProps) {
  return (
    <>
      <Head title="Level Wise Income" />
      <AppLayout>
        <Header>Level Wise Income — {user.code}</Header>
        <Main className="space-y-6">
          {!isPayoutReleased && (
            <Alert className="border-amber-200 bg-amber-50/50">
              <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
              <AlertDescription className="text-amber-700">
                Level wise income will be visible after the admin processes the month-end payout.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Level Income</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(levelWise.total)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Members</CardDescription>
                <CardTitle className="text-2xl">{levelWise.totalMembers}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Team Business</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(levelWise.totalBusiness)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Levels Earning</CardDescription>
                <CardTitle className="text-2xl">{levelWise.levels.length} / 8</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income by Level</CardTitle>
              <CardDescription>Monthly — full month, no day prorating (IST). Purchases on any day in the month earn the full %.</CardDescription>
            </CardHeader>
            <CardContent>
              {levelWise.levels.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No level income this month. Build your team to unlock levels.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-3 pr-4">Level</th>
                        <th className="py-3 pr-4">%</th>
                        <th className="py-3 pr-4">Members</th>
                        <th className="py-3 pr-4">Business</th>
                        <th className="py-3 pr-4">Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {levelWise.levels.map((lvl) => (
                        <tr key={lvl.level} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 pr-4">
                            <Badge variant={lvl.level <= 2 ? 'default' : 'secondary'}>L{lvl.level}</Badge>
                          </td>
                          <td className="py-3 pr-4">{lvl.percentage}%</td>
                          <td className="py-3 pr-4">{lvl.memberCount}</td>
                          <td className="py-3 pr-4">{formatCurrency(lvl.totalBusiness)}</td>
                          <td className="py-3 pr-4 font-medium text-emerald-600">{formatCurrency(lvl.totalAmount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-semibold bg-muted/20">
                        <td className="py-3 pr-4" colSpan={3}>Total</td>
                        <td className="py-3 pr-4">{formatCurrency(levelWise.totalBusiness)}</td>
                        <td className="py-3 pr-4 text-emerald-600">{formatCurrency(levelWise.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {levelWise.levels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Level Details</CardTitle>
                <CardDescription>Members per level with business and reward</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {levelWise.levels.map((lvl) => (
                  <div key={lvl.level} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>L{lvl.level}</Badge>
                      <span className="text-sm font-medium">{lvl.percentage}% — {lvl.memberCount} members — {formatCurrency(lvl.totalAmount)}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {lvl.members.map((m) => (
                        <div key={m.userId} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">PJ{String(m.userId).padStart(6, '0')}</p>
                          <p className="text-muted-foreground">Business {formatCurrency(m.cumulativeAmount)}</p>
                          <p className="text-emerald-600 font-medium">Income {formatCurrency(m.reward)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}

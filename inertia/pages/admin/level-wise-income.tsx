import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { formatCurrency } from '~/lib/utils'

type LevelData = {
  level: number
  percentage: number
  memberCount: number
  totalAmount: number
  totalBusiness: number
  members: { userId: number; cumulativeAmount: number; reward: number }[]
}

type AdminLevelWiseProps = {
  levelWise: {
    levels: LevelData[]
    total: number
    totalMembers: number
    totalBusiness: number
  }
  isPayoutReleased: boolean
  targetUser: { id: number; name: string; code: string }
  isSearch: boolean
  searchId: string
}

export default function AdminLevelWiseIncomePage({ levelWise, targetUser, isSearch, searchId }: AdminLevelWiseProps) {
  const [search, setSearch] = useState(searchId || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const id = search.replace(/\D/g, '')
    if (id) {
      router.get(`/admin/level-wise-income?userId=${id}`)
    }
  }

  return (
    <>
      <Head title="Level Wise Income — Admin" />
      <AppLayout>
        <Header>Level Wise Income — Admin</Header>
        <Main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search User</CardTitle>
              <CardDescription>Enter PJ ID (e.g., 588695 or PJ588695) to view their level wise income</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Enter PJ ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit">Search</Button>
                {isSearch && (
                  <Button type="button" variant="outline" onClick={() => router.get('/admin/level-wise-income')}>
                    Clear
                  </Button>
                )}
              </form>
              {isSearch && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Showing for <span className="font-medium text-foreground">{targetUser.code} — {targetUser.name}</span>
                </p>
              )}
            </CardContent>
          </Card>

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
                <CardDescription>Target User</CardDescription>
                <CardTitle className="text-lg">{targetUser.code}</CardTitle>
                <CardDescription>{targetUser.name}</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income by Level</CardTitle>
              <CardDescription>Monthly IST — {targetUser.code}'s level wise breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {levelWise.levels.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No level income for this user this month.</p>
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
        </Main>
      </AppLayout>
    </>
  )
}

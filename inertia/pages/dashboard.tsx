import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert'
import useUser from '~/hooks/use-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { InviteSection } from '~/components/dashboard/invite-section'
import { formatUserId } from '~/lib/utils'
import { formatDate } from '~/lib/format'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserGroup02Icon,
  UserIcon,
  Wallet01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  InformationCircleIcon,
  Calendar01Icon,
} from '@hugeicons/core-free-icons'

interface DashboardProps {
  metrics: {
    myDirects: number
    myTeam: number
    myBusiness: number
    myBusinessMonth: number
    directBusiness: number
    teamBusiness: number
    teamBusinessMonth: number
    powerToday: number
    weakerToday: number
    designation: string
  }
  goldPrice: string
  userId: number
  isPayoutReleased: boolean
  incomeWallet: number
  workingWallet: number
}

export default function DashboardPage({
  metrics,
  goldPrice,
  userId,
  isPayoutReleased,
  incomeWallet,
  workingWallet,
}: DashboardProps) {
  const user = useUser()!

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const statCards = [
    {
      title: 'Total Team',
      value: metrics?.myTeam || 0,
      subtitle: 'Active Network',
      icon: UserGroup02Icon,
      gradient: 'from-gold/20 via-gold/5 to-transparent',
      border: 'border-gold/20',
      iconBg: 'bg-gold/10 text-gold',
      valueColor: 'text-gold',
    },
    {
      title: 'Self Directs',
      value: metrics?.myDirects || 0,
      subtitle: 'Direct Referrals',
      icon: UserIcon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Self Business',
      value: formatCurrency(metrics?.directBusiness || 0),
      subtitle: 'Direct Referrals',
      icon: UserIcon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Self Investment',
      value: formatCurrency(metrics?.myBusiness || 0),
      subtitle: `₹${formatCurrency(metrics?.myBusinessMonth || 0)} this month`,
      icon: Wallet01Icon,
      gradient: 'from-emerald/20 via-emerald/5 to-transparent',
      border: 'border-emerald/20',
      iconBg: 'bg-emerald/10 text-emerald',
      valueColor: 'text-emerald',
    },
    {
      title: 'Total Business',
      value: formatCurrency(metrics?.teamBusiness || 0),
      subtitle: 'All-time team purchases',
      icon: Wallet01Icon,
      gradient: 'from-gold/20 via-gold/5 to-transparent',
      border: 'border-gold/20',
      iconBg: 'bg-gold/10 text-gold',
      valueColor: 'text-gold',
    },
    {
      title: 'Business (Month)',
      value: formatCurrency(metrics?.teamBusinessMonth || 0),
      subtitle: 'Team purchases this month',
      icon: Calendar01Icon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Income Wallet',
      value: formatCurrency(incomeWallet || 0),
      subtitle: 'Total Income Balance',
      icon: Wallet01Icon,
      gradient: 'from-emerald/20 via-emerald/5 to-transparent',
      border: 'border-emerald/20',
      iconBg: 'bg-emerald/10 text-emerald',
      valueColor: 'text-emerald',
    },
    {
      title: 'Working Wallet',
      value: formatCurrency(workingWallet || 0),
      subtitle: 'Total Working Income',
      icon: Wallet01Icon,
      gradient: 'from-purple/20 via-purple/5 to-transparent',
      border: 'border-purple/20',
      iconBg: 'bg-purple/10 text-purple',
      valueColor: 'text-purple',
    },
    {
      title: 'Gold Rate (22K/1g)',
      value: `₹${goldPrice}`,
      subtitle: 'Per Gram',
      icon: Wallet01Icon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Power / Weaker',
      value: null,
      subtitle: 'Network Strength',
      icon: metrics?.powerToday >= metrics?.weakerToday ? ArrowUp01Icon : ArrowDown01Icon,
      gradient: 'from-purple/20 via-purple/5 to-transparent',
      border: 'border-purple/20',
      iconBg: 'bg-purple/10 text-purple',
      valueColor: 'text-purple',
      customContent: (
        <div className="flex items-baseline gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-emerald tracking-tight">
              {formatCurrency(metrics?.powerToday || 0)}
            </span>
            <span className="text-xs text-muted-foreground">Power</span>
          </div>
          <span className="text-muted-foreground text-lg font-bold">/</span>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-rose-500 tracking-tight">
              {formatCurrency(metrics?.weakerToday || 0)}
            </span>
            <span className="text-xs text-muted-foreground">Weaker</span>
          </div>
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <Header>Dashboard</Header>
      <Main className="space-y-6">
        {!isPayoutReleased && (
          <Alert className="border-amber-200 bg-amber-50/50 rounded-xl">
            <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
            <AlertDescription className="text-amber-700">
              Your income, transactions, and Cashback will be visible after the admin processes the
              month-end payout.
            </AlertDescription>
          </Alert>
        )}

        {/* Gold Price Banner */}
        <Alert className="border-gold/20 bg-gradient-to-r from-gold/5 to-transparent overflow-hidden rounded-xl">
          <AlertTitle className="w-full overflow-hidden text-gold font-semibold flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-gold/20 text-gold text-xs shrink-0">
              ₹
            </span>
            <div className="animate-marquee whitespace-nowrap inline-block">
              Welcome to PRIME Jewellery · 1 gram 22K Gold Rate: ₹{goldPrice}/Gram
            </div>
          </AlertTitle>
        </Alert>

        {/* Stat Cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.gradient} p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className="absolute -top-2 -right-2 size-16 rounded-full opacity-10 bg-current" />
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <div
                  className={`inline-flex size-9 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <HugeiconsIcon icon={stat.icon} className="size-4" />
                </div>
              </div>
              {stat.customContent ?? (
                <div className={`text-3xl font-bold tracking-tight ${stat.valueColor}`}>
                  {stat.value}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="size-1.5 rounded-full bg-current opacity-60" />
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Overview Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground font-heading">Overview</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your account information
                </CardDescription>
              </div>
              <Badge
                variant={
                  metrics?.designation === 'N/A' || !metrics?.designation ? 'secondary' : 'default'
                }
                className="bg-gold/10 text-gold border-gold/20 hover:bg-gold/20"
              >
                {metrics?.designation || 'N/A'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Name', value: user.name },
                { label: 'User ID', value: formatUserId(user.id, user.role) },
                { label: 'Email', value: user.email || 'Not provided' },
                { label: 'Phone', value: user.phone || 'Not provided' },
                {
                  label: 'My Business',
                  value: formatCurrency(metrics?.myBusiness || 0),
                  highlight: true,
                },
                ...(user.activatedAt
                  ? [{ label: 'Account Activated', value: formatDate(user.activatedAt) }]
                  : []),
              ].map((item, i) => (
                <div key={i} className="space-y-1 p-3 rounded-xl bg-muted/30">
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p
                    className={`font-medium text-foreground ${(item as any).highlight ? 'text-gold' : ''}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invite & Add Member Section */}
        <InviteSection userId={userId} />
      </Main>
    </AppLayout>
  )
}

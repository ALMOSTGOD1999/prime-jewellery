import { Head } from '@inertiajs/react'
import {
  Calendar03Icon,
  Calendar01Icon,
  Tick01Icon,
  UserGroup02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Alert, AlertTitle } from '~/components/ui/alert'

interface AdminDashboardProps {
  stats: {
    totalUsers: number
    activeUsers: number
    todayUsers: number
    todayActiveUsers: number
    monthUsers: number
    monthActiveUsers: number
    business: {
      total: number
      month: number
      today: number
    }
  }
  goldPrice: string
}

export default function AdminDashboardPage({ stats, goldPrice }: AdminDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString('en-IN'),
      subtitle: `${stats.activeUsers.toLocaleString('en-IN')} Active`,
      icon: UserGroup02Icon,
      gradient: 'from-gold/20 via-gold/5 to-transparent',
      border: 'border-gold/20',
      iconBg: 'bg-gold/10 text-gold',
      valueColor: 'text-gold',
    },
    {
      title: 'Users (Month)',
      value: stats.monthUsers.toLocaleString('en-IN'),
      subtitle: `${stats.monthActiveUsers.toLocaleString('en-IN')} Active`,
      icon: Calendar01Icon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Users (Today)',
      value: stats.todayUsers.toLocaleString('en-IN'),
      subtitle: `${stats.todayActiveUsers.toLocaleString('en-IN')} Active`,
      icon: Calendar03Icon,
      gradient: 'from-emerald/20 via-emerald/5 to-transparent',
      border: 'border-emerald/20',
      iconBg: 'bg-emerald/10 text-emerald',
      valueColor: 'text-emerald',
    },
    {
      title: 'Total Business',
      value: formatCurrency(stats.business.total),
      subtitle: 'All-time approved purchases',
      icon: Tick01Icon,
      gradient: 'from-gold/20 via-gold/5 to-transparent',
      border: 'border-gold/20',
      iconBg: 'bg-gold/10 text-gold',
      valueColor: 'text-gold',
    },
    {
      title: 'Business (Month)',
      value: formatCurrency(stats.business.month),
      subtitle: 'Approved purchases this month',
      icon: Calendar01Icon,
      gradient: 'from-sky/20 via-sky/5 to-transparent',
      border: 'border-sky/20',
      iconBg: 'bg-sky/10 text-sky',
      valueColor: 'text-sky',
    },
    {
      title: 'Business (Today)',
      value: formatCurrency(stats.business.today),
      subtitle: 'Approved purchases today',
      icon: Calendar03Icon,
      gradient: 'from-emerald/20 via-emerald/5 to-transparent',
      border: 'border-emerald/20',
      iconBg: 'bg-emerald/10 text-emerald',
      valueColor: 'text-emerald',
    },
  ]

  return (
    <>
      <Head title="Admin Dashboard" />
      <AppLayout>
        <Header>Dashboard</Header>
        <Main>
          {goldPrice && (
            <Alert className="mb-6 border-gold/20 bg-gradient-to-r from-gold/5 to-transparent overflow-hidden rounded-xl">
              <AlertTitle className="w-full overflow-hidden text-gold font-semibold flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-gold/20 text-gold text-xs">
                  ₹
                </span>
                <div className="animate-marquee whitespace-nowrap inline-block">
                  Today's Gold Rate (22K): ₹{goldPrice}/Gram
                </div>
              </AlertTitle>
            </Alert>
          )}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.gradient} p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
              >
                {/* Decorative corner dot */}
                <div className="absolute -top-2 -right-2 size-16 rounded-full opacity-10 bg-current" />

                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div
                    className={`inline-flex size-9 items-center justify-center rounded-xl ${stat.iconBg}`}
                  >
                    <HugeiconsIcon icon={stat.icon} className="size-4" />
                  </div>
                </div>
                <div className={`text-3xl font-bold tracking-tight ${stat.valueColor}`}>
                  {stat.value}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="size-1.5 rounded-full bg-current opacity-60" />
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </Main>
      </AppLayout>
    </>
  )
}

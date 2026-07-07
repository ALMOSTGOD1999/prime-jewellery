import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChampionIcon,
  Award01Icon,
  GiftIcon,
  StarIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

const milestones = [
  {
    amount: '10L',
    label: '₹1,00,000',
    reward: 'Microwave',
    description: 'Achieve 10L business volume and earn a Microwave',
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=300&fit=crop',
    badgeVariant: 'default' as const,
  },
  {
    amount: '50L',
    label: '₹5,00,000',
    reward: 'Mobile',
    description: 'Achieve 50L business volume and earn a Mobile Phone',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    badgeVariant: 'secondary' as const,
  },
  {
    amount: '1Cr',
    label: '₹1,00,00,000',
    reward: '₹20,000',
    description: 'Achieve 1Cr business volume and earn ₹20,000 cash',
    image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400&h=300&fit=crop',
    badgeVariant: 'success' as const,
  },
  {
    amount: '5Cr',
    label: '₹5,00,00,000',
    reward: 'Car (₹3L)',
    description: 'Achieve 5Cr business volume and earn a Car worth ₹3,00,000',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
    badgeVariant: 'default' as const,
  },
  {
    amount: '10Cr',
    label: '₹10,00,00,000',
    reward: 'Car (₹6L)',
    description: 'Achieve 10Cr business volume and earn a Car worth ₹6,00,000',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=300&fit=crop',
    badgeVariant: 'secondary' as const,
  },
  {
    amount: '50Cr',
    label: '₹50,00,00,000',
    reward: '2BHK Flat',
    description: 'Achieve 50Cr business volume and earn a 2BHK Flat',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    badgeVariant: 'success' as const,
  },
  {
    amount: '100Cr',
    label: '₹100,00,00,000',
    reward: 'Toyota Fortuner',
    description: 'Achieve 100Cr business volume and earn a Toyota Fortuner',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
    badgeVariant: 'destructive' as const,
  },
]

export default function RewardAwardPage() {
  return (
    <>
      <Head title="Reward & Award" />
      <AppLayout>
        <Header>Reward & Award</Header>
        <Main className="space-y-6">
          {/* Hero Section */}
          <Card className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                  <HugeiconsIcon icon={ChampionIcon} className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">Reward & Award</CardTitle>
                  <CardDescription className="text-amber-100 text-sm mt-1">
                    50:50 Accumulation Ratio — Your achievements are recognized with exciting
                    rewards!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-amber-50 leading-relaxed max-w-3xl">
                As you grow your business and reach new volume milestones, you unlock exciting
                rewards and awards. The 50:50 accumulation ratio ensures balanced growth across both
                legs, and your hard work is celebrated with meaningful prizes.
              </p>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/40 mb-2">
                  <HugeiconsIcon icon={StarIcon} className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-600">7</div>
                <div className="text-xs text-muted-foreground mt-1">Total Milestones</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-950/40 mb-2">
                  <HugeiconsIcon icon={GiftIcon} className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">7</div>
                <div className="text-xs text-muted-foreground mt-1">Exciting Rewards</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950/40 mb-2">
                  <HugeiconsIcon icon={ChampionIcon} className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">50:50</div>
                <div className="text-xs text-muted-foreground mt-1">Accumulation Ratio</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950/40 mb-2">
                  <HugeiconsIcon icon={Award01Icon} className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">100Cr</div>
                <div className="text-xs text-muted-foreground mt-1">Highest Milestone</div>
              </CardContent>
            </Card>
          </div>

          {/* Milestones Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HugeiconsIcon icon={Award01Icon} className="h-5 w-5 text-amber-600" />
              Achievement Milestones
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone, index) => (
                <Card key={index} className="group overflow-hidden">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={milestone.image}
                      alt={milestone.reward}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge
                      variant={milestone.badgeVariant}
                      className="absolute top-3 right-3 text-xs"
                    >
                      {milestone.amount}
                    </Badge>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-white font-bold text-lg drop-shadow-lg">
                        {milestone.reward}
                      </div>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {milestone.amount}
                      </span>
                      <span className="text-xs text-muted-foreground">{milestone.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5" />
                      <span>Achievement unlocked at this milestone</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Progress Path */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HugeiconsIcon icon={StarIcon} className="h-5 w-5 text-amber-600" />
                Your Rewards Journey
              </CardTitle>
              <CardDescription>
                Each milestone brings you closer to bigger and better rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-amber-200 dark:bg-amber-800 hidden md:block" />

                <div className="space-y-6">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="relative md:pl-12">
                      {/* Timeline Dot */}
                      <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-amber-950 hidden md:block" />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={milestone.badgeVariant}>{milestone.amount}</Badge>
                          <span className="font-semibold">{milestone.reward}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{milestone.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}

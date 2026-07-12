import { createElement } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BankIcon,
  Book01Icon,
  ChampionIcon,
  DashboardSquare02Icon,
  FileValidationIcon,
  GiftIcon,
  MoneySendSquareIcon,
  Structure01Icon,
  RupeeCircleIcon,
  SecurityCheckIcon,
  Settings02Icon,
  ShoppingBag03Icon,
  UserEdit01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'

import useUser from '~/hooks/use-user'
import { AdminSidebarStats, NavGroup as NavGroupType, NavLink } from '~/components/app/types'

import { UserRoleEnum } from '#enums/user'

const Icon = (icon: any) => (props: any) => createElement(HugeiconsIcon, { icon, ...props })

export const getAppNav = (user: ReturnType<typeof useUser>, stats: AdminSidebarStats) => {
  const settingsItems: NavLink[] = [
    {
      title: 'Profile',
      url: '/settings/profile',
      icon: Icon(UserEdit01Icon),
    },
    {
      title: 'KYC',
      url: '/settings/kyc',
      icon: Icon(FileValidationIcon),
    },
    {
      title: 'Bank Details',
      url: '/settings/bank',
      icon: Icon(Book01Icon),
    },
  ]
  if (!user?.activatedAt && user?.role !== UserRoleEnum.ADMIN) {
    settingsItems.unshift({
      title: 'Activate',
      url: '/settings/activate',
      icon: Icon(SecurityCheckIcon),
    })
  }

  /*
  |--------------------------------------------------------------------------
  | GENERAL
  |--------------------------------------------------------------------------
  */
  const generalNav: NavGroupType['items'] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Icon(DashboardSquare02Icon),
    },
    {
      title: 'Wallet',
      url: '/wallet',
      icon: Icon(Wallet01Icon),
    },
    {
      title: 'Members',
      url: '/members',
      icon: Icon(UserGroupIcon),
    },
    {
      title: 'Tree',
      url: '/tree',
      icon: Icon(Structure01Icon),
    },
  ]

  if (user?.activatedAt || user?.role === UserRoleEnum.ADMIN) {
    generalNav.push(
      {
        title: 'Gold',
        icon: Icon(RupeeCircleIcon),
        items: [
          {
            title: 'Purchase',
            url: '/gold/purchase',
            icon: Icon(ShoppingBag03Icon),
          },
        ],
      },
      {
        title: 'Rewards',
        icon: Icon(GiftIcon),
        items: [
          { title: 'Membership Level Income', url: '/rewards/activation' },
          { title: 'Cashback', url: '/rewards/cashback' },
          { title: 'Reward & Award', url: '/rewards/reward-award' },
          { title: 'Performance Incentive', url: '/rewards/salaries' },
          { title: 'Achievements', url: '/reward/achievement', icon: Icon(ChampionIcon) },
          { title: 'Withdrawals', url: '/rewards/withdrawal' },
        ],
      }
    )
  }

  generalNav.push({
    title: 'Settings',
    icon: Icon(Settings02Icon),
    items: settingsItems,
  })

  /*
  |--------------------------------------------------------------------------
  | ADMIN
  |--------------------------------------------------------------------------
  */

  // --------------------------------------------------------------------------
  const sidebarLinks: NavGroupType[] = []

  if (user?.role === UserRoleEnum.USER) {
    sidebarLinks.push({
      title: 'General',
      items: generalNav,
    })
  }
  if (user?.role === UserRoleEnum.ADMIN) {
    const adminNav: NavGroupType['items'] = [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: Icon(DashboardSquare02Icon),
      },
      {
        title: 'Users',
        url: '/admin/users',
        icon: Icon(UserGroupIcon),
        badge: stats.activeUsers.toString(),
      },
      {
        title: 'Activation',
        url: '/admin/activation',
        icon: Icon(SecurityCheckIcon),
        badge: stats.activationRequests.toString(),
      },
      {
        title: 'Make Purchase',
        url: '/admin/purchase',
        icon: Icon(ShoppingBag03Icon),
      },
      {
        title: 'KYC',
        url: '/admin/kyc',
        icon: Icon(FileValidationIcon),
        badge: stats.kycRequests.toString(),
      },
      {
        title: 'Bank',
        url: '/admin/bank',
        icon: Icon(BankIcon),
        badge: stats.bankRequests.toString(),
      },
      {
        title: 'Purchase',
        url: '/admin/purchases',
        icon: Icon(ShoppingBag03Icon),
        badge: stats.purchaseRequests.toString(),
      },
      {
        title: 'Wallet',
        url: '/admin/wallet',
        icon: Icon(Wallet01Icon),
      },
      {
        title: 'Statements',
        url: '/admin/statements',
        icon: Icon(Wallet01Icon),
      },
      {
        title: 'Withdrawal',
        url: '/admin/withdrawal',
        icon: Icon(MoneySendSquareIcon),
      },
      {
        title: 'Payout',
        url: '/admin/payout',
        icon: Icon(Wallet01Icon),
      },
      {
        title: 'Achievements',
        url: '/admin/achievements',
        icon: Icon(ChampionIcon),
      },
      {
        title: 'Settings',
        url: '/admin/settings',
        icon: Icon(Settings02Icon),
      },
      {
        title: 'Gold Rates',
        url: '/admin/config/gold-billing',
        icon: Icon(RupeeCircleIcon),
      },
      {
        title: 'Inactivation',
        url: '/admin/inactivation',
        icon: Icon(SecurityCheckIcon),
      },
      {
        title: 'Blocking',
        url: '/admin/blocking',
        icon: Icon(SecurityCheckIcon),
      },
    ]

    sidebarLinks.push({
      title: 'Admin',
      items: adminNav,
    })
  }

  return sidebarLinks
}

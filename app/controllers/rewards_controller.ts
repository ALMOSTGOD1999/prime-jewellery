import type { HttpContext } from '@adonisjs/core/http'
import RewardService from '#services/reward_service'
import PayoutService from '#services/payout_service'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import { DateTime } from 'luxon'
import env from '#start/env'
import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'
import { WITHDRAWAL_DATES } from '#constants/withdrawal'

export default class RewardsController {
  async cashbackPage({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['date']
    const { sortBy = 'date', sortOrder = 'desc' } = await filterValidator(
      allowedSortColumns
    ).validate(request.qs())

    const isPayoutReleased = await PayoutService.isPayoutReleased()
    const cashback = isPayoutReleased
      ? await RewardService.getCashbackRewards(user, {
          page,
          limit,
          sortBy,
          sortOrder,
        })
      : {
          meta: {
            total: 0,
            per_page: limit,
            current_page: page,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
          data: [],
          stats: { totalRewards: 0, thisMonthRewards: 0, totalWithdrawn: 0 },
        }

    return inertia.render('rewards/cashback', { cashback, isPayoutReleased })
  }

  async salaryPage({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const qs = request.qs()
    const isPayoutReleased = await PayoutService.isPayoutReleased()
    const salaries = isPayoutReleased
      ? await RewardService.getSalaryRewards(user, qs)
      : {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
        }
    const salaryStats = isPayoutReleased
      ? await RewardService.getSalaryStats(user)
      : {
          totalAllTime: 0,
          totalUnlocked: 0,
          totalLocked: 0,
          totalWithdrawn: 0,
          availableBalance: 0,
        }

    return inertia.render('rewards/salary', {
      rewards: {
        meta: {
          total: salaries.meta.total,
          perPage: salaries.meta.per_page,
          currentPage: salaries.meta.current_page,
          lastPage: salaries.meta.last_page,
          firstPage: salaries.meta.first_page,
          firstPageUrl: salaries.meta.first_page_url,
          lastPageUrl: salaries.meta.last_page_url,
          nextPageUrl: salaries.meta.next_page_url,
          previousPageUrl: salaries.meta.previous_page_url,
        },
        data: salaries.data,
        stats: {
          totalAllTimeReward: salaryStats.totalAllTime,
          totalUnlocked: salaryStats.totalUnlocked,
          totalWithdrawn: salaryStats.totalWithdrawn,
          availableBalance: salaryStats.availableBalance,
        },
      },
      filters: request.qs(),
      years: Array.from({ length: 5 }, (_, i) => DateTime.now().year - i),
      isPayoutReleased,
    })
  }

  async activationPage({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['date', 'amount', 'level']
    const {
      sortBy = 'date',
      sortOrder = 'desc',
      search,
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const isPayoutReleased = await PayoutService.isPayoutReleased()

    const activationCashback = isPayoutReleased
      ? await RewardService.getActivationCashbackRewards(user, {
          page,
          limit,
          sortBy,
          sortOrder,
        })
      : {
          meta: {
            total: 0,
            per_page: limit,
            current_page: page,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
          data: [],
          stats: { totalRewards: 0, totalWithdrawn: 0 },
        }

    const activationSponsor = isPayoutReleased
      ? await RewardService.getActivationSponsorRewards(user, {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
        })
      : {
          meta: {
            total: 0,
            per_page: limit,
            current_page: page,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
          data: [],
          stats: { totalRewards: 0, totalWithdrawn: 0 },
        }

    const activationLevel = isPayoutReleased
      ? await RewardService.getActivationLevelRewards(user, {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
        })
      : {
          meta: {
            total: 0,
            per_page: limit,
            current_page: page,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
          data: [],
          stats: { totalEligible: 0, totalWithdrawable: 0, totalWithdrawn: 0 },
        }

    return inertia.render('rewards/activation', {
      activationCashback,
      activationSponsor,
      activationLevel,
      isPayoutReleased,
    })
  }
  async withdrawActivation({ auth, request, response, session, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount } = request.only(['amount'])
    const type = params.type

    if (!amount || amount <= 0) {
      session.flash('error', 'Invalid amount')
      return response.redirect().back()
    }

    // Validate type from URL
    if (!['cashback', 'sponsor', 'level'].includes(type)) {
      session.flash('error', 'Invalid activation reward type')
      return response.redirect().back()
    }

    const fullType = `activation_${type}` as WithdrawlTypeEnum

    // 0. Payout Check
    const isPayoutReleased = await PayoutService.isPayoutReleased()
    if (!isPayoutReleased) {
      session.flash('error', 'Month-end payout is pending. Withdrawals are not allowed yet.')
      return response.redirect().back()
    }

    // 1. Date Check
    const allowedDates = WITHDRAWAL_DATES[fullType]
    if (allowedDates.length > 0) {
      const today = DateTime.now().setZone(env.get('TZ'))
      const isEndOfMonth = today.daysInMonth === today.day

      const isAllowed = allowedDates.some(
        (date) => date === today.day || (date === 0 && isEndOfMonth)
      )

      if (!isAllowed) {
        session.flash(
          'error',
          `Withdrawals are only allowed on ${allowedDates.map((d) => (d === 0 ? 'end of month' : `${d}th`)).join(', ')} of the month.`
        )
        return response.redirect().back()
      }
    }

    // 2. Balance Check based on type
    let availableBalance = 0
    if (type === 'cashback') {
      const { stats } = await RewardService.getActivationCashbackRewards(user, { limit: 1 })
      availableBalance = Math.max(0, stats.totalRewards - (stats.totalWithdrawn || 0))
    } else if (type === 'sponsor') {
      const { stats } = await RewardService.getActivationSponsorRewards(user, { limit: 1 })
      availableBalance = Math.max(0, stats.totalRewards - (stats.totalWithdrawn || 0))
    } else if (type === 'level') {
      const { stats } = await RewardService.getActivationLevelRewards(user, { limit: 1 })
      availableBalance = Math.max(0, stats.totalWithdrawable - (stats.totalWithdrawn || 0))
    }

    if (amount > availableBalance) {
      session.flash('error', 'Insufficient balance.')
      return response.redirect().back()
    }

    // 3. Apply deductions for working wallet
    const isWorking = PayoutService.isWorkingWalletWithdrawalType(fullType)
    const deductions = isWorking
      ? PayoutService.calculateWorkingWalletNetAmount(Number(amount))
      : null

    // 4. Create Withdrawal
    await user.related('withdrawls').create({
      amount: amount,
      type: fullType,
      status: WithdrawlStatusEnum.PENDING,
      adminCharges: deductions?.adminCharges ?? 0,
      otherDeductions: deductions?.otherDeductions ?? 0,
      netAmount: deductions?.net ?? amount,
    })

    session.flash('success', 'Withdrawal request submitted successfully.')
    return response.redirect().back()
  }

  async withdrawCashback({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount } = request.only(['amount'])

    if (!amount || amount <= 0) {
      session.flash('error', 'Invalid amount')
      return response.redirect().back()
    }

    // 0. Payout Check
    const isPayoutReleased = await PayoutService.isPayoutReleased()
    if (!isPayoutReleased) {
      session.flash('error', 'Month-end payout is pending. Withdrawals are not allowed yet.')
      return response.redirect().back()
    }

    // 1. Date Check
    const allowedDates = WITHDRAWAL_DATES[WithdrawlTypeEnum.CASHBACK]
    const today = DateTime.now().setZone(env.get('TZ'))
    const isEndOfMonth = today.daysInMonth === today.day

    const isAllowed = allowedDates.some(
      (date) => date === today.day || (date === 0 && isEndOfMonth)
    )

    if (!isAllowed) {
      session.flash(
        'error',
        `Withdrawals are only allowed on ${allowedDates.map((d) => (d === 0 ? 'end of month' : `${d}th`)).join(', ')} of the month.`
      )
      return response.redirect().back()
    }

    // 2. Balance Check
    const { stats } = await RewardService.getCashbackRewards(user, { limit: 1 })
    const availableBalance = Math.max(0, stats.totalRewards - (stats.totalWithdrawn || 0))

    if (amount > availableBalance) {
      session.flash('error', 'Insufficient balance.')
      return response.redirect().back()
    }

    // 3. Apply deductions for working wallet
    const deductions = PayoutService.calculateWorkingWalletNetAmount(Number(amount))

    // 4. Create Withdrawal
    await user.related('withdrawls').create({
      amount: amount,
      type: WithdrawlTypeEnum.CASHBACK,
      status: WithdrawlStatusEnum.PENDING,
      adminCharges: deductions.adminCharges,
      otherDeductions: deductions.otherDeductions,
      netAmount: deductions.net,
    })

    session.flash('success', 'Withdrawal request submitted successfully.')
    return response.redirect().back()
  }

  async withdrawSalary({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount } = request.only(['amount'])

    if (!amount || amount <= 0) {
      session.flash('error', 'Invalid amount')
      return response.redirect().back()
    }

    // 0. Payout Check
    const isPayoutReleased = await PayoutService.isPayoutReleased()
    if (!isPayoutReleased) {
      session.flash('error', 'Month-end payout is pending. Withdrawals are not allowed yet.')
      return response.redirect().back()
    }

    // 1. Date Check
    const allowedDates = WITHDRAWAL_DATES[WithdrawlTypeEnum.SALARY]
    const today = DateTime.now().setZone(env.get('TZ'))

    const isAllowed = allowedDates.includes(today.day)

    if (!isAllowed) {
      session.flash(
        'error',
        `Withdrawals are only allowed on ${allowedDates.map((d) => `${d}th`).join(' and ')} of the month.`
      )
      return response.redirect().back()
    }

    // 2. Balance Check
    const stats = await RewardService.getSalaryStats(user)

    if (amount > stats.availableBalance) {
      session.flash('error', 'Insufficient balance.')
      return response.redirect().back()
    }

    // 3. Apply deductions for working wallet
    const deductions = PayoutService.calculateWorkingWalletNetAmount(Number(amount))

    // 4. Create Withdrawal
    await user.related('withdrawls').create({
      amount: amount,
      type: WithdrawlTypeEnum.SALARY,
      status: WithdrawlStatusEnum.PENDING,
      adminCharges: deductions.adminCharges,
      otherDeductions: deductions.otherDeductions,
      netAmount: deductions.net,
    })

    session.flash('success', 'Withdrawal request submitted successfully.')
    return response.redirect().back()
  }

  async rewardAwardPage({ inertia }: HttpContext) {
    return inertia.render('rewards/reward-award')
  }

  async levelIncomePage({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const isPayoutReleased = await PayoutService.isPayoutReleased()

    const levelIncome = isPayoutReleased
      ? await RewardService.getLevelRewards(user, { page, limit })
      : {
          meta: {
            total: 0,
            per_page: limit,
            current_page: page,
            last_page: 1,
            first_page: 1,
            first_page_url: '/?page=1',
            last_page_url: '/?page=1',
            next_page_url: null,
            previous_page_url: null,
          },
          data: [],
          stats: { totalRewards: 0, thisMonthRewards: 0, totalWithdrawn: 0 },
        }

    return inertia.render('rewards/level-income', {
      levelIncome,
      isPayoutReleased,
    })
  }
}

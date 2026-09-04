import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import logger from '@adonisjs/core/services/logger'
import PlatformConfig from '#models/platform_config'
import Investment from '#models/investment'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import InvestmentPackage from '#models/investment_package'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import User from '#models/user'
import Purchase from '#models/purchase'
import Transaction from '#models/transaction'
import WalletService from '#services/wallet_service'
import RewardService from '#services/reward_service'
import { WithdrawlTypeEnum } from '#enums/withdrawl'
import { TransactionTypeEnum } from '#enums/transaction'
import InvestmentService from '#services/investment_service'

// ─── Payout Preview Types ─────────────────────────────────────
export interface PayoutPreviewIncomeWallet {
  investmentAmount: number
  returnRate: number
  returnAmount: number
  incomeShare: number
  repurchaseShare: number
  adminShare: number
}

export interface PayoutPreviewWorkingWallet {
  activationCashback: number
  activationSponsor: number
  activationLevel: number
  levelIncome: number
  emiLevelIncome: number
  salary: number
  grossTotal: number
  workingShare: number
  repurchaseShare: number
  adminShare: number
}

export interface PayoutPreviewUser {
  userId: number
  userCode: string
  userName: string
  incomeWallet: PayoutPreviewIncomeWallet | null
  workingWallet: PayoutPreviewWorkingWallet | null
  totalPayout: number
}

export interface PayoutPreviewResult {
  month: string
  users: PayoutPreviewUser[]
  summary: {
    totalIncomeWallet: number
    totalWorkingWallet: number
    grandTotal: number
    eligibleUsers: number
  }
}

export default class PayoutService {
  static readonly INCOME_PERCENT = 0.7
  static readonly REPURCHASE_PERCENT = 0.2
  static readonly ADMIN_PERCENT = 0.1

  /** How long an in-progress payout lock stays valid before it can be re-acquired. */
  static readonly PAYOUT_LOCK_TTL_SECONDS = 2 * 60 * 60

  private static payoutLockKey(type: 'income' | 'working') {
    return type === 'income'
      ? 'income_wallet_payout_in_progress'
      : 'working_wallet_payout_in_progress'
  }

  /**
   * Atomically acquire a per-wallet payout lock so that two requests (double
   * clicks, multiple tabs, concurrent admins) cannot process the same month
   * at the same time. The lock is stored in platform_configs so it survives
   * restarts and is visible across processes.
   *
   * Returns true when this caller got the lock. A lock held by someone else is
   * only taken over once its TTL has expired (e.g. a crashed job) or when it
   * was released with {@link releasePayoutLock}.
   */
  static async acquirePayoutLock(type: 'income' | 'working', month: DateTime): Promise<boolean> {
    const key = this.payoutLockKey(type)
    const lockValue = `${month.toFormat('yyyy-MM')}|${Math.floor(DateTime.now().plus({ seconds: this.PAYOUT_LOCK_TTL_SECONDS }).toSeconds())}`

    const result = await db.rawQuery(
      `INSERT INTO platform_configs (key, value, "group", created_at, updated_at)
       VALUES (?, ?, 'payout', NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()
         WHERE platform_configs.value = ''
            OR platform_configs.value IS NULL
            OR (NULLIF(split_part(platform_configs.value, '|', 2), '')::bigint IS NOT NULL
                AND NULLIF(split_part(platform_configs.value, '|', 2), '')::bigint < ?)
       RETURNING id`,
      [key, lockValue, Math.floor(DateTime.now().toSeconds())]
    )

    return (result.rows?.length ?? 0) > 0
  }

  /** Release an in-progress payout lock (called when processing finishes/fails). */
  static async releasePayoutLock(type: 'income' | 'working') {
    const existing = await PlatformConfig.query().where('key', this.payoutLockKey(type)).first()
    if (existing) {
      existing.value = ''
      await existing.save()
    }
  }

  /**
   * Check whether a payout of the given type is currently in progress (lock is
   * held and has not expired). Used by the frontend to show a processing
   * indicator instead of a re-clickable button.
   */
  static async isPayoutInProgress(type: 'income' | 'working'): Promise<boolean> {
    const key = this.payoutLockKey(type)
    const row = await PlatformConfig.query().where('key', key).select('value').first()
    if (!row || !row.value) return false

    const parts = row.value.split('|')
    if (parts.length < 2) return false

    const expiresAt = Number(parts[1])
    if (Number.isNaN(expiresAt)) return false

    return DateTime.now().toSeconds() < expiresAt
  }

  static async getIncomeWalletPayoutMonth(): Promise<DateTime | null> {
    const monthStr = await PlatformConfig.get('income_wallet_payout_month')
    return monthStr ? DateTime.fromISO(monthStr + '-01').startOf('month') : null
  }

  static async getWorkingWalletPayoutMonth(): Promise<DateTime | null> {
    const monthStr = await PlatformConfig.get('working_wallet_payout_month')
    return monthStr ? DateTime.fromISO(monthStr + '-01').startOf('month') : null
  }

  static async getVisibleCutoff(): Promise<DateTime | null> {
    const income = await this.getIncomeWalletPayoutMonth()
    const working = await this.getWorkingWalletPayoutMonth()
    if (!income || !working) return null
    return income < working ? income : working
  }

  static async getVisibleCutoffEndOfMonth(): Promise<DateTime | null> {
    const cutoff = await this.getVisibleCutoff()
    return cutoff ? cutoff.endOf('month') : null
  }

  static async isPayoutReleased(): Promise<boolean> {
    const income = await this.getIncomeWalletPayoutMonth()
    const working = await this.getWorkingWalletPayoutMonth()
    if (!income || !working) return false
    const now = DateTime.now().startOf('month')
    return income >= now.minus({ months: 1 }) && working >= now.minus({ months: 1 })
  }

  static async getDiagnostics(month: DateTime) {
    const period = month.startOf('month')
    const periodEnd = period.endOf('month')
    const [activeUsers, purchaseStats, investmentStats] = await Promise.all([
      User.query().where('role', 'user').whereNotNull('activated_at').count('* as total').first(),
      Purchase.query()
        .whereNotNull('approved_at')
        .whereNull('cancelled_at')
        .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
        .count('* as count')
        .sum('amount as total')
        .first(),
      db.rawQuery(
        `SELECT count(*) as total FROM investments WHERE status = 'active' AND started_at <= ?`,
        [periodEnd.toSQL()!]
      ),
    ])
    return {
      activeUsers: Number(activeUsers?.$extras?.total || 0),
      junePurchaseCount: Number(purchaseStats?.$extras?.count || 0),
      junePurchaseAmount: Number(purchaseStats?.$extras?.total || 0),
      activeInvestments: Number(investmentStats?.rows?.[0]?.total || 0),
    }
  }

  static async getNextPayoutMonth(type: 'income' | 'working'): Promise<DateTime> {
    const last =
      type === 'income'
        ? await this.getIncomeWalletPayoutMonth()
        : await this.getWorkingWalletPayoutMonth()

    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (!last || last > now) {
      return previousMonth
    }

    const candidate = last.plus({ months: 1 })

    if (candidate > previousMonth) {
      return previousMonth
    }

    return candidate
  }

  static async hasUnpaidIncomeDistributions(month: DateTime): Promise<boolean> {
    const period = month.startOf('month')
    const result = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')
      .count('* as total')
      .first()
    return Number(result?.$extras.total || 0) > 0
  }

  static async hasUnpaidWorkingSnapshots(month: DateTime): Promise<boolean> {
    const period = month.startOf('month')
    const result = await MonthlyIncomeSnapshot.query()
      .where('month', period.toISODate()!)
      .whereNull('paid_out_at')
      .count('* as total')
      .first()
    return Number(result?.$extras.total || 0) > 0
  }

  static async snapshotMonthlyIncomes(month: DateTime, trx?: TransactionClientContract) {
    const period = month.startOf('month')

    const users = await User.query({ client: trx })
      .where('role', 'user')
      .whereNotNull('activated_at')
      .where('status', 'active')

    // ─── Step 0: Resolve monthly salaries for all eligible users ───
    // resolveMonthlySalary creates/updates salary records which
    // getUserMonthlyWorkingIncome depends on for the salary component.
    logger.info(`[payout] Resolving monthly salaries for ${users.length} users...`)
    let salariesResolved = 0
    for (const user of users) {
      try {
        const result = await RewardService.resolveMonthlySalary(user, period)
        if (result.status === 'credited' || result.status === 'already-credited') {
          salariesResolved++
        }
      } catch (error) {
        logger.error(
          `[payout] Salary resolve failed for user ${user.id}: ${error instanceof Error ? error.message : error}`
        )
      }
    }
    logger.info(`[payout] Salaries resolved: ${salariesResolved}/${users.length}`)

    let created = 0
    const total = users.length
    const startAll = Date.now()

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const userStart = Date.now()
      try {
        const existing = await MonthlyIncomeSnapshot.query({ client: trx })
          .where('user_id', user.id)
          .where('month', period.toISODate()!)
          .first()
        if (existing) {
          logger.info(
            `[payout] Snapshot ${i + 1}/${total}: user ${user.id} — skipped (exists)`
          )
          continue
        }

        const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, period)

        if (grossAmount <= 0) {
          logger.info(
            `[payout] Snapshot ${i + 1}/${total}: user ${user.id} — skipped (₹0 income, ${(Date.now() - userStart)}ms)`
          )
          continue
        }

        const incomeWalletAmount = Math.round(grossAmount * this.INCOME_PERCENT * 100) / 100
        const repurchaseWalletAmount = Math.round(grossAmount * this.REPURCHASE_PERCENT * 100) / 100

        await MonthlyIncomeSnapshot.create(
          {
            userId: user.id,
            month: period,
            grossAmount,
            incomeWalletAmount,
            repurchaseWalletAmount,
            paidOutAt: null,
          },
          { client: trx }
        )

        created++
        logger.info(
          `[payout] Snapshot ${i + 1}/${total}: user ${user.id} — ₹${grossAmount.toLocaleString('en-IN')} income (${Date.now() - userStart}ms)`
        )
      } catch (error) {
        logger.error(
          `[payout] Snapshot ${i + 1}/${total}: user ${user.id} — FAILED (${Date.now() - userStart}ms): ${error instanceof Error ? error.message : error}`
        )
      }
    }

    logger.info(
      `[payout] Snapshot creation complete: ${created} snapshots in ${((Date.now() - startAll) / 1000).toFixed(1)}s`
    )
    return { created, month: period.toISODate()! }
  }

  static async creditIncomeWallet(
    userId: number,
    amount: number,
    adminId: number,
    remark?: string,
    client?: TransactionClientContract
  ) {
    const apply = async (trx: TransactionClientContract) => {
      const user = await User.query({ client: trx })
        .select('id', 'income_wallet')
        .where('id', userId)
        .firstOrFail()
      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Income credited by admin #${adminId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )
      const currentBalance = Number(user.incomeWallet ?? 0)
      user.incomeWallet = currentBalance + amount
      await user.save()
      return transaction
    }

    // When called inside an existing transaction, participate in it.
    // Otherwise create a dedicated transaction.
    return client ? apply(client) : db.transaction(apply)
  }

  static async processIncomeWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')
    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (period > previousMonth) {
      throw new Error(
        `Cannot process payout for ${period.toFormat('yyyy-MM')} — month not completed yet.`
      )
    }

    let distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')

    if (distributions.length === 0) {
      const { processed: created } = await InvestmentService.distributeMonthlyReturns(period)
      if (created > 0) {
        distributions = await InvestmentReturnDistribution.query()
          .where('period_month', period.toISODate()!)
          .whereNull('paid_out_at')
      }
    }

    let processed = 0

    for (const distribution of distributions) {
      // Re-read the distribution inside a locked transaction and only credit
      // it when it is still unpaid. If a concurrent payout run already paid it,
      // the FOR UPDATE query returns nothing and we simply skip it — this makes
      // double-processing (admin double-click, two tabs) harmless for every user.
      const credited = await db.transaction(async (trx) => {
        const locked = await InvestmentReturnDistribution.query({ client: trx })
          .where('id', distribution.id)
          .whereNull('paid_out_at')
          .forUpdate()
          .first()

        if (!locked) return false

        // Skip inactive users — mark as paid but don't credit. Select only the
        // columns needed so the avatar attachment (which computes its URL) is
        // not loaded in console/CLI contexts without HTTP routes.
        const user = await User.query({ client: trx })
          .select('id', 'status')
          .where('id', locked.userId)
          .first()
        if (!user || user.status === 'inactive') {
          locked.useTransaction(trx)
          locked.paidOutAt = DateTime.now()
          await locked.save()
          return true
        }

        // Credit the amounts stored on the distribution (single source of
        // truth). Recomputing from the gross here could round differently
        // (e.g. return × 0.7 vs return × 70 / 100 disagree on .5 boundaries)
        // and drift a paise away from what the record says.
        const incomeAmount = Number(locked.incomeAmount)
        const repurchaseAmount = Number(locked.goldAmount)

        const repurchaseTransaction = await WalletService.creditRepurchaseWallet(
          locked.userId,
          repurchaseAmount,
          adminId,
          `Repurchase wallet (20%) from investment return for ${period.toFormat('LLLL yyyy')}`,
          trx
        )
        const incomeTransaction = await this.creditIncomeWallet(
          locked.userId,
          incomeAmount,
          adminId,
          `Cashback wallet (70%) from investment return for ${period.toFormat('LLLL yyyy')}`,
          trx
        )

        locked.useTransaction(trx)
        locked.goldTransactionId = repurchaseTransaction.id
        locked.incomeWalletTransactionId = incomeTransaction.id
        locked.paidOutAt = DateTime.now()
        await locked.save()
        return true
      })

      if (credited) processed += 1
    }

    await PlatformConfig.set(
      'income_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Cashback Wallet Payout Month',
      'Last month for which cashback wallet payout was processed'
    )

    return { processed, month: period.toISODate()! }
  }

  static async processWorkingWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')
    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (period > previousMonth) {
      throw new Error(
        `Cannot process payout for ${period.toFormat('yyyy-MM')} — month not completed yet.`
      )
    }

    // Double-guard: check if already paid (prevents race condition)
    const alreadyPaid = await PlatformConfig.get('working_wallet_payout_month')
    if (alreadyPaid) {
      const paidMonth = DateTime.fromISO(alreadyPaid + '-01').startOf('month')
      if (paidMonth >= period) {
        throw new Error(`Working payout for ${period.toFormat('yyyy-MM')} already done.`)
      }
    }

    // Check if any snapshots already paid for this month
    const paidCount = await MonthlyIncomeSnapshot.query()
      .where('month', period.toISODate()!)
      .whereNotNull('paid_out_at')
      .count('* as total')
      .first()
    if (Number(paidCount?.$extras?.total || 0) > 0) {
      throw new Error(
        `Working payout for ${period.toFormat('yyyy-MM')} already done (snapshots paid).`
      )
    }

    let credited = 0
    let totalAmount = 0

    // Snapshots + wallet credits are applied atomically. Nothing is committed
    // (and the payout month is not recorded) unless every user succeeds.
    await db.transaction(async (trx) => {
      await this.snapshotMonthlyIncomes(period, trx)

      const snapshots = await MonthlyIncomeSnapshot.query({ client: trx })
        .where('month', period.toISODate()!)
        .whereNull('paid_out_at')

      for (const snapshot of snapshots) {
        // Skip inactive users — mark as paid but don't credit
        const snapUser = await User.query({ client: trx }).where('id', snapshot.userId).first()
        if (!snapUser || snapUser.status === 'inactive') {
          snapshot.useTransaction(trx)
          snapshot.paidOutAt = DateTime.now()
          await snapshot.save()
          continue
        }

        const gross = Number(snapshot.grossAmount)
        const incomeAmount = Math.round(gross * this.INCOME_PERCENT * 100) / 100
        const repurchaseAmount = Math.round(gross * this.REPURCHASE_PERCENT * 100) / 100

        await WalletService.creditWorkingWallet(
          snapshot.userId,
          incomeAmount,
          adminId,
          `Working wallet (70%) from working income for ${period.toFormat('LLLL yyyy')}`,
          trx
        )
        if (repurchaseAmount > 0) {
          await WalletService.creditRepurchaseWallet(
            snapshot.userId,
            repurchaseAmount,
            adminId,
            `Repurchase wallet (20%) from working income for ${period.toFormat('LLLL yyyy')}`,
            trx
          )
        }

        snapshot.useTransaction(trx)
        snapshot.paidOutAt = DateTime.now()
        await snapshot.save()
        credited++
        totalAmount += gross
      }
    })

    // Only record the payout month AFTER everything committed successfully.
    await PlatformConfig.set(
      'working_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    return { credited, totalAmount, month: period.toISODate()! }
  }

  static calculateWorkingWalletNetAmount(grossAmount: number) {
    const adminCharges = Math.round(grossAmount * 0.1 * 100) / 100
    const afterAdmin = grossAmount - adminCharges
    const otherDeductions = Math.round(afterAdmin * 0.2 * 100) / 100
    const net = Math.round((afterAdmin - otherDeductions) * 100) / 100
    return { gross: grossAmount, adminCharges, otherDeductions, net }
  }

  // ─── Payout Preview ──────────────────────────────────────────

  /**
   * Compute a full per-user payout breakdown for a given month WITHOUT
   * writing any data. Used by the admin payout preview page and PDF.
   */
  static async getPayoutPreview(month: DateTime): Promise<PayoutPreviewResult> {
    const period = month.startOf('month')
    const monthStart = period
    const monthEnd = period.endOf('month')
    const previewUsers: PayoutPreviewUser[] = []

    // ─── 1. Income Wallet Payout (Investment Returns) ──────────
    const investments = await Investment.query()
      .where('status', 'active')
      .where('started_at', '<=', monthEnd.toSQL()!)
      .preload('user', (q) => q.select('id', 'name', 'status'))

    // Group investments by user
    const investmentsByUser = new Map<number, typeof investments>()
    for (const inv of investments) {
      if (!inv.user || inv.user.status !== 'active') continue
      const list = investmentsByUser.get(inv.userId) || []
      list.push(inv)
      investmentsByUser.set(inv.userId, list)
    }

    const userIncomeData = new Map<number, PayoutPreviewIncomeWallet>()

    for (const [userId, userInvestments] of investmentsByUser) {
      let totalIncomeShare = 0
      let totalRepurchaseShare = 0
      let totalAdminShare = 0
      let totalReturnAmount = 0

      for (const investment of userInvestments) {
        // Check if max return reached
        const effectiveAmount = await InvestmentService.getEffectiveAmount(investment)
        const pkg = await InvestmentPackage.findPackageForAmount(effectiveAmount)
        if (!pkg) continue

        const totalReturned = await InvestmentReturnDistribution.query()
          .where('investment_id', investment.id)
          .sum('return_amount as total')
          .first()
        const totalReturnSoFar = Number(totalReturned?.$extras?.total || 0)
        const maxReturnAmount = InvestmentService.roundMoney(
          (effectiveAmount * pkg.maxReturnPercent) / 100
        )
        if (totalReturnSoFar >= maxReturnAmount) continue

        const rate = Number(investment.monthlyReturnRate) || 3
        const startedAt = investment.startedAt.setZone('Asia/Kolkata').startOf('day')
        const activeDays = Math.min(monthEnd.diff(startedAt, 'days').days + 1, 30)
        const prorateFactor = Math.max(activeDays, 1) / 30

        const returnAmount = InvestmentService.roundMoney(
          (effectiveAmount * rate * prorateFactor) / 100
        )
        const incomeShare = InvestmentService.roundMoney((returnAmount * 70) / 100)
        const repurchaseShare = InvestmentService.roundMoney((returnAmount * 20) / 100)
        const adminShare = InvestmentService.roundMoney(returnAmount - incomeShare - repurchaseShare)

        totalReturnAmount += returnAmount
        totalIncomeShare += incomeShare
        totalRepurchaseShare += repurchaseShare
        totalAdminShare += adminShare
      }

      if (totalReturnAmount > 0) {
        userIncomeData.set(userId, {
          investmentAmount: userInvestments.reduce(
            (sum, inv) => sum + Number(inv.amount || 0),
            0
          ),
          returnRate: Number(userInvestments[0]?.monthlyReturnRate) || 3,
          returnAmount: totalReturnAmount,
          incomeShare: totalIncomeShare,
          repurchaseShare: totalRepurchaseShare,
          adminShare: totalAdminShare,
        })
      }
    }

    // ─── 2. Working Wallet Payout (6 income sources) ───────────
    const activeUsers = await User.query()
      .where('role', 'user')
      .whereNotNull('activated_at')
      .where('status', 'active')

    const INCOME_PERCENT = 0.7
    const REPURCHASE_PERCENT = 0.2

    for (const user of activeUsers) {
      const incomeData = userIncomeData.get(user.id) || null

      // Compute 6 working income sources
      let activationCashback = 0
      let activationSponsor = 0
      let activationLevel = 0
      let levelIncome = 0
      let emiLevelIncome = 0
      let salary = 0

      // 1. Activation Cashback
      const actAmt = Number(user.activationAmount) || 1000
      const monthlyCashback = (actAmt * 0.1) / 2
      const activatedAt = DateTime.fromJSDate(new Date(user.activatedAt!.toString()))
      const monthStr = period.toFormat('yyyy-MM')
      const month1Date = activatedAt.plus({ months: 1 })
      const month2Date = activatedAt.plus({ months: 2 })
      if (monthEnd >= month1Date && month1Date.toFormat('yyyy-MM') === monthStr)
        activationCashback += monthlyCashback
      if (monthEnd >= month2Date && month2Date.toFormat('yyyy-MM') === monthStr)
        activationCashback += monthlyCashback

      // Quick check: does user have any direct children?
      const directChildrenCountRes = await user.related('children').query().count('* as total')
      const hasDirects = Number(directChildrenCountRes[0].$extras.total) > 0

      if (hasDirects) {
        // 2. Activation Sponsor
        const sponsorCountRes = await user
          .related('children')
          .query()
          .whereNotNull('activated_at')
          .whereBetween('activated_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
          .count('* as total')
        activationSponsor =
          Number(sponsorCountRes[0].$extras.total) * (actAmt * 0.1)

        // 3. Activation Level
        const activationLevelEnd = await RewardService.getActivationLevelRewards(user, {
          limit: 1,
          asOf: monthEnd,
        })
        const eligibleAtEnd = activationLevelEnd.stats.totalEligible
        const activationLevelStart = await RewardService.getActivationLevelRewards(user, {
          limit: 1,
          asOf: monthStart.minus({ days: 1 }),
        })
        const eligibleAtStart = activationLevelStart.stats.totalEligible
        activationLevel = Math.max(0, eligibleAtEnd - eligibleAtStart)

        // 4. Level Income
        const levelRewards = await RewardService.getLevelRewards(user, {
          limit: 1,
          asOf: monthEnd,
        })
        levelIncome = levelRewards.stats.thisMonthRewards || 0

        // 5. EMI Level Income
        const emiRewards = await RewardService.getEmiLevelRewards(user, {
          limit: 1,
          asOf: monthEnd,
        })
        emiLevelIncome = emiRewards.stats.thisMonthRewards || 0
      }

      // 6. Salary
      const salaries = await user
        .related('salaries')
        .query()
        .where('status', 'paid')
        .whereBetween('paid_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
      salary = salaries.reduce((sum, s) => sum + (s.info?.reward || 0), 0)

      const grossTotal =
        activationCashback + activationSponsor + activationLevel + levelIncome + emiLevelIncome + salary
      const workingShare = Math.round(grossTotal * INCOME_PERCENT * 100) / 100
      const repurchaseShare = Math.round(grossTotal * REPURCHASE_PERCENT * 100) / 100
      const adminShare = Math.round((grossTotal - workingShare - repurchaseShare) * 100) / 100

      const workingData: PayoutPreviewWorkingWallet | null = grossTotal > 0 ? {
        activationCashback: Math.round(activationCashback * 100) / 100,
        activationSponsor: Math.round(activationSponsor * 100) / 100,
        activationLevel: Math.round(activationLevel * 100) / 100,
        levelIncome: Math.round(levelIncome * 100) / 100,
        emiLevelIncome: Math.round(emiLevelIncome * 100) / 100,
        salary: Math.round(salary * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        workingShare,
        repurchaseShare,
        adminShare,
      } : null

      // Only include users who will receive money
      const totalPayout =
        (incomeData?.incomeShare || 0) + workingShare

      if (totalPayout > 0) {
        previewUsers.push({
          userId: user.id,
          userCode: `PJ${String(user.id).padStart(6, '0')}`,
          userName: user.name || '—',
          incomeWallet: incomeData || null,
          workingWallet: workingData,
          totalPayout: Math.round(totalPayout * 100) / 100,
        })
      }
    }

    // Sort by total payout descending
    previewUsers.sort((a, b) => b.totalPayout - a.totalPayout)

    const totalIncomeWallet = previewUsers.reduce(
      (sum, u) => sum + (u.incomeWallet?.incomeShare || 0),
      0
    )
    const totalWorkingWallet = previewUsers.reduce(
      (sum, u) => sum + (u.workingWallet?.workingShare || 0),
      0
    )

    return {
      month: period.toFormat('yyyy-MM'),
      users: previewUsers,
      summary: {
        totalIncomeWallet: Math.round(totalIncomeWallet * 100) / 100,
        totalWorkingWallet: Math.round(totalWorkingWallet * 100) / 100,
        grandTotal: Math.round((totalIncomeWallet + totalWorkingWallet) * 100) / 100,
        eligibleUsers: previewUsers.length,
      },
    }
  }

  static isWorkingWalletWithdrawalType(type: WithdrawlTypeEnum): boolean {
    return [
      WithdrawlTypeEnum.ACTIVATION_CASHBACK,
      WithdrawlTypeEnum.ACTIVATION_SPONSOR,
      WithdrawlTypeEnum.ACTIVATION_LEVEL,
      WithdrawlTypeEnum.CASHBACK,
      WithdrawlTypeEnum.LEVEL,
      WithdrawlTypeEnum.SALARY,
      WithdrawlTypeEnum.EMI,
      WithdrawlTypeEnum.EMI_LEVEL,
    ].includes(type)
  }
}

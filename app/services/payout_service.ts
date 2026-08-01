import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import logger from '@adonisjs/core/services/logger'
import PlatformConfig from '#models/platform_config'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import User from '#models/user'
import Purchase from '#models/purchase'
import Transaction from '#models/transaction'
import WalletService from '#services/wallet_service'
import RewardService from '#services/reward_service'
import { WithdrawlTypeEnum } from '#enums/withdrawl'
import { TransactionTypeEnum } from '#enums/transaction'
import InvestmentService from '#services/investment_service'

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

    let created = 0

    for (const user of users) {
      try {
        const existing = await MonthlyIncomeSnapshot.query({ client: trx })
          .where('user_id', user.id)
          .where('month', period.toISODate()!)
          .first()
        if (existing) continue

        const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, period)

        if (grossAmount <= 0) continue

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
      } catch (error) {
        // A single failing user must not block the whole month's payout.
        // Log the error so the user can be identified and paid manually.
        logger.error(
          `[payout] Failed to compute monthly income for user ${user.id} (${month.toFormat('yyyy-MM')}): ${error instanceof Error ? error.message : error}`
        )
      }
    }

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
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
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

        // Skip inactive users — mark as paid but don't credit
        const user = await User.query({ client: trx }).where('id', locked.userId).first()
        if (!user || user.status === 'inactive') {
          locked.useTransaction(trx)
          locked.paidOutAt = DateTime.now()
          await locked.save()
          return true
        }

        const gross = Number(locked.returnAmount)
        const incomeAmount = Math.round(gross * this.INCOME_PERCENT * 100) / 100
        const repurchaseAmount = Math.round(gross * this.REPURCHASE_PERCENT * 100) / 100

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

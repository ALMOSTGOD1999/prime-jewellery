import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import Investment from '#models/investment'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import Transaction from '#models/transaction'
import InvestmentService from '#services/investment_service'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * One-off: repair paid July 2026 cashback distributions that were prorated with
 * one day too few.
 *
 * The old proration interpreted `started_at` through the local timezone
 * (Asia/Kolkata). A purchase recorded 2026-07-28T18:57Z = 00:27 IST on the 29th
 * was therefore counted from July 29 (3 days) instead of its stored calendar
 * date July 28 (4 days). Only distributions whose recomputed amount differs are
 * touched — everything else is left alone.
 *
 * For each affected distribution the old income/repurchase credits are reversed
 * (wallet_debit REVERSAL rows) and the corrected amounts are credited, exactly
 * like a normal payout, in one transaction. The distribution record is updated
 * to the corrected amounts and re-linked to the new transactions.
 *
 * Run: node ace fix:july-proration
 */
export default class FixJulyProration extends BaseCommand {
  static commandName = 'fix:july-proration'
  static description =
    'Recompute July 2026 prorated days for paid distributions and repair any 1-day-missing payouts'
  static options: CommandOptions = { startApp: true }

  async run() {
    const period = DateTime.fromISO('2026-07-01').startOf('month')
    const daysInMonth = period.daysInMonth!

    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNotNull('paid_out_at')

    let repaired = 0
    let unchanged = 0

    for (const dist of distributions) {
      const investment = await Investment.find(dist.investmentId)
      if (!investment) continue

      // Correct day count (stored calendar date, see distributeMonthlyReturns)
      const startedAt = investment.startedAt.toUTC().startOf('day')
      const startDay = startedAt.month === period.month ? startedAt.day : 1
      const activeDays = daysInMonth - startDay + 1
      const prorateFactor = activeDays / daysInMonth

      const rate = Number(investment.monthlyReturnRate) || 3
      const amount = Number(investment.amount)
      const expectedReturn = InvestmentService.roundMoney((amount * rate * prorateFactor) / 100)
      const expectedIncome = InvestmentService.roundMoney(expectedReturn * 0.7)
      const expectedGold = InvestmentService.roundMoney(expectedReturn * 0.2)

      if (Math.abs(Number(dist.returnAmount) - expectedReturn) < 0.01) {
        unchanged += 1
        continue
      }

      const oldIncome = Number(dist.incomeAmount)
      const oldGold = Number(dist.goldAmount)

      this.logger.info(
        `FIXING PJ${String(dist.userId).padStart(6, '0')} inv#${dist.investmentId}: ` +
          `${activeDays}/${daysInMonth} days — return ${dist.returnAmount} → ${expectedReturn}, ` +
          `income ${oldIncome} → ${expectedIncome}, gold ${oldGold} → ${expectedGold}`
      )

      await db.transaction(async (trx) => {
        // 1. Reverse the old credits (wallet_debit rows + wallet decrement).
        const incomeReversal = await Transaction.create(
          {
            userId: dist.userId,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount: oldIncome,
            remark: `REVERSAL: July 2026 cashback payout (orig txn #${dist.incomeWalletTransactionId})`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
        await trx.rawQuery(
          'UPDATE users SET income_wallet = GREATEST(COALESCE(income_wallet, 0) - ?, 0) WHERE id = ?',
          [oldIncome, dist.userId]
        )

        const goldReversal = await Transaction.create(
          {
            userId: dist.userId,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount: oldGold,
            remark: `REVERSAL: July 2026 repurchase payout (orig txn #${dist.goldTransactionId})`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
        await trx.rawQuery(
          'UPDATE users SET repurchase_wallet = GREATEST(COALESCE(repurchase_wallet, 0) - ?, 0) WHERE id = ?',
          [oldGold, dist.userId]
        )

        // 2. Credit the corrected amounts (standard payout remarks).
        const incomeCredit = await Transaction.create(
          {
            userId: dist.userId,
            type: TransactionTypeEnum.WALLET_CREDIT,
            amount: expectedIncome,
            remark: `Cashback wallet (70%) from investment return for July 2026`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
        await trx.rawQuery(
          'UPDATE users SET income_wallet = COALESCE(income_wallet, 0) + ? WHERE id = ?',
          [expectedIncome, dist.userId]
        )

        const goldCredit = await Transaction.create(
          {
            userId: dist.userId,
            type: TransactionTypeEnum.WALLET_CREDIT,
            amount: expectedGold,
            remark: `Repurchase wallet (20%) from investment return for July 2026`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
        await trx.rawQuery(
          'UPDATE users SET repurchase_wallet = COALESCE(repurchase_wallet, 0) + ? WHERE id = ?',
          [expectedGold, dist.userId]
        )

        // 3. Update the distribution to the corrected amounts and re-link it to
        //    the new transactions.
        dist.useTransaction(trx)
        dist.returnAmount = expectedReturn
        dist.incomeAmount = expectedIncome
        dist.goldAmount = expectedGold
        dist.incomeWalletTransactionId = incomeCredit.id
        dist.goldTransactionId = goldCredit.id
        await dist.save()
      })

      repaired += 1
    }

    this.logger.success(
      `July 2026 proration check done. Repaired: ${repaired}, already correct: ${unchanged}.`
    )
  }
}

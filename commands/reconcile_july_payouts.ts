import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import InvestmentReturnDistribution from '#models/investment_return_distribution'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * One-off: reconcile paid July 2026 cashback (income-wallet) payouts to the
 * amounts the user calculated. The user's expected list is authoritative —
 * it already reflects the corrected IST / 30-day proration for the July
 * purchases (Dipankar, Shefali, Kuddus, Priya, Soma, Sk Nasim, Sajahan,
 * Humayun) while the remaining users were already paid correctly.
 *
 * For each user whose paid income differs from the expected value:
 *   - underpaid → credit the difference to income_wallet and repurchase_wallet
 *     (+ WALLET_CREDIT reconciliation rows) and correct the distribution record
 *   - overpaid  → debit the excess as far as the wallet balance allows (floor
 *     at 0, WALLET_DEBIT rows); anything that cannot be recovered because the
 *     wallet was already cleared/withdrawn is reported as a shortfall for
 *     manual handling (e.g. deduct from the next payout).
 *
 * The July income wallets were already cleared after the payout release, so a
 * full reversal + re-credit would double-pay — a delta is applied instead.
 *
 * Also corrects the UNPAID August distribution of PJ617173 (Pranati Baidya) to
 * her corrected investment basis (₹2,00,000 @ 3.5% → ₹7,000/month) so the next
 * payout comes out clean. Her PAID July record is left as-is (matches the
 * user's list) — clawing back her July overpayment is a separate decision.
 *
 * Run: node ace reconcile:july-payouts            (dry-run, prints the plan)
 *      node ace reconcile:july-payouts --apply    (actually applies)
 */
export default class ReconcileJulyPayouts extends BaseCommand {
  static commandName = 'reconcile:july-payouts'
  static description =
    'Reconcile paid July 2026 cashback payouts to the user\'s expected amounts (delta credit/debit)'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({
    name: 'apply',
    default: false,
    description: 'Actually apply the corrections (default is a dry-run)',
  })
  declare apply: boolean

  private roundMoney(v: number) {
    return Math.round((v + Number.EPSILON) * 100) / 100
  }

  // Expected July 2026 income-wallet amounts (70% of return), per the user.
  private expected: Record<number, number> = {
    63896: 16828,
    67819: 4924.5,
    139063: 1159.07,
    150228: 4924.5,
    245303: 28028,
    278356: 3171,
    331062: 4924,
    499862: 1071,
    533697: 7374.5,
    617173: 16828,
    644117: 1470,
    698847: 14028,
    698875: 16828,
    722361: 7374.5,
    776339: 8599.5,
    780949: 7374.5,
    932914: 9824.5,
    5937652: 1540,
    7943738: 420,
    884535: 15866.66,
    236641: 15866.66,
    18168: 19600,
    426687: 13066.66,
    165958: 700,
    295975: 2800,
  }

  async run() {
    const period = DateTime.fromISO('2026-07-01').startOf('month')

    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNotNull('paid_out_at')

    // Group paid July distributions by user (each listed user has one).
    const byUser = new Map<number, InvestmentReturnDistribution[]>()
    for (const dist of distributions) {
      const list = byUser.get(dist.userId) ?? []
      list.push(dist)
      byUser.set(dist.userId, list)
    }

    let changed = 0
    let unchanged = 0
    let shortfalls = 0
    let creditIncomeTotal = 0
    let creditGoldTotal = 0
    let debitIncomeTotal = 0
    let debitGoldTotal = 0

    this.logger.info(
      `Reconciling ${Object.keys(this.expected).length} listed users against paid July 2026 payouts (apply=${this.apply})`
    )
    this.logger.info('')

    for (const [rawUserId, expectedIncome] of Object.entries(this.expected)) {
      const userId = Number(rawUserId)
      const dists = byUser.get(userId) ?? []
      if (dists.length === 0) {
        this.logger.warning(`  PJ${String(userId).padStart(6, '0')} — no paid July distribution found, skipped`)
        continue
      }
      if (dists.length > 1) {
        this.logger.warning(
          `  PJ${String(userId).padStart(6, '0')} — ${dists.length} distributions, manual review needed, skipped`
        )
        continue
      }

      const dist = dists[0]
      const paidIncome = Number(dist.incomeAmount)
      const paidGold = Number(dist.goldAmount)
      const deltaIncome = this.roundMoney(expectedIncome - paidIncome)

      if (Math.abs(deltaIncome) < 0.005) {
        unchanged += 1
        continue
      }

      // Sub-₹1 deltas are rounding noise in the user's list (e.g. PJ331062 was
      // written as 4924 while the identical plan users show 4924.5) — skip.
      if (Math.abs(deltaIncome) < 1) {
        this.logger.info(
          `  PJ${String(userId).padStart(6, '0')} — ₹${deltaIncome} delta (rounding noise), skipped`
        )
        unchanged += 1
        continue
      }

      // repurchase:income ratio is 20:70 → deltaGold = deltaIncome × 2/7
      const deltaGold = this.roundMoney((deltaIncome * 2) / 7)
      const expectedGold = this.roundMoney(paidGold + deltaGold)
      const expectedReturn = this.roundMoney(expectedIncome / 0.7)

      const label = `PJ${String(userId).padStart(6, '0')}`
      if (deltaIncome > 0) {
        changed += 1
        creditIncomeTotal += deltaIncome
        creditGoldTotal += deltaGold
        this.logger.info(
          `UNDERPAID  ${label}: income ${paidIncome} → ${expectedIncome} (+${deltaIncome}), repurchase ${paidGold} → ${expectedGold} (+${deltaGold})`
        )
      } else {
        changed += 1
        debitIncomeTotal += Math.abs(deltaIncome)
        debitGoldTotal += Math.abs(deltaGold)
        this.logger.info(
          `OVERPAID   ${label}: income ${paidIncome} → ${expectedIncome} (${deltaIncome}), repurchase ${paidGold} → ${expectedGold} (${deltaGold})`
        )
      }

      if (!this.apply) continue

      await db.transaction(async (trx) => {
        const now = DateTime.now()

        const applyWallet = async (
          column: 'income_wallet' | 'repurchase_wallet',
          delta: number,
          creditRemark: string,
          debitRemark: string
        ) => {
          if (Math.abs(delta) < 0.005) return
          if (delta > 0) {
            await Transaction.create(
              {
                userId,
                type: TransactionTypeEnum.WALLET_CREDIT,
                amount: delta,
                remark: creditRemark,
                approvedAt: now,
              },
              { client: trx }
            )
            await trx.rawQuery(
              `UPDATE users SET ${column} = COALESCE(${column}, 0) + ? WHERE id = ?`,
              [delta, userId]
            )
          } else {
            const want = Math.abs(delta)
            const bal = await trx.rawQuery(
              `SELECT COALESCE(${column}, 0) AS bal FROM users WHERE id = ?`,
              [userId]
            )
            const available = Number(bal.rows?.[0]?.bal ?? 0)
            const recover = this.roundMoney(Math.min(available, want))
            if (recover > 0) {
              await Transaction.create(
                {
                  userId,
                  type: TransactionTypeEnum.WALLET_DEBIT,
                  amount: recover,
                  remark: debitRemark,
                  approvedAt: now,
                },
                { client: trx }
              )
              await trx.rawQuery(
                `UPDATE users SET ${column} = COALESCE(${column}, 0) - ? WHERE id = ?`,
                [recover, userId]
              )
            }
            if (recover < want) {
              shortfalls += 1
              this.logger.warning(
                `    ⚠ ${column} shortfall for PJ${String(userId).padStart(6, '0')}: available ₹${available}, overpaid ₹${want} — recover manually (deduct from next payout)`
              )
            }
          }
        }

        await applyWallet(
          'income_wallet',
          deltaIncome,
          `Cashback wallet (70%) from investment return for July 2026 — reconciliation`,
          `REVERSAL: July 2026 cashback wallet (70%) from investment return — overpaid`
        )
        await applyWallet(
          'repurchase_wallet',
          deltaGold,
          `Repurchase wallet (20%) from investment return for July 2026 — reconciliation`,
          `REVERSAL: July 2026 repurchase wallet (20%) from investment return — overpaid`
        )

        // Correct the distribution record (keeps original txn links — those
        // reflect what was actually paid; the delta rows complete the story).
        dist.useTransaction(trx)
        dist.returnAmount = expectedReturn
        dist.incomeAmount = expectedIncome
        dist.goldAmount = expectedGold
        await dist.save()
      })
    }

    // ─── PJ617173: correct her UNPAID August distribution (record-only) ───
    const augStart = DateTime.fromISO('2026-08-01').startOf('month')
    const pranatiAug = await InvestmentReturnDistribution.query()
      .where('period_month', augStart.toISODate()!)
      .where('user_id', 617173)
      .whereNull('paid_out_at')
      .first()
    if (pranatiAug) {
      const curReturn = Number(pranatiAug.returnAmount)
      if (Math.abs(curReturn - 7000) > 0.01) {
        this.logger.info('')
        this.logger.info(
          `PJ617173 (Pranati Baidya) — unpaid AUGUST distribution return ${curReturn} → 7000, income → 4900, gold → 1400 (corrected investment basis ₹2,00,000 @ 3.5%)`
        )
        if (this.apply) {
          pranatiAug.returnAmount = 7000
          pranatiAug.incomeAmount = 4900
          pranatiAug.goldAmount = 1400
          await pranatiAug.save()
          this.logger.info('  August distribution corrected (unpaid — no wallet impact).')
        }
      } else {
        unchanged += 1
      }
    }

    this.logger.info('')
    this.logger.info(
      `Done. Changed: ${changed}, unchanged: ${unchanged}, shortfalls: ${shortfalls}`
    )
    if (this.apply) {
      this.logger.info(
        `Credits applied → income ₹${creditIncomeTotal.toFixed(2)}, repurchase ₹${creditGoldTotal.toFixed(2)}`
      )
      this.logger.info(
        `Debits applied → income ₹${debitIncomeTotal.toFixed(2)}, repurchase ₹${debitGoldTotal.toFixed(2)} (as far as balances allowed)`
      )
    }

    await db.manager.close('read')
  }
}

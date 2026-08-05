import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'

/**
 * Revert ALL July 2026 payouts (income wallet + working wallet) so they can
 * be re-run with updated Level Income and Performance Incentive rules.
 *
 * Steps:
 *   1. Reverse working wallet credits + repurchase credits from working payout
 *   2. Delete working income snapshots for July
 *   3. Reverse cashback wallet credits + repurchase credits from income payout
 *   4. Restore cashback wallets cleared by withdraw-all-income
 *   5. Mark July distributions as unpaid
 *   6. Reset both payout month configs
 *   7. Delete July salary records (will be recalculated)
 *
 * Run: node ace revert-july-payout
 */
export default class RevertJulyPayout extends BaseCommand {
  static commandName = 'revert-july-payout'
  static description = 'Reverse all July 2026 payouts (income + working wallet) for re-creation'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')
    const julyEnd = july.endOf('month')

    const CASHBACK_REMARK = 'Cashback wallet (70%) from investment return for July 2026'
    const REPURCHASE_INCOME_REMARK = 'Repurchase wallet (20%) from investment return for July 2026'
    const CLEAR_REMARK =
      'Income wallet (cashback) withdrawal from investment return — payout cleared by admin (command)'
    const WORKING_REMARK = 'Working wallet (70%) from working income for July 2026'
    const WORKING_REPURCHASE_REMARK = 'Repurchase wallet (20%) from working income for July 2026'

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  REVERT ALL JULY 2026 PAYOUTS')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('')

    // ─── PHASE 1: Reverse Working Wallet Payout ───
    this.logger.info('─── Phase 1: Reversing Working Wallet Payout ───')

    const workingTxns = await Transaction.query()
      .where('remark', WORKING_REMARK)
      .orderBy('id')
    const workingRepurchaseTxns = await Transaction.query()
      .where('remark', WORKING_REPURCHASE_REMARK)
      .orderBy('id')

    this.logger.info(`  Working wallet credits: ${workingTxns.length}`)
    this.logger.info(`  Working repurchase credits: ${workingRepurchaseTxns.length}`)

    let reversedWorking = 0
    let reversedWorkingTotal = 0
    let reversedWorkingRepurchase = 0
    let reversedWorkingRepurchaseTotal = 0
    let deletedSnapshots = 0

    if (workingTxns.length > 0 || workingRepurchaseTxns.length > 0) {
      await db.transaction(async (trx) => {
        // Reverse working wallet credits
        for (const txn of workingTxns) {
          const amount = Number(txn.amount)
          if (amount <= 0) continue

          await Transaction.create(
            {
              userId: txn.userId,
              type: TransactionTypeEnum.WALLET_DEBIT,
              amount,
              remark: `REVERSAL: July 2026 working wallet payout (orig txn #${txn.id})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          await trx.rawQuery(
            'UPDATE users SET working_wallet = GREATEST(COALESCE(working_wallet, 0) - ?, 0) WHERE id = ?',
            [amount, txn.userId]
          )

          reversedWorking++
          reversedWorkingTotal += amount
        }

        // Reverse working repurchase credits
        for (const txn of workingRepurchaseTxns) {
          const amount = Number(txn.amount)
          if (amount <= 0) continue

          await Transaction.create(
            {
              userId: txn.userId,
              type: TransactionTypeEnum.WALLET_DEBIT,
              amount,
              remark: `REVERSAL: July 2026 working repurchase payout (orig txn #${txn.id})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          await trx.rawQuery(
            'UPDATE users SET repurchase_wallet = GREATEST(COALESCE(repurchase_wallet, 0) - ?, 0) WHERE id = ?',
            [amount, txn.userId]
          )

          reversedWorkingRepurchase++
          reversedWorkingRepurchaseTotal += amount
        }

        // Delete working income transactions
        await trx.rawQuery(
          `DELETE FROM transactions WHERE remark = ? OR remark = ?`,
          [WORKING_REMARK, WORKING_REPURCHASE_REMARK]
        )

        // Delete July snapshots
        const snapResult = await MonthlyIncomeSnapshot.query({ client: trx })
          .where('month', july.toISODate()!)
          .delete()
        deletedSnapshots = snapResult.length

        // Reset working_wallet_payout_month config
        await trx.rawQuery(
          `INSERT INTO platform_configs (key, value, "group", created_at, updated_at)
           VALUES ('working_wallet_payout_month', '', 'payout', NOW(), NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
        )
      })

      this.logger.info(
        `  Working wallet reversed: ${reversedWorking} credits (₹${reversedWorkingTotal.toLocaleString('en-IN')})`
      )
      this.logger.info(
        `  Working repurchase reversed: ${reversedWorkingRepurchase} credits (₹${reversedWorkingRepurchaseTotal.toLocaleString('en-IN')})`
      )
      this.logger.info(`  Snapshots deleted: ${deletedSnapshots}`)
    } else {
      this.logger.info('  No working wallet payout found for July.')
    }

    // ─── PHASE 2: Reverse Income Wallet (Cashback) Payout ───
    this.logger.info('')
    this.logger.info('─── Phase 2: Reversing Income Wallet (Cashback) Payout ───')

    const cashbackTxns = await Transaction.query()
      .where('remark', CASHBACK_REMARK)
      .orderBy('id')
    const repurchaseTxns = await Transaction.query()
      .where('remark', REPURCHASE_INCOME_REMARK)
      .orderBy('id')
    const clearTxns = await Transaction.query()
      .where('remark', CLEAR_REMARK)
      .orderBy('id')

    this.logger.info(`  Cashback credits: ${cashbackTxns.length}`)
    this.logger.info(`  Repurchase credits: ${repurchaseTxns.length}`)
    this.logger.info(`  Wallet clears to undo: ${clearTxns.length}`)

    let restored = 0
    let restoredTotal = 0
    let reversedCashback = 0
    let reversedCashbackTotal = 0
    let reversedRepurchase = 0
    let reversedRepurchaseTotal = 0
    let unflipped = 0

    if (cashbackTxns.length > 0 || repurchaseTxns.length > 0) {
      await db.transaction(async (trx) => {
        // 1. Restore cashback wallets cleared by withdraw-all-income
        for (const txn of clearTxns) {
          const amount = Number(txn.amount)
          if (amount <= 0) continue

          await Transaction.create(
            {
              userId: txn.userId,
              type: TransactionTypeEnum.WALLET_CREDIT,
              amount,
              remark: `REVERSAL: Restored cashback wallet cleared by admin (orig txn #${txn.id})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          await trx.rawQuery(
            'UPDATE users SET income_wallet = COALESCE(income_wallet, 0) + ? WHERE id = ?',
            [amount, txn.userId]
          )

          restored++
          restoredTotal += amount
        }

        // 2. Reverse cashback (70%) credits
        for (const txn of cashbackTxns) {
          const amount = Number(txn.amount)
          if (amount <= 0) continue

          await Transaction.create(
            {
              userId: txn.userId,
              type: TransactionTypeEnum.WALLET_DEBIT,
              amount,
              remark: `REVERSAL: July 2026 cashback payout (orig txn #${txn.id})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          await trx.rawQuery(
            'UPDATE users SET income_wallet = GREATEST(COALESCE(income_wallet, 0) - ?, 0) WHERE id = ?',
            [amount, txn.userId]
          )

          reversedCashback++
          reversedCashbackTotal += amount
        }

        // 3. Reverse repurchase (20%) credits
        for (const txn of repurchaseTxns) {
          const amount = Number(txn.amount)
          if (amount <= 0) continue

          await Transaction.create(
            {
              userId: txn.userId,
              type: TransactionTypeEnum.WALLET_DEBIT,
              amount,
              remark: `REVERSAL: July 2026 repurchase payout (orig txn #${txn.id})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          await trx.rawQuery(
            'UPDATE users SET repurchase_wallet = GREATEST(COALESCE(repurchase_wallet, 0) - ?, 0) WHERE id = ?',
            [amount, txn.userId]
          )

          reversedRepurchase++
          reversedRepurchaseTotal += amount
        }

        // 4. Mark distributions as unpaid
        const cashbackIds = cashbackTxns.map((t) => t.id)
        const repurchaseIds = repurchaseTxns.map((t) => t.id)

        const unflippedResult = await InvestmentReturnDistribution.query({ client: trx })
          .where((query) => {
            query
              .whereIn('incomeWalletTransactionId', cashbackIds)
              .orWhereIn('goldTransactionId', repurchaseIds)
          })
          .update({ paidOutAt: null, goldTransactionId: null, incomeWalletTransactionId: null })
        unflipped = Number(unflippedResult)

        // 5. Delete income payout transactions
        await trx.rawQuery(
          `DELETE FROM transactions WHERE remark = ? OR remark = ? OR remark = ?`,
          [CASHBACK_REMARK, REPURCHASE_INCOME_REMARK, CLEAR_REMARK]
        )

        // 6. Reset income_wallet_payout_month config
        await trx.rawQuery(
          `INSERT INTO platform_configs (key, value, "group", created_at, updated_at)
           VALUES ('income_wallet_payout_month', '', 'payout', NOW(), NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
        )
      })

      this.logger.info(
        `  Cashback wallets restored: ${restored} (₹${restoredTotal.toLocaleString('en-IN')})`
      )
      this.logger.info(
        `  Cashback credits reversed: ${reversedCashback} (₹${reversedCashbackTotal.toLocaleString('en-IN')})`
      )
      this.logger.info(
        `  Repurchase credits reversed: ${reversedRepurchase} (₹${reversedRepurchaseTotal.toLocaleString('en-IN')})`
      )
      this.logger.info(`  Distributions marked unpaid: ${unflipped}`)
    } else {
      this.logger.info('  No income wallet payout found for July.')
    }

    // ─── PHASE 3: Delete July Salary Records ───
    this.logger.info('')
    this.logger.info('─── Phase 3: Deleting July Salary Records ───')

    const salaryResult = await db.rawQuery(
      `DELETE FROM salaries WHERE created_at >= ? AND created_at <= ?`,
      [july.startOf('month').toSQL()!, julyEnd.toSQL()!]
    )
    this.logger.info(`  Salary records deleted: ${salaryResult.rowCount}`)

    // ─── SUMMARY ───
    this.logger.info('')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  REVERSAL COMPLETE')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  Working wallet:  Cleared')
    this.logger.info('  Income wallet:   Cleared')
    this.logger.info('  Snapshots:       Deleted')
    this.logger.info('  Distributions:   Marked unpaid')
    this.logger.info('  Salaries:        Deleted')
    this.logger.info('  Configs:         Reset')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('')
    this.logger.info('Next: Run "node ace rerun-july-payout" to recreate July payouts with new rules.')
  }
}

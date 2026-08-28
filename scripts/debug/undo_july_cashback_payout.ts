import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'
import InvestmentReturnDistribution from '#models/investment_return_distribution'

/**
 * One-off: safely undo the July 2026 cashback (income) wallet payout so the
 * admin can re-run it from the Month-end Payout page.
 *
 * The Aug-01 payout credited 20 users (cashback 70% + repurchase 20%) and the
 * later `withdraw-all-income` command zeroed every cashback wallet. Undoing
 * therefore:
 *
 *   1. Restores each cashback wallet to its pre-clear balance
 *      (reverses the withdraw-all-income wallet_debit rows with
 *       wallet_credit REVERSAL rows).
 *   2. Reverses the July cashback credits (wallet_debit REVERSAL rows).
 *   3. Reverses the July repurchase credits (wallet_debit REVERSAL rows).
 *   4. Marks the 20 July distributions as unpaid again so a re-run credits
 *      them exactly once.
 *   5. Resets income_wallet_payout_month so the button targets 2026-07.
 *
 * Everything runs in a single transaction — nothing is applied unless every
 * step succeeds. Wallet balances are never driven below zero.
 *
 * Run: node ace undo-july-cashback-payout
 */
export default class UndoJulyCashbackPayout extends BaseCommand {
  static commandName = 'undo-july-cashback-payout'
  static description =
    'Reverse the July 2026 cashback payout (credits + withdraw-all clears) so it can be re-run'
  static options: CommandOptions = { startApp: true }

  private static readonly CASHBACK_REMARK =
    'Cashback wallet (70%) from investment return for July 2026'
  private static readonly REPURCHASE_REMARK =
    'Repurchase wallet (20%) from investment return for July 2026'
  private static readonly CLEAR_REMARK =
    'Income wallet (cashback) withdrawal from investment return — payout cleared by admin (command)'

  async run() {
    const cashbackTxns = await Transaction.query()
      .where('remark', UndoJulyCashbackPayout.CASHBACK_REMARK)
      .orderBy('id')
    const repurchaseTxns = await Transaction.query()
      .where('remark', UndoJulyCashbackPayout.REPURCHASE_REMARK)
      .orderBy('id')
    const clearTxns = await Transaction.query()
      .where('remark', UndoJulyCashbackPayout.CLEAR_REMARK)
      .orderBy('id')

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  UNDO JULY 2026 CASHBACK WALLET PAYOUT')
    this.logger.info(`  July cashback credits:  ${cashbackTxns.length}`)
    this.logger.info(`  July repurchase credits:${repurchaseTxns.length}`)
    this.logger.info(`  Wallet clears to undo:  ${clearTxns.length}`)
    this.logger.info('══════════════════════════════════════════════════')

    if (cashbackTxns.length === 0 || repurchaseTxns.length === 0) {
      this.logger.error('Aborting — July payout transactions not found (nothing to undo).')
      return
    }

    const cashbackIds = cashbackTxns.map((t) => t.id)
    const repurchaseIds = repurchaseTxns.map((t) => t.id)

    let restored = 0
    let restoredTotal = 0
    let reversedCashback = 0
    let reversedCashbackTotal = 0
    let reversedRepurchase = 0
    let reversedRepurchaseTotal = 0
    let unflipped = 0

    await db.transaction(async (trx) => {
      // 1. Restore the cashback wallets that withdraw-all-income zeroed.
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

      // 2. Reverse the July cashback (70%) credits.
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

      // 3. Reverse the July repurchase (20%) credits.
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

      // 4. Mark the July distributions unpaid again (match via the transaction
      //    ids the payout stored on them — no timezone-dependent comparison).
      const unflippedResult = await InvestmentReturnDistribution.query({ client: trx })
        .where((query) => {
          query
            .whereIn('incomeWalletTransactionId', cashbackIds)
            .orWhereIn('goldTransactionId', repurchaseIds)
        })
        .update({ paidOutAt: null, goldTransactionId: null, incomeWalletTransactionId: null })
      unflipped = Number(unflippedResult)

      // 5. Re-arm the payout month so the button targets 2026-07 again.
      await trx.rawQuery(
        `INSERT INTO platform_configs (key, value, "group", created_at, updated_at)
         VALUES ('income_wallet_payout_month', '', 'payout', NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
      )
    })

    this.logger.info('')
    this.logger.info(
      `Cashback wallets restored:      ${restored} (₹${restoredTotal.toLocaleString('en-IN')})`
    )
    this.logger.info(
      `July cashback credits reversed: ${reversedCashback} (₹${reversedCashbackTotal.toLocaleString('en-IN')})`
    )
    this.logger.info(
      `July repurchase credits reversed: ${reversedRepurchase} (₹${reversedRepurchaseTotal.toLocaleString('en-IN')})`
    )
    this.logger.info(`July distributions marked unpaid: ${unflipped}`)
    this.logger.info(`income_wallet_payout_month reset — button now targets 2026-07`)
    this.logger.info('')
    this.logger.info(
      'Next: click "Payout Cashback Wallet for 2026-07" on the Month-end Payout page to re-run the payout.'
    )
  }
}

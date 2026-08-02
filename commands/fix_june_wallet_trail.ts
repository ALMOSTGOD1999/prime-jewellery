import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * One-off: reconcile the June 2026 working/repurchase transaction trail with
 * the corrected wallet columns. The July-21 salary fix (fix:june-payout)
 * corrected wallet columns and monthly snapshots, but for some users the
 * REVERSAL history rows are missing or partial — leaving the wallet page's
 * transaction-based repurchase display higher than the real balance.
 *
 * For every June snapshot, computes (credits − reversals) vs the corrected
 * snapshot amounts and inserts the missing REVERSAL rows. No balances change.
 *
 * Run: node ace fix-june-wallet-trail
 */
export default class FixJuneWalletTrail extends BaseCommand {
  static commandName = 'fix-june-wallet-trail'
  static description =
    'Insert missing June 2026 REVERSAL rows so transaction trail matches corrected wallet columns'
  static options: CommandOptions = { startApp: true }

  async run() {
    const snapshots = await db.rawQuery(
      `SELECT user_id, income_wallet_amount, repurchase_wallet_amount
       FROM monthly_income_snapshots
       WHERE to_char(month, 'YYYY-MM') = '2026-06'`
    )

    let inserted = 0
    let totalAmount = 0
    const fixes: { uid: number; wallet: string; amount: number }[] = []

    for (const s of snapshots.rows) {
      const uid = Number(s.user_id)
      const correctWorking = Number(s.income_wallet_amount) // snapshot stores 70% share
      const correctRepurchase = Number(s.repurchase_wallet_amount)

      const trail = await db.rawQuery(
        `SELECT
           coalesce(sum(amount) FILTER (WHERE type = 'wallet_credit' AND remark ILIKE '%Working wallet (70%) from working income for June 2026%'), 0)::float AS working_credit,
           coalesce(sum(amount) FILTER (WHERE type = 'wallet_debit' AND remark ILIKE '%REVERSAL: Excess working wallet%June 2026%'), 0)::float AS working_reversal,
           coalesce(sum(amount) FILTER (WHERE type = 'wallet_credit' AND remark ILIKE '%Repurchase wallet (20%) from working income for June 2026%'), 0)::float AS repurchase_credit,
           coalesce(sum(amount) FILTER (WHERE type = 'wallet_debit' AND remark ILIKE '%REVERSAL: Excess repurchase wallet%June 2026%'), 0)::float AS repurchase_reversal
         FROM transactions
         WHERE user_id = ?
           AND (remark ILIKE '%working income for June 2026%'
                OR remark ILIKE '%REVERSAL: Excess working wallet%June 2026%'
                OR remark ILIKE '%REVERSAL: Excess repurchase wallet%June 2026%')`,
        [uid]
      )

      const t = trail.rows[0]
      const missingWorking =
        Math.round((Number(t.working_credit) - Number(t.working_reversal) - correctWorking) * 100) /
        100
      const missingRepurchase =
        Math.round(
          (Number(t.repurchase_credit) - Number(t.repurchase_reversal) - correctRepurchase) * 100
        ) / 100

      if (missingWorking > 0.01) fixes.push({ uid, wallet: 'working', amount: missingWorking })
      if (missingRepurchase > 0.01) {
        fixes.push({ uid, wallet: 'repurchase', amount: missingRepurchase })
      }
    }

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  RECONCILE JUNE 2026 WALLET TRANSACTION TRAIL`)
    this.logger.info(`  Missing REVERSAL rows detected: ${fixes.length}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (fixes.length === 0) {
      this.logger.info('Transaction trail already matches corrected columns. Nothing to do.')
      return
    }

    for (const fix of fixes) {
      await db.transaction(async (trx) => {
        await Transaction.create(
          {
            userId: fix.uid,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount: fix.amount,
            remark: `REVERSAL: Excess ${fix.wallet} wallet from June 2026 payout (salary correction)`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
      })
      inserted++
      totalAmount += fix.amount
      this.logger.info(
        `  → PJ${String(fix.uid).padStart(6, '0')}: added REVERSAL ${fix.wallet} ₹${fix.amount.toFixed(2)}`
      )
    }

    this.logger.info('')
    this.logger.success(`Inserted ${inserted} REVERSAL rows, total ₹${totalAmount.toFixed(2)}.`)
    this.logger.info('Wallet balances unchanged — trail now matches corrected columns.')
  }
}

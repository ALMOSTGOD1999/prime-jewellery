import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PayoutService from '#services/payout_service'

export default class RerunJunePayout extends BaseCommand {
  static commandName = 'payout:rerun-june'
  static description = 'Reverse old June payout and rerun with corrected activation dates'
  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.fromISO('2026-06-01').startOf('month')
    const monthStr = month.toFormat('yyyy-MM')
    const monthLabel = month.toFormat('LLLL yyyy')

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  Reversing & Rerunning June 2026 Working Payout`)
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info('')

    // 1. Check current state
    const snapCount = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [month.toISODate()!]
    )
    const txns = await db.rawQuery(
      `SELECT user_id, amount, remark FROM transactions WHERE remark ILIKE '%working income%' AND remark ILIKE '%${monthLabel}%'`
    )
    this.logger.info(`Existing snapshots: ${snapCount.rows[0].total}, gross ₹${Number(snapCount.rows[0].gross).toLocaleString('en-IN')}`)
    this.logger.info(`Existing transactions: ${txns.rows.length}`)

    // 2. Reverse wallet balances
    this.logger.info('')
    this.logger.info('─── Reversing previous wallet credits ───')

    let reversedWorking = 0
    let reversedRepurchase = 0

    for (const t of txns.rows) {
      const uid = Number(t.user_id)
      const remark = t.remark || ''
      const amount = Number(t.amount)

      if (remark.includes('Working wallet')) {
        await db.rawQuery(
          `UPDATE users SET working_wallet = GREATEST(working_wallet - ?, 0) WHERE id = ?`,
          [amount, uid]
        )
        reversedWorking += amount
      } else if (remark.includes('Repurchase wallet')) {
        await db.rawQuery(
          `UPDATE users SET repurchase_wallet = GREATEST(repurchase_wallet - ?, 0) WHERE id = ?`,
          [amount, uid]
        )
        reversedRepurchase += amount
      }
    }
    this.logger.info(`Reversed working_wallet: ₹${reversedWorking.toFixed(2)}`)
    this.logger.info(`Reversed repurchase_wallet: ₹${reversedRepurchase.toFixed(2)}`)

    // 3. Delete old transactions and snapshots
    this.logger.info('')
    this.logger.info('─── Deleting old records ───')

    await db.rawQuery(
      `DELETE FROM transactions WHERE remark ILIKE '%working income%' AND remark ILIKE '%${monthLabel}%'`
    )
    this.logger.info('Deleted old working income transactions')

    await db.rawQuery(`DELETE FROM monthly_income_snapshots WHERE month = ?`, [month.toISODate()!])
    this.logger.info('Deleted old monthly income snapshots')

    // 4. Reset payout config
    await db.from('platform_configs').where('key', 'working_wallet_payout_month').update({ value: '' })
    this.logger.info('Reset working_wallet_payout_month config')

    // 5. Rerun payout
    this.logger.info('')
    this.logger.info('─── Running fresh payout ───')

    const result = await PayoutService.processWorkingWalletPayout(month, 1)
    this.logger.success(
      `Done! Credited ${result.credited} users, total gross ₹${result.totalAmount.toLocaleString('en-IN')}`
    )

    // 6. Final stats
    const finalSnap = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [month.toISODate()!]
    )
    this.logger.info('')
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  Final snapshots: ${finalSnap.rows[0].total}`)
    this.logger.info(`  Final gross:     ₹${Number(finalSnap.rows[0].gross).toLocaleString('en-IN')}`)
    this.logger.info(`══════════════════════════════════════════════════`)
  }
}

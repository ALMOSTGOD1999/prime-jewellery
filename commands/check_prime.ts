import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import RewardService from '#services/reward_service'
import db from '@adonisjs/lucid/services/db'

export default class CheckPrime extends BaseCommand {
  static commandName = 'check:prime'
  static options: CommandOptions = { startApp: true }

  async run() {
    const user = await User.find(585222)

    // 1. June snapshot
    const snap = await db.rawQuery(`SELECT * FROM monthly_income_snapshots WHERE user_id = ? AND month = '2026-06-01'`, [585222])
    if (snap.rows[0]) {
      const s = snap.rows[0]
      this.logger.info(`June Snapshot: Gross ₹${Number(s.gross_amount).toLocaleString('en-IN')} | 70% ₹${Number(s.income_wallet_amount).toLocaleString('en-IN')} | 20% ₹${Number(s.repurchase_wallet_amount).toLocaleString('en-IN')}`)
    } else {
      this.logger.info('No June snapshot')
    }

    // 2. Actual level income for June (asOf June 30)
    const juneEnd = DateTime.fromISO('2026-06-30').endOf('day')
    const li = await RewardService.getLevelRewards(user!, { limit: 1, asOf: juneEnd })
    this.logger.info(`Level Income (asOf June 30): thisMonthRewards = ₹${li.stats.thisMonthRewards.toFixed(2)}`)

    // 3. Actual June data
    const juneData = li.data.filter((r: any) => r.date?.startsWith('2026-06'))
    const juneTotal = juneData.reduce((s: number, r: any) => s + r.amount, 0)
    this.logger.info(`Level Income June (manual filter): ${juneData.length} days, ₹${juneTotal.toFixed(2)}`)

    // 4. What getUserMonthlyWorkingIncome returns for June
    const juneMonth = DateTime.fromISO('2026-06-01').startOf('month')
    const wi = await RewardService.getUserMonthlyWorkingIncome(user!, juneMonth)
    this.logger.info(`getUserMonthlyWorkingIncome June: ₹${wi.toFixed(2)}`)

    // 5. Check working wallet transaction for June
    const txns = await db.rawQuery(
      `SELECT remark, amount FROM transactions WHERE user_id = 585222 AND remark ILIKE '%working income%June 2026%' ORDER BY created_at`
    )
    this.logger.info('June working income transactions:')
    txns.rows.forEach((r: any) => this.logger.info(`  ₹${r.amount} - ${r.remark}`))

    // 6. Current wallet balances
    this.logger.info(`\nWallet: ₹${Number(user!.walletBalance).toLocaleString('en-IN')} | Income: ₹${Number(user!.incomeWallet).toLocaleString('en-IN')} | Repurchase: ₹${Number(user!.repurchaseWallet).toLocaleString('en-IN')}`)
  }
}

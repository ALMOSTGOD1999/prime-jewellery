import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import { UserRoleEnum } from '#enums/user'
import RewardService from '#services/reward_service'
import router from '@adonisjs/core/services/router'

/**
 * READ-ONLY. Benchmarks July 2026 working income using the CURRENT (fixed)
 * reward code, exactly as snapshotMonthlyIncomes would compute it.
 * Does NOT write to the database.
 *
 * Run: node ace bench-july-payout
 */
export default class BenchJulyPayout extends BaseCommand {
  static commandName = 'bench-july-payout'
  static description = 'Dry-run compute July 2026 working income (no writes)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')

    router.commit()

    const users = await User.query()
      .where('role', UserRoleEnum.USER)
      .whereNotNull('activatedAt')
      .where('status', 'active')

    let total = 0
    let count = 0
    const rows: { userId: number; gross: number }[] = []

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      try {
        const gross = await RewardService.getUserMonthlyWorkingIncome(user, july)
        if (gross <= 0) continue
        total += gross
        count++
        rows.push({ userId: user.id, gross })
        if ((i + 1) % 100 === 0)
          this.logger.info(`  progress ${i + 1}/${users.length} (${count} paid so far)`)
      } catch (error: any) {
        this.logger.error(`  user ${user.id} FAILED: ${error.message}`)
      }
    }

    rows.sort((a, b) => b.gross - a.gross)
    this.logger.info('')
    this.logger.info('═══ JULY 2026 WORKING INCOME (fixed code) ═══')
    this.logger.info(`  Users with income: ${count}`)
    this.logger.info(`  Grand gross total: ₹${total.toLocaleString('en-IN')} (${total.toFixed(2)})`)
    const income70 = Math.round(total * 0.7 * 100) / 100
    const repurchase20 = Math.round(total * 0.2 * 100) / 100
    const admin10 = Math.round(total * 0.1 * 100) / 100
    this.logger.info(`  70% income wallet: ₹${income70.toLocaleString('en-IN')}`)
    this.logger.info(`  20% repurchase:    ₹${repurchase20.toLocaleString('en-IN')}`)
    this.logger.info(`  10% admin:         ₹${admin10.toLocaleString('en-IN')}`)
    this.logger.info('  Top rows:')
    for (const r of rows.slice(0, 20))
      this.logger.info(`    ${r.userId}: ₹${r.gross.toLocaleString('en-IN')} (${r.gross.toFixed(2)})`)
  }
}

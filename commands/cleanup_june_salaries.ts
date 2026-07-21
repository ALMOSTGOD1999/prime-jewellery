import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { PERFORMANCE_INCENTIVE_CONFIG } from '#enums/performance_incentive'

export default class CleanupJuneSalaries extends BaseCommand {
  static commandName = 'cleanup:june-salaries'
  static description = 'Delete June 2026 salary records that fail the new 60:40 slab check'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'Set to "apply" to actually delete. Default is dry-run.',
  })
  declare mode: string

  async run() {
    const dryRun = (this.mode || '').trim().toLowerCase() !== 'apply'
    const targetMonth = DateTime.fromISO('2026-06-01').startOf('month')

    // Fetch all June 2026 salaries
    const salaries = await db.rawQuery(
      `SELECT id, user_id, power, weaker, created_at
       FROM salaries
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY user_id`,
      [targetMonth.startOf('month').toSQL()!, targetMonth.endOf('month').toSQL()!]
    )

    let valid = 0
    let invalid = 0
    let totalRewardKept = 0
    let totalRewardDeleted = 0

    const toDelete: number[] = []

    const descending = [...PERFORMANCE_INCENTIVE_CONFIG].sort((a, b) => b.criteria - a.criteria)

    for (const s of salaries.rows) {
      const power = Number(s.power || 0)
      const weaker = Number(s.weaker || 0)
      const total = power + weaker

      // Apply new slab-specific 60:40 check
      let qualifies = false
      let matchedRank = null

      for (const rank of descending) {
        if (
          total >= rank.criteria &&
          power >= rank.criteria * 0.6 &&
          weaker >= rank.criteria * 0.4
        ) {
          qualifies = true
          matchedRank = rank
          break
        }
      }

      if (qualifies) {
        valid++
        totalRewardKept += matchedRank?.reward || 0
        this.logger.info(
          `KEEP  PJ${String(s.user_id).padStart(6, '0')}: power=₹${power.toLocaleString('en-IN')} weaker=₹${weaker.toLocaleString('en-IN')} total=₹${total.toLocaleString('en-IN')} → ${matchedRank?.designation}`
        )
      } else {
        invalid++
        toDelete.push(s.id)
        totalRewardDeleted += total
        this.logger.warning(
          `DELETE PJ${String(s.user_id).padStart(6, '0')}: power=₹${power.toLocaleString('en-IN')} weaker=₹${weaker.toLocaleString('en-IN')} total=₹${total.toLocaleString('en-IN')} → NO VALID SLAB`
        )
      }
    }

    this.logger.info('')
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  June 2026 Salary Cleanup`)
    this.logger.info(`  Total records:     ${salaries.rows.length}`)
    this.logger.info(`  Valid (keep):      ${valid}`)
    this.logger.info(`  Invalid (delete):    ${invalid}`)
    this.logger.info(`  Total reward kept:   ₹${totalRewardKept.toLocaleString('en-IN')}`)
    this.logger.info(`  Total business del:  ₹${totalRewardDeleted.toLocaleString('en-IN')}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (invalid === 0) {
      this.logger.info('No invalid records found. Database is consistent.')
      return
    }

    if (dryRun) {
      this.logger.info('DRY RUN — no records deleted. Run with "apply" to delete.')
      return
    }

    // Actually delete
    this.logger.info(`Deleting ${invalid} invalid records...`)
    await db.rawQuery(`DELETE FROM salaries WHERE id = ANY(?)`, [toDelete])
    this.logger.success(`Deleted ${invalid} invalid June salary records.`)
    this.logger.info('Database is now consistent with the new 60:40 slab rules.')
  }
}

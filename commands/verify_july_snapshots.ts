import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import RewardService from '#services/reward_service'
import router from '@adonisjs/core/services/router'

/**
 * READ-ONLY. Recomputes July 2026 working income with the current (fixed)
 * reward code for every user that has a July snapshot and compares against
 * the snapshot gross. Flags any mismatch.
 *
 * Run: node ace verify:july-snapshots
 */
export default class VerifyJulySnapshots extends BaseCommand {
  static commandName = 'verify:july-snapshots'
  static description = 'Verify all July 2026 snapshot gross amounts against fixed reward code'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')

    router.commit()

    const snapshots = await MonthlyIncomeSnapshot.query().where('month', july.toISODate()!)

    this.logger.info(`July snapshots found: ${snapshots.length}`)

    let checked = 0
    let matched = 0
    let mismatched = 0
    let missingUser = 0
    let totalSnapshotGross = 0
    let totalRecomputed = 0
    const mismatches: Array<{ user: number; name: string; snapshot: number; recomputed: number; diff: number }> = []

    for (const snap of snapshots) {
      const user = await User.find(snap.userId)
      if (!user) {
        missingUser++
        this.logger.warn(`  #${snap.userId}: user record missing`)
        continue
      }

      try {
        const recomputed = await RewardService.getUserMonthlyWorkingIncome(user, july)
        checked++
        totalSnapshotGross += Number(snap.grossAmount)
        totalRecomputed += recomputed

        const diff = Math.abs(Number(snap.grossAmount) - recomputed)
        if (diff <= 0.01) {
          matched++
        } else {
          mismatched++
          mismatches.push({
            user: user.id,
            name: String(user.name || ''),
            snapshot: Number(snap.grossAmount),
            recomputed,
            diff,
          })
          this.logger.warn(
            `  #${user.id} ${String(user.name || '').slice(0, 22)}: snapshot=${snap.grossAmount} recomputed=${recomputed} diff=${diff.toFixed(2)}`
          )
        }
      } catch (error: any) {
        this.logger.error(`  #${user.id}: FAILED: ${error.message}`)
      }
    }

    this.logger.info('')
    this.logger.info(`═ RESULTS ═`)
    this.logger.info(`Checked: ${checked} | Matched: ${matched} | Mismatched: ${mismatched} | Missing user: ${missingUser}`)
    this.logger.info(`Total snapshot gross: ${totalSnapshotGross.toFixed(2)}`)
    this.logger.info(`Total recomputed:     ${totalRecomputed.toFixed(2)}`)
    if (mismatches.length > 0) {
      this.logger.info(`Mismatched users: ${mismatches.map((m) => `#${m.user} (snap ${m.snapshot} vs rec ${m.recomputed})`).join(', ')}`)
    }
  }
}

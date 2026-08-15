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
 * Runs per-user computations with a small concurrency pool (the recursive
 * downline scans are the slow part, and every user is independent).
 *
 * Run: node ace verify:july-snapshots
 */
export default class VerifyJulySnapshots extends BaseCommand {
  static commandName = 'verify:july-snapshots'
  static description = 'Verify all July 2026 snapshot gross amounts against fixed reward code'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')
    const CONCURRENCY = 8

    router.commit()

    const snapshots = await MonthlyIncomeSnapshot.query().where('month', july.toISODate()!)

    this.logger.info(`July snapshots found: ${snapshots.length} (concurrency ${CONCURRENCY})`)

    const results = new Array(snapshots.length)

    let next = 0
    const worker = async () => {
      while (true) {
        const i = next++
        if (i >= snapshots.length) break
        const snap = snapshots[i]
        const user = await User.find(snap.userId)
        if (!user) {
          results[i] = { status: 'missing' }
          continue
        }
        try {
          const recomputed = await RewardService.getUserMonthlyWorkingIncome(user, july)
          results[i] = {
            user: user.id,
            name: String(user.name || ''),
            snapshot: Number(snap.grossAmount),
            recomputed,
            status: 'ok',
          }
        } catch (error: any) {
          results[i] = { user: user.id, status: 'error', message: error.message }
        }
        if ((i + 1) % 25 === 0 || i + 1 === snapshots.length) {
          this.logger.info(`  progress: ${i + 1}/${snapshots.length}`)
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

    let checked = 0
    let matched = 0
    let mismatched = 0
    let missingUser = 0
    let errors = 0
    let totalSnapshotGross = 0
    let totalRecomputed = 0
    const mismatches: Array<{ user: number; name: string; snapshot: number; recomputed: number; diff: number }> = []

    for (const r of results) {
      if (r.status === 'missing') {
        missingUser++
        continue
      }
      if (r.status === 'error') {
        errors++
        this.logger.error(`  #${r.user}: FAILED: ${r.message}`)
        continue
      }
      checked++
      totalSnapshotGross += r.snapshot
      totalRecomputed += r.recomputed
      const diff = Math.abs(r.snapshot - r.recomputed)
      if (diff <= 0.01) {
        matched++
      } else {
        mismatched++
        mismatches.push({ user: r.user, name: r.name, snapshot: r.snapshot, recomputed: r.recomputed, diff })
        this.logger.error(
          `  #${r.user} ${String(r.name || '').slice(0, 22)}: snapshot=${r.snapshot} recomputed=${r.recomputed} diff=${diff.toFixed(2)}`
        )
      }
    }

    this.logger.info('')
    this.logger.info(`═ RESULTS ═`)
    this.logger.info(
      `Checked: ${checked} | Matched: ${matched} | Mismatched: ${mismatched} | Missing user: ${missingUser} | Errors: ${errors}`
    )
    this.logger.info(`Total snapshot gross: ${totalSnapshotGross.toFixed(2)}`)
    this.logger.info(`Total recomputed:     ${totalRecomputed.toFixed(2)}`)
    if (mismatches.length > 0) {
      this.logger.info(
        `Mismatched users: ${mismatches.map((m) => `#${m.user} (snap ${m.snapshot} vs rec ${m.recomputed})`).join(', ')}`
      )
    }
  }
}

import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { PERFORMANCE_INCENTIVE_CONFIG } from '#enums/performance_incentive'

export default class CheckSlabEligibility extends BaseCommand {
  static commandName = 'check:slab-eligibility'
  static description = 'Check Performance Incentive slab eligibility for a user in June 2026'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'User ID (e.g. 416427 or PJ416427)',
  })
  declare userId: string

  async run() {
    const rawInput = (this.userId || '').trim().toUpperCase()
    const userId = rawInput.replace(/^PJ/i, '')

    if (!userId) {
      this.logger.error('Please provide a user ID. Example: node ace check:slab-eligibility 416427')
      return
    }

    const uid = Number(userId)
    const june = DateTime.fromISO('2026-06-01').startOf('month')
    const juneEnd = june.endOf('month')

    const userRes = await db.rawQuery(`SELECT id, name FROM users WHERE id = ?`, [uid])
    if (userRes.rows.length === 0) {
      this.logger.error(`User PJ${String(uid).padStart(6, '0')} not found`)
      return
    }
    const user = userRes.rows[0]

    const directChildren = await db.rawQuery(`SELECT id FROM users WHERE parent_id = ?`, [uid])

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  SLAB ELIGIBILITY CHECK`)
    this.logger.info(`  User: PJ${String(uid).padStart(6, '0')} ${user.name}`)
    this.logger.info(`  Month: June 2026`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (directChildren.rows.length === 0) {
      this.logger.info('No direct children. No legs = no 60:40 matching possible.')
      return
    }

    const legs: { legId: number; volume: number }[] = []

    for (const child of directChildren.rows) {
      const descendants = await db.rawQuery(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM users WHERE parent_id = ?
          UNION ALL
          SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
        ) SELECT id FROM descendants`,
        [child.id]
      )

      const allIds = [child.id, ...descendants.rows.map((r: any) => r.id)]
      const purchaseRes = await db.rawQuery(
        `SELECT coalesce(sum(amount), 0)::float as total FROM purchases WHERE user_id = ANY(?) AND approved_at IS NOT NULL AND cancelled_at IS NULL AND approved_at <= ?`,
        [allIds, juneEnd.toSQL()!]
      )
      legs.push({ legId: child.id, volume: Number(purchaseRes.rows[0].total) })
    }

    legs.sort((a, b) => b.volume - a.volume)

    const total = legs.reduce((sum, l) => sum + l.volume, 0)
    const power = legs[0]?.volume || 0
    const weaker = legs.slice(1).reduce((sum, l) => sum + l.volume, 0)

    this.logger.info('')
    this.logger.info('--- LEG BUSINESS VOLUMES (June 2026) ---')
    for (const [i, leg] of legs.entries()) {
      const label = i === 0 ? 'POWER' : `Leg ${i + 1}`
      this.logger.info(
        `  ${label}: ₹${leg.volume.toLocaleString('en-IN')} (PJ${String(leg.legId).padStart(6, '0')})`
      )
    }
    this.logger.info(`  ────────────────────────────────────`)
    this.logger.info(`  TOTAL:    ₹${total.toLocaleString('en-IN')}`)
    this.logger.info(
      `  POWER:    ₹${power.toLocaleString('en-IN')} (${((power / total) * 100).toFixed(1)}%)`
    )
    this.logger.info(
      `  WEAKER:   ₹${weaker.toLocaleString('en-IN')} (${((weaker / total) * 100).toFixed(1)}%)`
    )

    const oldMatched = total > 0 && power >= total * 0.6 && weaker > 0
    const newMatched = total > 0 && power >= total * 0.6 && weaker >= total * 0.4

    const descending = [...PERFORMANCE_INCENTIVE_CONFIG].sort((a, b) => b.criteria - a.criteria)

    let oldRank = null
    if (oldMatched) {
      for (const rank of descending) {
        if (total >= rank.criteria) {
          oldRank = rank
          break
        }
      }
    }

    let newRank = null
    if (newMatched) {
      for (const rank of descending) {
        if (
          total >= rank.criteria &&
          power >= rank.criteria * 0.6 &&
          weaker >= rank.criteria * 0.4
        ) {
          newRank = rank
          break
        }
      }
    }

    this.logger.info('')
    this.logger.info('--- 60:40 RATIO CHECK ---')
    this.logger.info(`  OLD RULE (buggy): power >= 60% total AND weaker > 0`)
    this.logger.info(
      `    Power/Total: ${((power / total) * 100).toFixed(1)}% ${oldMatched ? 'PASS' : 'FAIL'}`
    )
    this.logger.info(`    Weaker > 0:   ${weaker > 0 ? 'PASS' : 'FAIL'}`)
    this.logger.info(
      `    Result:       ${oldRank ? oldRank.designation : 'NO RANK'} (Rs${oldRank?.reward || 0})`
    )

    this.logger.info('')
    this.logger.info(`  NEW RULE (correct): power >= 60% total AND weaker >= 40% total`)
    this.logger.info(
      `    Power/Total:  ${((power / total) * 100).toFixed(1)}% ${power >= total * 0.6 ? 'PASS' : 'FAIL'}`
    )
    this.logger.info(
      `    Weaker/Total: ${((weaker / total) * 100).toFixed(1)}% ${weaker >= total * 0.4 ? 'PASS' : 'FAIL'}`
    )
    this.logger.info(
      `    Result:       ${newRank ? newRank.designation : 'NO RANK'} (Rs${newRank?.reward || 0})`
    )

    const salaryRes = await db.rawQuery(
      `SELECT id, power, weaker FROM salaries WHERE user_id = ? AND created_at >= ? AND created_at <= ?`,
      [uid, june.toSQL()!, juneEnd.toSQL()!]
    )

    this.logger.info('')
    this.logger.info('--- JUNE SALARY RECORD ---')
    if (salaryRes.rows.length === 0) {
      this.logger.info('  No June 2026 salary record found.')
    } else {
      const s = salaryRes.rows[0]
      this.logger.info(`  Record ID: ${s.id}`)
      this.logger.info(`  Power:    Rs${Number(s.power).toLocaleString('en-IN')}`)
      this.logger.info(`  Weaker:   Rs${Number(s.weaker).toLocaleString('en-IN')}`)
      this.logger.info(
        `  Total:    Rs${(Number(s.power) + Number(s.weaker)).toLocaleString('en-IN')}`
      )
    }

    this.logger.info('')
    this.logger.info('══════════════════════════════════════════════════')

    if (oldRank && !newRank) {
      this.logger.warning(
        `  MISMATCH: User got ${oldRank.designation} under old rules but FAILS under new 60:40!`
      )
      this.logger.warning(
        `  EXCESS: Rs${oldRank.reward.toLocaleString('en-IN')} salary reward was undeserved.`
      )
    } else if (oldRank && newRank && oldRank.criteria > newRank.criteria) {
      this.logger.warning(
        `  MISMATCH: User got ${oldRank.designation} but should only get ${newRank.designation}!`
      )
      this.logger.warning(
        `  EXCESS: Rs${(oldRank.reward - newRank.reward).toLocaleString('en-IN')} was overpaid.`
      )
    } else if (newRank) {
      this.logger.info(
        `  CORRECT: User qualifies for ${newRank.designation} under new 60:40 rules.`
      )
    } else {
      this.logger.info(`  NO RANK: User does not meet any slab criteria.`)
    }
  }
}

import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'
import { PERFORMANCE_INCENTIVE_CONFIG } from '#enums/performance_incentive'

export default class FixJunePayout extends BaseCommand {
  static commandName = 'fix:june-payout'
  static description =
    'Audit and fix June 2026 payout: correct invalid salaries, revert excess wallet amounts'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'Set to "apply" to actually fix. Default is dry-run audit only.',
  })
  declare mode: string

  async run() {
    const dryRun = (this.mode || '').trim().toLowerCase() !== 'apply'
    const june = DateTime.fromISO('2026-06-01').startOf('month')
    const juneEnd = june.endOf('month')

    // Fetch all June salary records
    const salaries = await db.rawQuery(
      `SELECT id, user_id, power, weaker
       FROM salaries
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY user_id`,
      [june.toSQL()!, juneEnd.toSQL()!]
    )

    // Fetch all June snapshots
    const snapshots = await db.rawQuery(
      `SELECT id, user_id, gross_amount, income_wallet_amount, repurchase_wallet_amount
       FROM monthly_income_snapshots
       WHERE month = ?`,
      [june.toISODate()!]
    )
    const snapshotByUser = new Map<number, any>()
    for (const s of snapshots.rows) snapshotByUser.set(s.user_id, s)

    const descending = [...PERFORMANCE_INCENTIVE_CONFIG].sort((a, b) => b.criteria - a.criteria)

    let invalidSalaries = 0
    let validSalaries = 0
    let totalExcessWorking = 0
    let totalExcessRepurchase = 0
    let totalExcessSalary = 0

    const fixes: {
      userId: number
      oldSalaryReward: number
      newSalaryReward: number
      excessSalary: number
      excessWorking: number
      excessRepurchase: number
      oldRank: string
      newRank: string
    }[] = []

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  JUNE 2026 PAYOUT AUDIT & FIX`)
    this.logger.info(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLYING FIXES'}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    for (const s of salaries.rows) {
      const uid = s.user_id
      const power = Number(s.power || 0)
      const weaker = Number(s.weaker || 0)
      const total = power + weaker

      // Determine correct rank under NEW rules
      let newRank: { designation: string; reward: number; criteria: number } | null = null
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

      // OLD logic simulation
      const oldMatched = total > 0 && power >= total * 0.6 && weaker > 0
      let oldRank = null
      if (oldMatched) {
        for (const rank of descending) {
          if (total >= rank.criteria) {
            oldRank = rank
            break
          }
        }
      }

      const oldSalaryReward = oldRank?.reward || 0
      const newSalaryReward = newRank?.reward || 0
      const excessSalary = oldSalaryReward - newSalaryReward

      if (excessSalary > 0) {
        const excessWorking = Math.round(excessSalary * 0.7 * 100) / 100
        const excessRepurchase = Math.round(excessSalary * 0.2 * 100) / 100

        invalidSalaries++
        totalExcessSalary += excessSalary
        totalExcessWorking += excessWorking
        totalExcessRepurchase += excessRepurchase

        fixes.push({
          userId: uid,
          oldSalaryReward,
          newSalaryReward,
          excessSalary,
          excessWorking,
          excessRepurchase,
          oldRank: oldRank?.designation || 'NONE',
          newRank: newRank?.designation || 'NONE',
        })

        this.logger.warning(
          `PJ${String(uid).padStart(6, '0')}: OLD=${oldRank?.designation || 'NONE'}(₹${oldSalaryReward}) → NEW=${newRank?.designation || 'NONE'}(₹${newSalaryReward}) | EXCESS=₹${excessSalary}`
        )
      } else if (oldMatched && newRank) {
        validSalaries++
        this.logger.info(`PJ${String(uid).padStart(6, '0')}: ${newRank.designation} = VALID`)
      } else {
        this.logger.info(`PJ${String(uid).padStart(6, '0')}: No qualifying rank = VALID`)
      }
    }

    this.logger.info('')
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  AUDIT SUMMARY`)
    this.logger.info(`  Total June salary records:   ${salaries.rows.length}`)
    this.logger.info(`  Valid (unchanged):             ${validSalaries}`)
    this.logger.info(`  Invalid (excess paid):       ${invalidSalaries}`)
    this.logger.info(`  Total excess salary reward:  ₹${totalExcessSalary.toLocaleString('en-IN')}`)
    this.logger.info(
      `  Total excess working wallet: ₹${totalExcessWorking.toLocaleString('en-IN')}`
    )
    this.logger.info(
      `  Total excess repurchase:     ₹${totalExcessRepurchase.toLocaleString('en-IN')}`
    )
    this.logger.info(`══════════════════════════════════════════════════`)

    if (invalidSalaries === 0) {
      this.logger.info(
        'All June salary records are valid under the new 60:40 rules. No fixes needed.'
      )
      return
    }

    if (dryRun) {
      this.logger.info('')
      this.logger.info('DRY RUN — no changes applied.')
      this.logger.info(`Run "node ace fix:june-payout apply" to execute fixes.`)
      return
    }

    this.logger.info('')
    this.logger.info('APPLYING FIXES...')

    let fixedCount = 0

    for (const fix of fixes) {
      const uid = fix.userId

      // Delete the invalid salary record
      await db.rawQuery(
        `DELETE FROM salaries WHERE user_id = ? AND created_at >= ? AND created_at <= ?`,
        [uid, june.toSQL()!, juneEnd.toSQL()!]
      )

      // Recalculate correct gross for the snapshot
      const snapshot = snapshotByUser.get(uid)
      if (snapshot) {
        const oldGross = Number(snapshot.gross_amount)
        const correctGross = Math.max(0, oldGross - fix.excessSalary)
        const correctWorking = Math.round(correctGross * 0.7 * 100) / 100
        const correctRepurchase = Math.round(correctGross * 0.2 * 100) / 100

        await db.rawQuery(
          `UPDATE monthly_income_snapshots SET gross_amount = ?, income_wallet_amount = ?, repurchase_wallet_amount = ? WHERE id = ?`,
          [correctGross, correctWorking, correctRepurchase, snapshot.id]
        )
      }

      // Subtract excess from wallet columns
      if (fix.excessWorking > 0) {
        await db.rawQuery(
          `UPDATE users SET working_wallet = GREATEST(working_wallet - ?, 0) WHERE id = ?`,
          [fix.excessWorking, uid]
        )
      }
      if (fix.excessRepurchase > 0) {
        await db.rawQuery(
          `UPDATE users SET repurchase_wallet = GREATEST(repurchase_wallet - ?, 0) WHERE id = ?`,
          [fix.excessRepurchase, uid]
        )
      }

      // Create reversal transactions for audit trail
      if (fix.excessWorking > 0) {
        await db.rawQuery(
          `INSERT INTO transactions (id, user_id, amount, type, remark, created_at, updated_at, approved_at) VALUES (?, ?, ?, 'wallet_debit', ?, NOW(), NOW(), NOW())`,
          [
            cuid(),
            uid,
            fix.excessWorking,
            `REVERSAL: Excess working wallet from June 2026 payout (old rank: ${fix.oldRank}, correct: ${fix.newRank})`,
          ]
        )
      }
      if (fix.excessRepurchase > 0) {
        await db.rawQuery(
          `INSERT INTO transactions (id, user_id, amount, type, remark, created_at, updated_at, approved_at) VALUES (?, ?, ?, 'wallet_debit', ?, NOW(), NOW(), NOW())`,
          [
            cuid(),
            uid,
            fix.excessRepurchase,
            `REVERSAL: Excess repurchase wallet from June 2026 payout (old rank: ${fix.oldRank}, correct: ${fix.newRank})`,
          ]
        )
      }

      fixedCount++
      this.logger.info(
        `  → Fixed PJ${String(uid).padStart(6, '0')}: reverted ₹${fix.excessWorking.toLocaleString('en-IN')} working + ₹${fix.excessRepurchase.toLocaleString('en-IN')} repurchase`
      )
    }

    this.logger.success(`Fixed ${fixedCount} users.`)
    this.logger.info('')
    this.logger.info(`Reverted totals:`)
    this.logger.info(
      `  Excess salary rewards deleted:  ₹${totalExcessSalary.toLocaleString('en-IN')}`
    )
    this.logger.info(
      `  Excess working wallet reversed: ₹${totalExcessWorking.toLocaleString('en-IN')}`
    )
    this.logger.info(
      `  Excess repurchase reversed:     ₹${totalExcessRepurchase.toLocaleString('en-IN')}`
    )
    this.logger.info('')
    this.logger.info(
      'All affected users now have correct June 2026 balances under the new 60:40 slab rules.'
    )
  }
}

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Diagnostic: Find investments that have no matching purchase, and users
 * who receive cashback distributions despite having no purchases.
 *
 * Usage:
 *   node ace find-orphan-investments          (dry run / diagnostic)
 *   node ace find-orphan-investments --apply   (close orphaned investments + reverse distributions)
 */
export default class FindOrphanInvestments extends BaseCommand {
  static commandName = 'find-orphan-investments'
  static description = 'Find and optionally fix investments with no matching purchase'
  static options: CommandOptions = { startApp: true }

  async run() {
    const apply = process.argv.includes('--apply')

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  ORPHANED INVESTMENT DIAGNOSTIC')
    this.logger.info(`  Mode: ${apply ? 'APPLY (live)' : 'DRY RUN (diagnostic only)'}`)
    this.logger.info('══════════════════════════════════════════════════')

    // 1. Find investments with no matching approved purchase
    const orphanResult = await db.rawQuery(`
      SELECT
        i.id AS investment_id,
        i.user_id,
        i.amount AS investment_amount,
        i.status AS investment_status,
        i.started_at,
        i.purchase_id,
        p.id AS purchase_id_check,
        p.amount AS purchase_amount,
        p.approved_at AS purchase_approved_at,
        p.cancelled_at AS purchase_cancelled_at,
        u.name AS user_name,
        u.code AS user_code,
        u.income_wallet,
        u.working_wallet
      FROM investments i
      LEFT JOIN purchases p ON p.id = i.purchase_id
      LEFT JOIN users u ON u.id = i.user_id
      WHERE i.status = 'active'
        AND (
          i.purchase_id IS NULL
          OR p.id IS NULL
          OR p.approved_at IS NULL
          OR p.cancelled_at IS NOT NULL
        )
      ORDER BY i.user_id
    `)

    this.logger.info(`\nFound ${orphanResult.rows.length} orphaned investments:`)

    if (orphanResult.rows.length === 0) {
      this.logger.info('  No orphaned investments found!')
      return
    }

    let totalInvestmentAmount = 0

    for (const row of orphanResult.rows) {
      const reason = !row.purchase_id
        ? 'NO purchase_id set'
        : !row.purchase_id_check
          ? 'purchase_id points to non-existent purchase'
          : row.purchase_approved_at === null
            ? 'purchase exists but NOT approved'
            : 'purchase was cancelled'

      this.logger.info(`\n  Investment #${row.investment_id} — User: ${row.user_name || 'Unknown'} (ID: ${row.user_id}, Code: ${row.user_code || 'N/A'})`)
      this.logger.info(`    Amount: ₹${row.investment_amount} | Status: ${row.investment_status}`)
      this.logger.info(`    Purchase ID: ${row.purchase_id || 'NULL'} | Reason: ${reason}`)
      totalInvestmentAmount += Number(row.investment_amount)
    }

    this.logger.info(`\n  Total orphaned investment amount: ₹${totalInvestmentAmount}`)

    // 2. Find distributions from these orphaned investments
    const orphanIds = orphanResult.rows.map((r: any) => r.investment_id)
    if (orphanIds.length > 0) {
      const distResult = await db.rawQuery(`
        SELECT
          ird.id AS distribution_id,
          ird.user_id,
          ird.investment_id,
          ird.period_month,
          ird.return_amount,
          ird.income_amount,
          ird.gold_amount,
          u.name AS user_name,
          u.code AS user_code
        FROM investment_return_distributions ird
        LEFT JOIN users u ON u.id = ird.user_id
        WHERE ird.investment_id IN (${orphanIds.join(',')})
        ORDER BY ird.user_id, ird.period_month
      `)

      let totalCashback = 0
      let totalReturn = 0

      this.logger.info(`\n  Distributions from orphaned investments: ${distResult.rows.length}`)

      // Group by user for summary
      const byUser = new Map<number, { name: string; code: string; total: number; distributions: any[] }>()
      for (const d of distResult.rows) {
        const uid = d.user_id
        if (!byUser.has(uid)) {
          byUser.set(uid, { name: d.user_name, code: d.user_code, total: 0, distributions: [] })
        }
        const entry = byUser.get(uid)!
        entry.total += Number(d.income_amount)
        entry.distributions.push(d)
        totalCashback += Number(d.income_amount)
        totalReturn += Number(d.return_amount)
      }

      for (const [userId, data] of byUser) {
        this.logger.info(`\n  User: ${data.name} (ID: ${userId}, Code: ${data.code || 'N/A'})`)
        this.logger.info(`    Total cashback from orphaned investments: ₹${data.total}`)
        this.logger.info(`    Distributions: ${data.distributions.length}`)
        for (const d of data.distributions) {
          this.logger.info(`      ${d.period_month}: return=₹${d.return_amount}, income=₹${d.income_amount}, gold=₹${d.gold_amount}`)
        }
      }

      this.logger.info(`\n  TOTAL cashback paid from orphaned investments: ₹${totalCashback}`)
      this.logger.info(`  TOTAL return from orphaned investments: ₹${totalReturn}`)

      if (apply) {
        this.logger.info('\n  APPLYING FIXES...')

        await db.transaction(async (trx) => {
          // Close orphaned investments
          for (const row of orphanResult.rows) {
            await trx.rawQuery(
              `UPDATE investments SET status = 'closed', closed_at = NOW(), remark = 'Closed by find-orphan-investments: no valid purchase' WHERE id = ?`,
              [row.investment_id]
            )
            this.logger.info(`  Closed investment #${row.investment_id}`)
          }

          // Delete distributions from orphaned investments
          for (const id of orphanIds) {
            await trx.rawQuery(
              `DELETE FROM investment_return_distributions WHERE investment_id = ?`,
              [id]
            )
            this.logger.info(`  Deleted distributions for investment #${id}`)
          }

          // Reverse wallet credits for each affected user
          for (const [userId, data] of byUser) {
            if (data.total > 0) {
              // Debit income wallet
              await trx.rawQuery(
                `UPDATE users SET income_wallet = GREATEST(0, income_wallet - ?) WHERE id = ?`,
                [data.total, userId]
              )

              // Record reversal transaction
              await trx.rawQuery(
                `INSERT INTO transactions (user_id, type, amount, remark, approved_at, created_at)
                 VALUES (?, 'wallet_debit', ?, 'REVERSAL: Cashback from orphaned investments (no valid purchase) — closed by find-orphan-investments', NOW(), NOW())`,
                [userId, data.total]
              )
              this.logger.info(`  Reversed ₹${data.total} from user ${userId} (${data.name})`)
            }
          }
        })

        this.logger.info('\n  ALL FIXES APPLIED.')
      } else {
        this.logger.info('\n  [DRY RUN] No changes made. Run with --apply to close orphaned investments and reverse distributions.')
      }
    }

    this.logger.info('\n══════════════════════════════════════════════════')
    this.logger.info('  DONE')
    this.logger.info('══════════════════════════════════════════════════')
  }
}

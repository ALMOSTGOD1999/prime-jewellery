import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PayoutService from '#services/payout_service'
import WalletService from '#services/wallet_service'

import User from '#models/user'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'
import router from '@adonisjs/core/services/router'

/**
 * Process August 2026 payouts for all eligible users:
 *   1. Cashback (Income Wallet) — distributes investment returns, credits 70% income + 20% repurchase
 *   2. Working Wallet — snapshots monthly working income, credits 70% working + 20% repurchase
 *
 * Run: node ace run-august-payout
 */
export default class RunAugustPayout extends BaseCommand {
  static commandName = 'run-august-payout'
  static description = 'Process August 2026 payouts for all eligible users'
  static options: CommandOptions = { startApp: true }

  async run() {
    const august = DateTime.fromISO('2026-08-01').startOf('month')

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  PROCESSING AUGUST 2026 PAYOUTS')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('')

    router.commit()

    // ─── Step 1: Process Cashback (Income Wallet) Payout ───
    this.logger.info('─── Step 1: Processing Cashback (Income Wallet) Payout ───')

    try {
      const incomeResult = await PayoutService.processIncomeWalletPayout(august, 1)
      this.logger.success(
        `  Cashback payout complete: ${incomeResult.processed} distributions paid`
      )
    } catch (error: any) {
      this.logger.error(`  Cashback payout failed: ${error.message}`)
      this.logger.info('  Continuing with working wallet payout...')
    }

    this.logger.info('')

    // ─── Step 2: Process Working Wallet Payout ───
    this.logger.info('─── Step 2: Processing Working Wallet Payout ───')

    try {
      // 2a: Ensure snapshots exist
      const snapResult = await PayoutService.snapshotMonthlyIncomes(august)
      this.logger.info(`  Snapshots created: ${snapResult.created} (skipped existing)`)

      // 2b: Credit each unpaid snapshot individually
      const unpaidSnapshots = await MonthlyIncomeSnapshot.query()
        .where('month', august.toISODate()!)
        .whereNull('paid_out_at')

      this.logger.info(`  Unpaid snapshots to credit: ${unpaidSnapshots.length}`)
      let credited = 0
      let totalAmount = 0

      for (const snapshot of unpaidSnapshots) {
        const snapStart = Date.now()
        try {
          const snapUser = await User.query().where('id', snapshot.userId).first()
          if (!snapUser || snapUser.status === 'inactive') {
            snapshot.paidOutAt = DateTime.now()
            await snapshot.save()
            this.logger.info(`  Snapshot ${snapshot.userId}: skipped (inactive)`)
            continue
          }

          const gross = Number(snapshot.grossAmount)
          const incomeAmount = Math.round(gross * 0.7 * 100) / 100
          const repurchaseAmount = Math.round(gross * 0.2 * 100) / 100

          await WalletService.creditWorkingWallet(
            snapshot.userId,
            incomeAmount,
            1,
            `Working wallet (70%) from working income for ${august.toFormat('LLLL yyyy')}`
          )
          if (repurchaseAmount > 0) {
            await WalletService.creditRepurchaseWallet(
              snapshot.userId,
              repurchaseAmount,
              1,
              `Repurchase wallet (20%) from working income for ${august.toFormat('LLLL yyyy')}`
            )
          }

          snapshot.paidOutAt = DateTime.now()
          await snapshot.save()
          credited++
          totalAmount += gross
          this.logger.info(
            `  Snapshot ${snapshot.userId}: ₹${gross.toLocaleString('en-IN')} (${Date.now() - snapStart}ms)`
          )
        } catch (error: any) {
          this.logger.error(
            `  Snapshot ${snapshot.userId}: FAILED (${Date.now() - snapStart}ms): ${error.message}`
          )
        }
      }

      // 2c: Record payout month
      await PlatformConfig.set(
        'working_wallet_payout_month',
        august.toFormat('yyyy-MM'),
        'payout',
        'Working Wallet Payout Month',
        'Last month for which working wallet payout was processed'
      )

      this.logger.success(
        `  Working payout complete: ${credited} users credited, gross ₹${totalAmount.toLocaleString('en-IN')}`
      )
    } catch (error: any) {
      this.logger.error(`  Working payout failed: ${error.message}`)
    }

    // ─── Summary ───
    this.logger.info('')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  AUGUST 2026 PAYOUT COMPLETE')
    this.logger.info('══════════════════════════════════════════════════')

    const snapCount = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [august.toISODate()!]
    )
    const distCount = await db.rawQuery(
      `SELECT count(*)::int as total FROM investment_return_distributions WHERE period_month = ? AND paid_out_at IS NOT NULL`,
      [august.toISODate()!]
    )
    const walletTotals = await db.rawQuery(`
      SELECT
        coalesce(sum(income_wallet), 0)::float as total_income,
        coalesce(sum(working_wallet), 0)::float as total_working,
        coalesce(sum(repurchase_wallet), 0)::float as total_repurchase,
        count(*) FILTER (WHERE income_wallet > 0 OR working_wallet > 0 OR repurchase_wallet > 0) as users_with_balance
      FROM users WHERE role = 'user'
    `)

    this.logger.info(`  Income payouts:    ${distCount.rows[0]?.total || 0} distributions`)
    this.logger.info(`  Working payouts:   ${snapCount.rows[0]?.total || 0} snapshots (gross ₹${Number(snapCount.rows[0]?.gross || 0).toLocaleString('en-IN')})`)
    this.logger.info(`  Wallet totals:     Income ₹${Number(walletTotals.rows[0]?.total_income || 0).toLocaleString('en-IN')} | Working ₹${Number(walletTotals.rows[0]?.total_working || 0).toLocaleString('en-IN')} | Repurchase ₹${Number(walletTotals.rows[0]?.total_repurchase || 0).toLocaleString('en-IN')}`)
    this.logger.info(`  Users with balance: ${walletTotals.rows[0]?.users_with_balance || 0}`)
    this.logger.info('══════════════════════════════════════════════════')
  }
}

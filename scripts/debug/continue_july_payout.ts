import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import PayoutService from '#services/payout_service'
import WalletService from '#services/wallet_service'
import User from '#models/user'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'
import router from '@adonisjs/core/services/router'

/**
 * Continuation of `rerun-july-payout` for July 2026. Steps 1 (salaries) and
 * 2 (income payout) already completed in the first run before the process was
 * interrupted, so this command only finishes Step 3:
 *   3a. Create any missing working-income snapshots (skips existing)
 *   3b. Credit each unpaid snapshot individually (70% working + 20% repurchase)
 *   3c. Record working_wallet_payout_month config
 *
 * Idempotent: existing snapshots are skipped, only unpaid ones are credited.
 *
 * Run: node ace continue-july-payout
 */
export default class ContinueJulyPayout extends BaseCommand {
  static commandName = 'continue-july-payout'
  static description = 'Finish July 2026 working-wallet payout (snapshots + credits) after interrupted rerun'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')

    router.commit()

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  CONTINUE JULY 2026 WORKING PAYOUT')
    this.logger.info('══════════════════════════════════════════════════')

    try {
      // 3a: Ensure snapshots exist (skips existing)
      const snapResult = await PayoutService.snapshotMonthlyIncomes(july)
      this.logger.info(`  Snapshots created: ${snapResult.created} (skipped existing)`)

      // 3b: Credit each unpaid snapshot individually
      const unpaidSnapshots = await MonthlyIncomeSnapshot.query()
        .where('month', july.toISODate()!)
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
            `Working wallet (70%) from working income for ${july.toFormat('LLLL yyyy')}`
          )
          if (repurchaseAmount > 0) {
            await WalletService.creditRepurchaseWallet(
              snapshot.userId,
              repurchaseAmount,
              1,
              `Repurchase wallet (20%) from working income for ${july.toFormat('LLLL yyyy')}`
            )
          }

          snapshot.paidOutAt = DateTime.now()
          await snapshot.save()
          credited++
          totalAmount += gross
          this.logger.info(`  Snapshot ${snapshot.userId}: ₹${gross.toLocaleString('en-IN')} (${Date.now() - snapStart}ms)`)
        } catch (error: any) {
          this.logger.error(
            `  Snapshot ${snapshot.userId}: FAILED (${Date.now() - snapStart}ms): ${error.message}`
          )
        }
      }

      // 3c: Record payout month
      await PlatformConfig.set(
        'working_wallet_payout_month',
        july.toFormat('yyyy-MM'),
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

    this.logger.info('══════════════════════════════════════════════════')
  }
}

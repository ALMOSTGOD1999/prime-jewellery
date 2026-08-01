import { BaseJob } from 'adonis-resque'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import PayoutService from '#services/payout_service'

/**
 * Processes the working-wallet payout for a full calendar month in the
 * background (day 1 → last day of the month). The computation is heavy
 * (recursive downline queries per user) and can take several minutes,
 * so it must not run inside an HTTP request.
 *
 * Enqueue with: ProcessWorkingPayout.enqueue('2026-07', adminId)
 */
export default class ProcessWorkingPayout extends BaseJob {
  async perform(monthStr: string, adminId: number) {
    const month = DateTime.fromISO(monthStr + '-01').startOf('month')

    try {
      const result = await PayoutService.processWorkingWalletPayout(month, adminId)
      logger.info(
        `[payout] Working payout for ${monthStr} done: ${result.credited} users credited, total gross ₹${result.totalAmount.toLocaleString('en-IN')}`
      )
    } catch (error) {
      logger.error(
        `[payout] Working payout for ${monthStr} FAILED: ${error instanceof Error ? error.message : error}`
      )
      throw error
    }
  }
}

import { BaseJob } from 'adonis-resque'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import PayoutService from '#services/payout_service'
import PlatformConfig from '#models/platform_config'

/**
 * Generates the payout preview for a given month in the background.
 * The computation is heavy (recursive downline queries per user) and can
 * take several minutes, so it must not run inside an HTTP request.
 *
 * Enqueue with: GeneratePayoutPreview.enqueue('2026-07')
 */
export default class GeneratePayoutPreview extends BaseJob {
  async perform(monthStr: string) {
    const month = DateTime.fromISO(monthStr + '-01').startOf('month')

    try {
      const result = await PayoutService.getPayoutPreview(month)
      const payload = { ...result, generatedAt: DateTime.now().toISO() }

      await PlatformConfig.set(
        `payout_preview_${monthStr}`,
        JSON.stringify(payload),
        'payout_preview'
      )

      logger.info(
        `[payout-preview] Generated for ${monthStr}: ${result.users.length} users, grand total ₹${result.summary.grandTotal.toLocaleString('en-IN')}`
      )
    } catch (error) {
      logger.error(
        `[payout-preview] Generation for ${monthStr} FAILED: ${error instanceof Error ? error.message : error}`
      )
      throw error
    } finally {
      // Always clear the generating flag so the page can reload
      await PlatformConfig.set(`payout_preview_generating_${monthStr}`, 'false', 'payout_preview')
    }
  }
}

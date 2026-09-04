import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * One-time fix: clear stuck payout_preview_generating_2026-08 flag.
 * The background job never completed, leaving the flag stuck as 'true'.
 * This blocks the preview page from ever generating.
 */
export default class extends BaseSchema {
  async up() {
    await db.rawQuery(`
      UPDATE platform_configs
      SET value = 'false', updated_at = NOW()
      WHERE key = 'payout_preview_generating_2026-08'
        AND value = 'true'
    `)
    console.log('Cleared stuck generating flag for 2026-08')
  }

  async down() {
    // No-op: flag will be set again when generate is clicked
  }
}

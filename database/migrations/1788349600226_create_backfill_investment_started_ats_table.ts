import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Backfill investment.started_at to use purchase.created_at instead of
 * purchase.approved_at. This ensures users who joined late in a month
 * still get prorated returns from their actual join date.
 *
 * Example: User joined Aug 28, purchase approved Sept 2.
 * BEFORE: investment.startedAt = Sept 2 → Aug payout = ₹0
 * AFTER:  investment.startedAt = Aug 28 → Aug payout = 4/30 prorated
 */
export default class extends BaseSchema {
  async up() {
    await db.rawQuery(`
      UPDATE investments i
      SET started_at = p.created_at
      FROM purchases p
      WHERE i.purchase_id = p.id
        AND i.started_at != p.created_at
    `)
  }

  async down() {
    // No reverse — the old started_at values are lost.
  }
}

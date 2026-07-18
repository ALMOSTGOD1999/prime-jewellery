import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckPurchaseDate extends BaseCommand {
  static commandName = 'check:purchase-date'
  static description = 'Check purchase dates for PJ630351 downline'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Query all descendants of PJ630351
    const descendants = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT d.id, d.name, d.depth FROM descendants d
      ORDER BY d.depth, d.id`,
      [630351]
    )

    this.logger.info(`Found ${descendants.rows.length} descendants`)

    // Get purchase records for these descendants
    const descendantIds = descendants.rows.map((r: any) => r.id)
    if (descendantIds.length === 0) {
      this.logger.info('No descendants found')
      return
    }

    const purchases = await db.rawQuery(
      `SELECT
        p.id,
        p.user_id,
        u.name,
        p.amount,
        p.approved_at,
        p.created_at,
        p.cancelled_at,
        p.stopped_at
      FROM purchases p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ANY(?)
      ORDER BY p.approved_at ASC`,
      [descendantIds]
    )

    this.logger.info(`Found ${purchases.rows.length} purchase records`)
    for (const r of purchases.rows) {
      this.logger.info(`User PJ${String(r.user_id).padStart(6, '0')} (${r.name}) — Amount: ₹${r.amount} — Approved: ${r.approved_at} — Created: ${r.created_at}`)
    }

    // Also check the actual level income calculation dates from the service
    this.logger.info('')
    this.logger.info('=== Checking the source of the 2026-06-17 start date ===')

    // Check user PJ932914 specifically (direct child with 401000 purchase)
    const user932914 = await db.rawQuery(
      `SELECT id, name, created_at, activated_at FROM users WHERE id = 932914`
    )
    if (user932914.rows.length > 0) {
      const u = user932914.rows[0]
      this.logger.info(`PJ932914: created_at=${u.created_at}, activated_at=${u.activated_at}`)
    }

    // Check purchase for PJ932914
    const purchase932914 = await db.rawQuery(
      `SELECT * FROM purchases WHERE user_id = 932914 ORDER BY approved_at ASC`
    )
    for (const r of purchase932914.rows) {
      this.logger.info(`Purchase for PJ932914: id=${r.id}, amount=${r.amount}, approved_at=${r.approved_at}, created_at=${r.created_at}`)
    }
  }
}

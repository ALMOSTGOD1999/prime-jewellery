import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * One-time data fix: shift all purchases/investments created on
 * 2026-09-01 to 2026-08-31 so they qualify for the August payout.
 *
 * What changes:
 *  - purchases.created_at  → 2026-08-31 23:59:59
 *  - purchases.approved_at → 2026-08-31 23:59:59 (if set)
 *  - investments.started_at → 2026-08-31 00:00:00
 *  - investments.created_at → 2026-08-31 23:59:59
 */
export default class extends BaseSchema {
  async up() {
    // 1. Update purchases: created_at and approved_at
    await db.rawQuery(`
      UPDATE purchases
      SET created_at = '2026-08-31 23:59:59'::timestamp,
          approved_at = CASE WHEN approved_at IS NOT NULL THEN '2026-08-31 23:59:59'::timestamp ELSE NULL END,
          updated_at = NOW()
      WHERE DATE(created_at) = '2026-09-01'
    `)
    console.log('Purchases updated')

    // 2. Update investments: started_at and created_at
    await db.rawQuery(`
      UPDATE investments
      SET started_at = '2026-08-31 00:00:00'::timestamp,
          created_at = '2026-08-31 23:59:59'::timestamp,
          updated_at = NOW()
      WHERE DATE(started_at) = '2026-09-01'
    `)
    console.log('Investments updated')
  }

  async down() {
    // Reverse: shift back to Sept 1
    await db.rawQuery(`
      UPDATE purchases
      SET created_at = '2026-09-01 00:00:00',
          approved_at = CASE WHEN approved_at IS NOT NULL THEN '2026-09-01 00:00:00' ELSE NULL END,
          updated_at = NOW()
      WHERE DATE(created_at) = '2026-08-31'
        AND DATE(updated_at) >= '2026-09-01'
    `)

    await db.rawQuery(`
      UPDATE investments
      SET started_at = '2026-09-01 00:00:00',
          created_at = '2026-09-01 00:00:00',
          updated_at = NOW()
      WHERE DATE(started_at) = '2026-08-31'
        AND DATE(updated_at) >= '2026-09-01'
    `)
  }
}

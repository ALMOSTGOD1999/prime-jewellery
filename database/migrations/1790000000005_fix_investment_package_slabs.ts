import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // ─── Step 1: Remove old/wrong investment package slabs ───
    // Delete the legacy "Package 1" (10000-499000) and "Package 2" (500000+)
    // that were inserted by migration 1790000000003 defaults — they lack the
    // correct 3-tier structure mandated by business rules.
    await db.rawQuery(`DELETE FROM investment_packages WHERE name IN ('Package 1', 'Package 2')`)

    // ─── Step 2: Ensure correct 3-tier slabs exist ───
    const existing = await db.from('investment_packages').where('is_active', true).first()

    if (!existing) {
      await db.table('investment_packages').insert([
        {
          name: 'Silver Plan',
          min_amount: 10000,
          max_amount: 199999,
          monthly_return_percent: 3,
          max_return_percent: 100,
          sort_order: 1,
          is_active: true,
        },
        {
          name: 'Gold Plan',
          min_amount: 200000,
          max_amount: 499999,
          monthly_return_percent: 3.5,
          max_return_percent: 100,
          sort_order: 2,
          is_active: true,
        },
        {
          name: 'Platinum Plan',
          min_amount: 500000,
          max_amount: null,
          monthly_return_percent: 4,
          max_return_percent: 100,
          sort_order: 3,
          is_active: true,
        },
      ])
    } else {
      // Slabs already exist (likely from the seeder), but ensure they have
      // correct monthly_return_percent values just in case.
      await db.rawQuery(`
        UPDATE investment_packages
        SET monthly_return_percent = CASE
          WHEN name ILIKE '%silver%' THEN 3
          WHEN name ILIKE '%gold%' THEN 3.5
          WHEN name ILIKE '%platinum%' THEN 4
          ELSE monthly_return_percent
        END,
        max_return_percent = 100
        WHERE is_active = true
      `)
    }

    // ─── Step 3: Fix investments with wrong monthly_return_rate ───
    // Get the correct slabs (descending so tighter ranges match first)
    const slabs = await db
      .from('investment_packages')
      .where('is_active', true)
      .orderBy('min_amount', 'desc')

    if (slabs.length === 0) return

    // Find all active investments
    const investments = await db.from('investments').where('status', 'active')

    for (const investment of investments) {
      const amount = Number(investment.amount)
      const currentRate = Number(investment.monthly_return_rate)

      // Find the correct slab for this amount
      let correctRate: number | null = null
      for (const slab of slabs) {
        const minAmt = Number(slab.min_amount)
        const maxAmt = slab.max_amount === null ? null : Number(slab.max_amount)
        if (amount >= minAmt && (maxAmt === null || amount <= maxAmt)) {
          correctRate = Number(slab.monthly_return_percent)
          break
        }
      }

      // Fix if wrong
      if (correctRate !== null && currentRate !== correctRate) {
        await db.rawQuery(`UPDATE investments SET monthly_return_rate = ? WHERE id = ?`, [
          correctRate,
          investment.id,
        ])
      }
    }
  }

  async down() {
    // No reversal needed — this is a data-correction migration
  }
}

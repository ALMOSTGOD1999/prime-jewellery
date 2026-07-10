import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // Ensure default packages exist
    const existingPackages = await db.from('investment_packages').where('is_active', true).first()
    if (!existingPackages) {
      await db.table('investment_packages').insert([
        {
          name: 'Package 1',
          min_amount: 10000,
          max_amount: 499000,
          monthly_return_percent: 3,
          max_return_percent: 100,
          sort_order: 1,
          is_active: true,
        },
        {
          name: 'Package 2',
          min_amount: 500000,
          max_amount: null,
          monthly_return_percent: 4,
          max_return_percent: 100,
          sort_order: 2,
          is_active: true,
        },
      ])
    }

    // Get each user's total approved purchases
    const userPurchases = await db.rawQuery(
      `SELECT user_id, sum(amount)::float as total_amount, min(approved_at) as first_purchase
       FROM purchases
       WHERE approved_at IS NOT NULL AND cancelled_at IS NULL
       GROUP BY user_id`
    )

    const slabs = await db
      .from('investment_packages')
      .where('is_active', true)
      .orderBy('min_amount', 'asc')

    for (const row of userPurchases.rows) {
      const userId = row.user_id
      const amount = row.total_amount
      const firstPurchase = row.first_purchase

      // Skip if active investment already exists
      const existing = await db
        .from('investments')
        .where('user_id', userId)
        .where('status', 'active')
        .first()
      if (existing) continue

      // Find matching slab
      let slab = slabs[0]
      for (const s of slabs) {
        if (
          amount >= Number(s.min_amount) &&
          (s.max_amount === null || amount <= Number(s.max_amount))
        ) {
          slab = s
          break
        }
      }
      if (!slab) continue

      await db.table('investments').insert({
        user_id: userId,
        amount: amount,
        monthly_return_rate: slab.monthly_return_percent,
        status: 'active',
        started_at: firstPurchase || new Date(),
        remark: 'Auto-created from gold purchases',
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
  }

  async down() {}
}

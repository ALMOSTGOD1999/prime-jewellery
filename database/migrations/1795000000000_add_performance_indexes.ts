import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Critical for dashboard wallet queries (filtered by user_id + remark pattern)
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_transactions_user_remark ON transactions(user_id, remark text_pattern_ops)`
    )

    // Critical for purchase aggregation queries (filtered by user_id, approved_at, cancelled_at)
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_purchases_user_approved ON purchases(user_id, approved_at DESC) WHERE approved_at IS NOT NULL AND cancelled_at IS NULL`
    )

    // Critical for tree/team queries (recursive CTE on parent_id)
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_id) WHERE parent_id IS NOT NULL`
    )

    // Dashboard metrics: team business by month
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_purchases_approved_date ON purchases(approved_at DESC) WHERE approved_at IS NOT NULL AND cancelled_at IS NULL`
    )

    // Admin dashboard: user activation counts
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_users_activated ON users(activated_at) WHERE activated_at IS NOT NULL`
    )

    // Wallet page: transactions by type + user
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type)`
    )

    // Speed up monthly_income_snapshots lookups
    await this.db.rawQuery(
      `CREATE INDEX IF NOT EXISTS idx_snapshots_user_paid ON monthly_income_snapshots(user_id) WHERE paid_out_at IS NOT NULL`
    )

    console.log('✅ Created performance indexes')
  }

  async down() {
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_transactions_user_remark`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_purchases_user_approved`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_users_parent`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_purchases_approved_date`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_users_activated`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_transactions_user_type`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_snapshots_user_paid`)
    console.log('✅ Dropped performance indexes')
  }
}

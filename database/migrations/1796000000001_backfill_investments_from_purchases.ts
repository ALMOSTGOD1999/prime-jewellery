import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Backfill: turn every eligible approved gold purchase into its own investment.
 *
 * Gold purchases and investments are the same thing. The earlier migration
 * (1790000000003, run 2026-07-10) only created ONE aggregated investment per
 * user, so every purchase made after that date was never converted — e.g.
 * PJ236641's ₹10,00,000 purchase from 2026-07-15 produced no investment and
 * therefore no cashback-wallet payout.
 *
 * This migration creates a per-purchase investment (prorated from the purchase
 * date, exactly like the payout logic expects) for purchases that are not yet
 * represented by an investment:
 *
 *   - already linked via purchase_id            → skip (idempotent)
 *   - user has an active aggregate investment   → skip (that aggregate was the
 *     old one-per-user conversion; creating another one here would double-credit
 *     the July payout for the same purchase)
 *
 * Amounts use the same investment-package slabs as InvestmentService, so the
 * monthly return rate matches what a wallet-based investment of the same size
 * would earn.
 */
export default class extends BaseSchema {
  async up() {
    const db = this.db

    const purchases = await db
      .from('purchases')
      .whereNotNull('approved_at')
      .whereNull('cancelled_at')
      .whereNull('stopped_at')
      .whereNull('rejected_at')

    const slabs = await db
      .from('investment_packages')
      .where('is_active', true)
      .orderBy('min_amount', 'desc')

    let created = 0
    let skippedLinked = 0
    let skippedCovered = 0
    const totalInvestedByUser = new Map<number, number>()

    for (const purchase of purchases) {
      const linked = await db.from('investments').where('purchase_id', purchase.id).first()
      if (linked) {
        skippedLinked += 1
        continue
      }

      // The old migration aggregated each user's purchases into ONE investment.
      // Those already pay out — do not create a competing per-purchase one.
      const covered = await db
        .from('investments')
        .where('user_id', purchase.user_id)
        .where('status', 'active')
        .where('remark', 'Auto-created from gold purchases')
        .first()
      if (covered) {
        skippedCovered += 1
        continue
      }

      const amount = Number(purchase.amount)
      let rate = 3
      for (const slab of slabs) {
        if (
          amount >= Number(slab.min_amount) &&
          (slab.max_amount === null || amount <= Number(slab.max_amount))
        ) {
          rate = Number(slab.monthly_return_percent)
          break
        }
      }

      await db.table('investments').insert({
        user_id: purchase.user_id,
        amount: purchase.amount,
        monthly_return_rate: rate,
        status: 'active',
        started_at: purchase.approved_at ?? purchase.created_at,
        purchase_id: purchase.id,
        remark: 'Auto-created from gold purchase',
        created_at: new Date(),
        updated_at: new Date(),
      })

      totalInvestedByUser.set(
        purchase.user_id,
        (totalInvestedByUser.get(purchase.user_id) ?? 0) + amount
      )
      created += 1
    }

    for (const [userId, amount] of totalInvestedByUser) {
      await db.from('users').where('id', userId).increment('total_invested', amount)
    }

    console.log(
      `[backfill] investments created: ${created}, skipped (linked): ${skippedLinked}, skipped (aggregate covers user): ${skippedCovered}`
    )
  }

  async down() {}
}

import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'
import PayoutService from '#services/payout_service'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // ──────────────────────────────────────────────────────────────────
    // 1. Fix activation dates to match CSV created_at (31 users)
    // ──────────────────────────────────────────────────────────────────
    const activationUpdates = [
      { id: 847023, newActivated: '2026-07-05T09:51:37.133496+00:00' },
      { id: 728337, newActivated: '2026-07-05T09:48:12.391286+00:00' },
      { id: 759750, newActivated: '2026-07-03T14:15:36.388605+00:00' },
      { id: 572295, newActivated: '2026-07-03T14:08:47.761018+00:00' },
      { id: 707803, newActivated: '2026-06-28T10:22:01.492553+00:00' },
      { id: 190274, newActivated: '2026-06-28T10:20:24.244993+00:00' },
      { id: 931036, newActivated: '2026-06-28T10:17:40.579037+00:00' },
      { id: 767682, newActivated: '2026-06-28T10:16:37.57689+00:00' },
      { id: 645711, newActivated: '2026-06-28T10:15:41.496942+00:00' },
      { id: 333383, newActivated: '2026-06-27T12:52:46.296391+00:00' },
      { id: 901624, newActivated: '2026-06-26T12:10:45.942535+00:00' },
      { id: 830666, newActivated: '2026-06-26T12:08:13.586087+00:00' },
      { id: 170335, newActivated: '2026-06-26T12:06:26.183453+00:00' },
      { id: 630348, newActivated: '2026-06-26T12:00:34.157512+00:00' },
      { id: 216409, newActivated: '2026-06-24T16:53:44.452699+00:00' },
      { id: 552582, newActivated: '2026-06-24T16:52:31.952801+00:00' },
      { id: 631425, newActivated: '2026-06-24T16:45:41.441329+00:00' },
      { id: 696697, newActivated: '2026-06-24T16:44:49.626014+00:00' },
      { id: 427332, newActivated: '2026-06-24T16:43:59.876465+00:00' },
      { id: 372611, newActivated: '2026-06-24T16:43:11.093339+00:00' },
      { id: 340676, newActivated: '2026-06-24T16:42:05.911487+00:00' },
      { id: 202924, newActivated: '2026-06-24T16:41:08.011823+00:00' },
      { id: 484739, newActivated: '2026-06-24T16:40:06.602943+00:00' },
      { id: 603610, newActivated: '2026-06-24T16:39:05.275811+00:00' },
      { id: 605643, newActivated: '2026-06-14T13:21:15.061948+00:00' },
      { id: 174544, newActivated: '2026-06-09T09:21:50.280545+00:00' },
      { id: 880145, newActivated: '2026-06-08T19:30:21.657896+00:00' },
      { id: 997860, newActivated: '2026-06-08T19:28:31.748745+00:00' },
      { id: 878601, newActivated: '2026-06-08T19:27:51.612386+00:00' },
      { id: 256742, newActivated: '2026-06-08T19:27:06.830835+00:00' },
      { id: 190183, newActivated: '2026-06-08T19:16:29.405816+00:00' },
    ]

    for (const u of activationUpdates) {
      await db.rawQuery(`UPDATE users SET activated_at = ? WHERE id = ?`, [u.newActivated, u.id])
    }
    console.log(`✅ Fixed ${activationUpdates.length} activation dates`)

    // ──────────────────────────────────────────────────────────────────
    // 2. Fix wallet routing: move working income stuck in wallet_balance
    //    to working_wallet where it belongs (detected dynamically)
    // ──────────────────────────────────────────────────────────────────
    const affected = await db.rawQuery(`
      SELECT u.id, SUM(t.amount) as working_income_total
      FROM users u
      INNER JOIN transactions t ON t.user_id = u.id
        AND t.remark ILIKE '%working wallet%'
        AND t.type = 'wallet_credit'
      WHERE u.working_wallet = 0 AND u.wallet_balance > 0
      GROUP BY u.id
    `)

    let fixedWallets = 0
    for (const r of affected.rows) {
      const id = Number(r.id)
      const amount = Number(r.working_income_total)
      await db.rawQuery(
        `UPDATE users SET wallet_balance = GREATEST(wallet_balance - ?, 0), working_wallet = working_wallet + ? WHERE id = ?`,
        [amount, amount, id]
      )
      fixedWallets++
    }
    console.log(`✅ Fixed ${fixedWallets} wallet routings (wallet_balance → working_wallet)`)

    // ──────────────────────────────────────────────────────────────────
    // 3. Reverse old June payout
    //    Deducts exact transaction amounts from working_wallet / repurchase_wallet.
    //    Uses GREATEST(..., 0) so wallets never go negative.
    // ──────────────────────────────────────────────────────────────────
    const month = DateTime.fromISO('2026-06-01').startOf('month')
    const monthLabel = month.toFormat('LLLL yyyy')

    // 3a. Reverse wallet balances from old working-income transactions
    const txns = await db.rawQuery(
      `SELECT user_id, amount, remark FROM transactions WHERE remark ILIKE '%working income%' AND remark ILIKE '%${monthLabel}%'`
    )

    let reversedWorking = 0
    let reversedRepurchase = 0
    for (const t of txns.rows) {
      const uid = Number(t.user_id)
      const amount = Number(t.amount)
      const remark = t.remark || ''
      if (remark.includes('Working wallet')) {
        await db.rawQuery(
          `UPDATE users SET working_wallet = GREATEST(working_wallet - ?, 0) WHERE id = ?`,
          [amount, uid]
        )
        reversedWorking += amount
      } else if (remark.includes('Repurchase wallet')) {
        await db.rawQuery(
          `UPDATE users SET repurchase_wallet = GREATEST(repurchase_wallet - ?, 0) WHERE id = ?`,
          [amount, uid]
        )
        reversedRepurchase += amount
      }
    }
    console.log(
      `✅ Reversed working_wallet: ₹${reversedWorking.toFixed(2)}, repurchase_wallet: ₹${reversedRepurchase.toFixed(2)}`
    )

    // 3b. Delete old transactions and snapshots
    await db.rawQuery(
      `DELETE FROM transactions WHERE remark ILIKE '%working income%' AND remark ILIKE '%${monthLabel}%'`
    )
    await db.rawQuery(`DELETE FROM monthly_income_snapshots WHERE month = ?`, [month.toISODate()!])
    await db
      .from('platform_configs')
      .where('key', 'working_wallet_payout_month')
      .update({ value: '' })
    console.log(`✅ Deleted old June payout records`)

    // ──────────────────────────────────────────────────────────────────
    // 4. Rerun June payout with corrected activation dates
    // ──────────────────────────────────────────────────────────────────
    const result = await PayoutService.processWorkingWalletPayout(month, 1)
    console.log(
      `✅ Fresh June payout done: ${result.credited} users, gross ₹${result.totalAmount.toLocaleString('en-IN')}`
    )
  }

  async down() {
    console.log('Down migration not supported for data fixes')
  }
}

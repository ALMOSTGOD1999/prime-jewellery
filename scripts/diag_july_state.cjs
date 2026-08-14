/* Diagnostic: precise July 2026 payout state (read-only) */
const { Client } = require('pg')
require('dotenv').config()

const q = async (client, sql, params = []) => (await client.query(sql, params)).rows

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log('=== 0. CONFIG ===')
  const cfg = await q(
    client,
    `SELECT key, value, updated_at FROM platform_configs
     WHERE key IN ('income_wallet_payout_month','working_wallet_payout_month')`
  )
  console.log(cfg)

  console.log('\n=== 1. JULY DISTRIBUTIONS (period 2026-07-01) ===')
  const dist = await q(
    client,
    `SELECT count(*)::int total, count(paid_out_at)::int paid,
            count(income_wallet_transaction_id)::int with_income_txn,
            round(sum(return_amount)::numeric,2) ret, round(sum(income_amount)::numeric,2) inc,
            round(sum(gold_amount)::numeric,2) gold
     FROM investment_return_distributions WHERE period_month = '2026-07-01'`
  )
  console.log(dist)

  console.log('\n=== 2. PER-USER JULY DISTRIBUTION + PAID AMOUNTS (income side) ===')
  const perUser = await q(
    client,
    `SELECT d.user_id, u.name,
            round(d.return_amount::numeric,2) ret, round(d.income_amount::numeric,2) inc,
            round(d.gold_amount::numeric,2) gold, d.paid_out_at
     FROM investment_return_distributions d JOIN users u ON u.id = d.user_id
     WHERE d.period_month = '2026-07-01' ORDER BY d.user_id`
  )
  for (const r of perUser) {
    console.log(
      `  #${String(r.user_id).padEnd(9)} ${String(r.name || '').slice(0, 22).padEnd(24)} ret=${String(r.ret).padStart(10)} inc=${String(r.inc).padStart(10)} gold=${String(r.gold).padStart(9)} paid=${r.paid_out_at ? 'Y' : 'N'}`
    )
  }

  console.log('\n=== 3. JULY WORKING SNAPSHOTS ===')
  const snaps = await q(
    client,
    `SELECT count(*)::int total, count(paid_out_at)::int paid, round(sum(gross_amount)::numeric,2) gross
     FROM monthly_income_snapshots WHERE month = '2026-07-01'`
  )
  console.log(snaps)

  console.log('\n=== 4. JULY WORKING-WALLET CREDIT TRANSACTIONS (remarks) ===')
  const workingTxns = await q(
    client,
    `SELECT remark, count(*) n, round(sum(amount)::numeric,2) total
     FROM transactions WHERE type='wallet_credit'
       AND (remark LIKE 'Working wallet (70%) from working income for July 2026%'
         OR remark LIKE 'Repurchase wallet (20%) from working income for July 2026%')
     GROUP BY remark`
  )
  console.log(workingTxns)

  console.log('\n=== 5. JULY INCOME-RELATED CREDIT TRANSACTION REMARKS ===')
  const incRemarks = await q(
    client,
    `SELECT left(remark, 90) remark, count(*) n, round(sum(amount)::numeric,2) total,
            min(approved_at) first_at, max(approved_at) last_at
     FROM transactions WHERE type='wallet_credit'
       AND (remark LIKE '%July 2026%' OR remark LIKE '%31-day%')
     GROUP BY left(remark, 90) ORDER BY sum(amount) DESC`
  )
  for (const r of incRemarks) {
    console.log(`  ${String(r.n).padStart(5)} x ${String(r.total).padStart(12)}  ${String(r.first_at).slice(0, 19)} → ${String(r.last_at).slice(0, 19)}  ${r.remark}`)
  }

  console.log('\n=== 6. MLI TOTAL (Membership Level Income) ===')
  const mli = await q(
    client,
    `SELECT count(*) n, round(sum(amount)::numeric,2) total FROM transactions
     WHERE type='wallet_credit' AND remark LIKE 'Membership Level Income %'`
  )
  console.log(mli)

  console.log('\n=== 7. SUM(income_wallet) all users ===')
  const wsum = await q(
    client,
    `SELECT count(*) FILTER (WHERE income_wallet > 0) positive_users, round(sum(income_wallet)::numeric,2) total
     FROM users WHERE role != 'admin'`
  )
  console.log(wsum)

  console.log('\n=== 8. RAW JULY TRANSACTIONS FOR SAMPLE USERS (63896, 245303, 617173) ===')
  const raw = await q(
    client,
    `SELECT user_id, type, round(amount::numeric,2) amount, left(remark, 95) remark, approved_at
     FROM transactions
     WHERE user_id IN (63896, 245303, 617173) AND (remark LIKE '%July 2026%' OR remark LIKE '%31-day%' OR remark LIKE '%top-up%')
     ORDER BY user_id, approved_at`
  )
  for (const r of raw) {
    console.log(`  #${String(r.user_id).padEnd(7)} ${String(r.type).slice(0, 12).padEnd(14)} ${String(r.amount).padStart(11)}  ${String(r.approved_at).slice(0, 19)}  ${r.remark}`)
  }

  console.log('\n=== 9. JULY DISTRIBUTION records for 63896, 245303, 617173 (full) ===')
  const drec = await q(
    client,
    `SELECT * FROM investment_return_distributions
     WHERE period_month = '2026-07-01' AND user_id IN (63896, 245303, 617173)`
  )
  for (const r of drec) {
    console.log(' ', r)
  }

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

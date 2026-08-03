const { Client } = require('pg')
require('dotenv').config()

const ids = [
  63896, 67819, 139063, 150228, 245303, 278356, 331062, 499862, 533697, 617173, 644117, 698847,
  698875, 722361, 776339, 780949, 932914, 5937652, 7943738, 884535, 236641, 18168, 426687, 165958,
  295975, 713886, 723671,
]

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const dists = await client.query(
    `SELECT d.id, d.user_id, u.name, d.return_amount, d.income_amount, d.gold_amount,
            d.paid_out_at, d.period_month
     FROM investment_return_distributions d
     JOIN users u ON u.id = d.user_id
     WHERE d.user_id = ANY($1) AND d.period_month = '2026-07-01'
     ORDER BY d.user_id`,
    [ids]
  )

  const users = await client.query(
    `SELECT id, name, status, income_wallet, repurchase_wallet FROM users WHERE id = ANY($1)`,
    [ids]
  )
  const userMap = new Map(users.rows.map((u) => [u.id, u]))

  const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }))

  console.log('\n=== JULY 2026 DISTRIBUTIONS (per user) ===')
  const byUser = new Map()
  for (const d of dists.rows) {
    if (!byUser.has(d.user_id)) byUser.set(d.user_id, [])
    byUser.get(d.user_id).push(d)
  }
  for (const id of ids) {
    const u = userMap.get(id)
    if (!u) continue
    const myDists = byUser.get(id) || []
    if (myDists.length === 0) {
      console.log(`PJ${String(id).padStart(6, '0')}  ${u.name.padEnd(20)} — NO July distribution`)
      continue
    }
    for (const d of myDists) {
      const paid = d.paid_out_at ? 'PAID' : 'unpaid'
      console.log(
        `PJ${String(id).padStart(6, '0')}  ${u.name.padEnd(20)} ${paid} | return ₹${fmt(d.return_amount)} → cashback ₹${fmt(d.income_amount)} + gold ₹${fmt(d.gold_amount)} | wallet: income ₹${fmt(u.income_wallet)} repurchase ₹${fmt(u.repurchase_wallet)}`
      )
    }
  }

  // Verify: net credited vs expected for the 9 backfilled users
  console.log('\n=== BACKFILLED USERS: TRANSACTIONS ===')
  const txns = await client.query(
    `SELECT user_id, amount, remark FROM transactions
     WHERE user_id = ANY($1) AND type = 'wallet_credit'
       AND remark ILIKE '%investment return for July 2026%'
     ORDER BY user_id`,
    [ids]
  )
  for (const t of txns.rows) {
    if ([18168, 165958, 236641, 295975, 426687, 713886, 884535, 5937652, 7943738].includes(t.user_id)) {
      console.log(`  PJ${String(t.user_id).padStart(6, '0')}  +₹${fmt(t.amount)}  "${t.remark}"`)
    }
  }

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

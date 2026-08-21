const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const q = async (sql, params = []) => (await client.query(sql, params)).rows

  // 1. User record
  console.log('=== 1. USER PJ630351 ===')
  const user = await q(`SELECT id, name, status, role, activated_at, activation_amount, income_wallet, working_wallet, repurchase_wallet FROM users WHERE id = 630351`)
  console.log(user[0] || 'NOT FOUND')

  // 2. Investments
  console.log('\n=== 2. INVESTMENTS ===')
  const invs = await q(`SELECT id, user_id, purchase_id, amount, status, monthly_return_rate, started_at, closed_at, remark FROM investments WHERE user_id = 630351 ORDER BY id`)
  console.log(`Found ${invs.length} investments`)
  for (const inv of invs) console.log(inv)

  // 3. Purchases
  console.log('\n=== 3. PURCHASES ===')
  const purchases = await q(`SELECT id, user_id, amount, approved_at, cancelled_at, stopped_at FROM purchases WHERE user_id = 630351 ORDER BY id`)
  console.log(`Found ${purchases.length} purchases`)
  for (const p of purchases) console.log(p)

  // 4. Investment Return Distributions
  console.log('\n=== 4. INVESTMENT RETURN DISTRIBUTIONS ===')
  const dists = await q(`SELECT id, investment_id, user_id, period_month, investment_amount, return_amount, income_amount, gold_amount, paid_out_at FROM investment_return_distributions WHERE user_id = 630351 ORDER BY period_month`)
  console.log(`Found ${dists.length} distributions`)
  for (const d of dists) console.log(d)

  // 5. Monthly Income Snapshots (working wallet)
  console.log('\n=== 5. MONTHLY INCOME SNAPSHOTS ===')
  const snaps = await q(`SELECT id, user_id, month, gross_amount, income_wallet_amount, repurchase_wallet_amount, paid_out_at FROM monthly_income_snapshots WHERE user_id = 630351 ORDER BY month`)
  console.log(`Found ${snaps.length} snapshots`)
  for (const s of snaps) console.log(s)

  // 6. Wallet credits for July
  console.log('\n=== 6. WALLET TRANSACTIONS (July related) ===')
  const txns = await q(`SELECT id, type, amount, remark, approved_at FROM transactions WHERE user_id = 630351 AND remark ILIKE '%july%' ORDER BY approved_at`)
  console.log(`Found ${txns.length} July-related transactions`)
  for (const t of txns) console.log(`  ${t.type} ₹${t.amount} | ${t.remark} | ${t.approved_at}`)

  // 7. All transactions
  console.log('\n=== 7. ALL TRANSACTIONS ===')
  const allTxns = await q(`SELECT id, type, amount, remark, approved_at FROM transactions WHERE user_id = 630351 ORDER BY approved_at`)
  console.log(`Found ${allTxns.length} total transactions`)
  for (const t of allTxns) console.log(`  ${t.type} ₹${t.amount} | ${t.remark} | ${t.approved_at}`)

  // 8. Children / team
  console.log('\n=== 8. DIRECT CHILDREN ===')
  const children = await q(`SELECT id, name, status, activated_at FROM users WHERE parent_id = 630351`)
  console.log(`Found ${children.length} direct children`)
  for (const c of children) console.log(`  ${c.id} ${c.name} status=${c.status} activated=${c.activated_at}`)

  // 9. Investments from purchase records (check if purchase has an investment)
  console.log('\n=== 9. INVESTMENTS LINKED TO PURCHASES ===')
  const linkedInvs = await q(`
    SELECT i.id, i.user_id, i.purchase_id, i.amount, i.status, i.started_at, i.closed_at,
           p.amount as purchase_amount, p.approved_at as purchase_approved
    FROM investments i
    LEFT JOIN purchases p ON p.id = i.purchase_id
    WHERE i.user_id = 630351
  `)
  console.log(`Found ${linkedInvs.length} linked investments`)
  for (const li of linkedInvs) console.log(li)

  // 10. Check max return cap
  console.log('\n=== 10. TOTAL RETURNS vs INVESTMENT AMOUNT ===')
  const returnTotals = await q(`
    SELECT investment_id, SUM(return_amount)::float as total_returned
    FROM investment_return_distributions
    WHERE user_id = 630351
    GROUP BY investment_id
  `)
  for (const rt of returnTotals) console.log(`  Investment #${rt.investment_id}: total returned = ₹${rt.total_returned}`)

  // Also check if investment 245303 (Prahlad Halder) has investment of 400000 to compare
  console.log('\n=== 11. SAMPLE: PJ245303 investments for comparison ===')
  const sample = await q(`
    SELECT i.id, i.user_id, i.amount, i.status, i.started_at, i.closed_at,
           SUM(d.return_amount)::float as total_returned,
           COUNT(d.id) as dist_count
    FROM investments i
    LEFT JOIN investment_return_distributions d ON d.investment_id = i.id
    WHERE i.user_id = 245303
    GROUP BY i.id
  `)
  for (const s of sample) console.log(s)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

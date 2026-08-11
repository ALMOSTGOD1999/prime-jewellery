const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const txns = await client.query(
    `SELECT t.user_id, u.name, t.amount, t.remark, t.approved_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.remark ILIKE '%31-day rule correction%'
     ORDER BY t.user_id`
  )
  console.log(`=== TOP-UP TRANSACTIONS (${txns.rows.length}) ===`)
  let totalInc = 0
  let totalGold = 0
  for (const t of txns.rows) {
    const isGold = /Repurchase/.test(t.remark)
    if (isGold) totalGold += Number(t.amount)
    else totalInc += Number(t.amount)
    console.log(
      `PJ${String(t.user_id).padStart(6, '0')} ${(t.name || '').padEnd(20)} ${isGold ? 'gold   ' : 'income '} +${Number(t.amount).toLocaleString('en-IN')} | ${t.remark.slice(0, 55)}`
    )
  }
  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  console.log(`\nTOTAL top-up income ₹${fmt(totalInc)} + gold ₹${fmt(totalGold)}`)

  // Balance check: income_wallet + repurchase_wallet for topped-up users
  const users = await client.query(
    `SELECT id, name, income_wallet, repurchase_wallet FROM users
     WHERE id IN (SELECT DISTINCT user_id FROM transactions WHERE remark ILIKE '%31-day rule correction%')
     ORDER BY id`
  )
  console.log(`\n=== WALLET BALANCES (${users.rows.length} users) ===`)
  for (const u of users.rows) {
    console.log(
      `PJ${String(u.id).padStart(6, '0')} ${(u.name || '').padEnd(20)} income ₹${fmt(Number(u.income_wallet))} | repurchase ₹${fmt(Number(u.repurchase_wallet))}`
    )
  }

  // Confirm Pranati untouched in July
  const pran = await client.query(
    `SELECT income_wallet, repurchase_wallet FROM users WHERE id = 617173`
  )
  console.log(`\nPranati (617173) balances:`, JSON.stringify(pran.rows[0]))

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

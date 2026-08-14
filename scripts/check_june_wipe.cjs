const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // 1. Any WIPE debits written?
  const wipes = await client.query(
    `SELECT t.user_id, t.amount, t.remark, t.approved_at
     FROM transactions t
     WHERE t.type = 'wallet_debit' AND t.remark LIKE 'WIPE: June 2026%'
     ORDER BY t.user_id`
  )
  console.log(`WIPE debits found: ${wipes.rowCount}`)
  for (const w of wipes.rows) {
    console.log(`  #${w.user_id}  ${Number(w.amount).toFixed(2)}  ${w.remark}`)
  }

  // 2. Current balances of the 18 June users vs expected post-wipe
  const users = await client.query(
    `SELECT u.id, u.name, u.income_wallet
     FROM users u
     JOIN investment_return_distributions d ON d.user_id = u.id
     WHERE d.period_month = '2026-06-01' AND d.paid_out_at IS NOT NULL
       AND d.income_wallet_transaction_id IS NOT NULL
     ORDER BY u.id`
  )
  console.log(`\nJune users (${users.rowCount}):`)
  let total = 0
  for (const u of users.rows) {
    const bal = Number(u.income_wallet)
    total += bal
    console.log(`  #${u.id} ${u.name.padEnd(22)} balance ${bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
  }
  console.log(`\nSum of June-user balances now: ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)

  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})

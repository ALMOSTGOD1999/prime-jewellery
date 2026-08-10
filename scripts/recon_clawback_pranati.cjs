const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log('=== PRANATI BAIDYA (user 617173) — CLAWBACK RECON ===')

  // 1. Her July 2026 distribution row
  const dist = await client.query(
    `SELECT d.id, d.investment_id, d.user_id, d.period_month, d.return_amount, d.income_amount,
            d.gold_amount, d.gold_transaction_id, d.income_wallet_transaction_id, d.paid_out_at,
            i.amount, i.monthly_return_rate, i.started_at
     FROM investment_return_distributions d
     JOIN investments i ON i.id = d.investment_id
     WHERE d.user_id = 617173 AND d.period_month = '2026-07-01'`
  )
  for (const d of dist.rows) {
    console.log(`\nJuly distribution #${d.id} (investment ${d.investment_id}):`)
    console.log(`  return ${d.return_amount} | income ${d.income_amount} | gold ${d.gold_amount}`)
    console.log(`  income_txn_id: ${d.income_wallet_transaction_id}`)
    console.log(`  gold_txn_id: ${d.gold_transaction_id}`)
    console.log(`  paid_out_at: ${d.paid_out_at}`)
    console.log(`  investment: amount ${d.amount} | rate ${d.monthly_return_rate} | started_at ${d.started_at}`)
  }

  // 2. Current wallet balances
  const user = await client.query(
    `SELECT id, name, income_wallet, repurchase_wallet, created_at
     FROM users WHERE id = 617173`
  )
  for (const u of user.rows) {
    console.log(`\nUser: ${u.name} (id ${u.id})`)
    console.log(`  income_wallet: ${u.income_wallet}`)
    console.log(`  repurchase_wallet: ${u.repurchase_wallet}`)
  }

  // 3. Her July credit transactions (the original payout credits)
  const txns = await client.query(
    `SELECT id, amount, type, remark, approved_at
     FROM transactions
     WHERE user_id = 617173 AND approved_at >= '2026-08-01' AND approved_at < '2026-08-31'
     ORDER BY created_at`
  )
  console.log('\nTransactions (2026-08):')
  for (const t of txns.rows) {
    console.log(`  ${t.id} | ${t.type} | ${t.amount} | ${t.approved_at} | ${t.remark}`)
  }

  // 4. Distinct transaction types (confirm debit type name)
  const types = await client.query(
    `SELECT unnest(enum_range(NULL::transaction_type)) AS type`
  )
  console.log('\nTransaction type enum values:')
  for (const t of types.rows) console.log(`  ${t.type}`)

  // 5. audit_logs schema
  const audit = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'audit_logs' ORDER BY ordinal_position`
  )
  console.log('\naudit_logs columns:')
  for (const c of audit.rows) console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`)

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

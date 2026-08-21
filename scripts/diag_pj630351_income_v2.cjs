const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const q = async (sql, p = []) => (await client.query(sql, p)).rows

  const userId = 630351

  // 1. Salary check
  console.log('=== SALARY ===')
  const salaries = await q(`SELECT * FROM salaries WHERE user_id = $1`, [userId])
  console.log(`Salaries: ${salaries.length}`)
  for (const s of salaries) console.log(JSON.stringify(s, null, 2))

  // 2. Check the snapshot details
  console.log('\n=== SNAPSHOT FULL DETAILS ===')
  const snap = await q(`SELECT * FROM monthly_income_snapshots WHERE user_id = $1 AND month >= '2026-07-01' AND month <= '2026-08-01'`, [userId])
  for (const s of snap) {
    const { id, user_id, month, gross_amount, income_wallet_amount, repurchase_wallet_amount, admin_amount, income_details, paid_out_at } = s
    console.log({ id, user_id, month, gross_amount, income_wallet_amount, repurchase_wallet_amount, admin_amount, income_details, paid_out_at })
  }

  // 3. Snapshot table schema
  console.log('\n=== SNAPSHOT SCHEMA ===')
  const cols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monthly_income_snapshots' ORDER BY ordinal_position`)
  for (const c of cols) console.log(`  ${c.column_name} (${c.data_type})`)

  // 4. Check level_income_records (if they exist)
  console.log('\n=== LEVEL INCOME RECORDS ===')
  const liTables = await q(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%level%' OR table_name LIKE '%income%' OR table_name LIKE '%reward%' ORDER BY table_name`)
  for (const t of liTables) console.log(`  ${t.table_name}`)

  // 5. Check what the correct calculation should produce for July
  console.log('\n=== MANUAL CALCULATION FOR JULY ===')
  const user = await q(`SELECT activated_at, activation_amount FROM users WHERE id = $1`, [userId])
  const children = await q(`SELECT id, activated_at, activation_amount FROM users WHERE parent_id = $1`, [userId])
  const childPurchases = await q(`SELECT user_id, amount, approved_at FROM purchases WHERE user_id = $1 AND cancelled_at IS NULL`, [children.map(c => c.id)])

  let total = 0
  
  // 1. Activation Cashback
  const actDate = new Date(user[0].activated_at)
  const actAmt = Number(user[0].activation_amount) || 1000
  const monthlyCashback = (actAmt * 0.1) / 2
  const month1 = new Date(actDate); month1.setMonth(month1.getMonth() + 1)
  const month2 = new Date(actDate); month2.setMonth(month2.getMonth() + 2)
  const july = new Date('2026-07-15')
  
  if (month1.getMonth() === 6 && month1.getFullYear() === 2026) { total += monthlyCashback }
  if (month2.getMonth() === 6 && month2.getFullYear() === 2026) { total += monthlyCashback }
  console.log(`Activation Cashback: ₹${monthlyCashback} x eligible months = ₹${total}`)

  // 2. Activation Sponsor (none - child activated June)
  console.log(`Activation Sponsor: ₹0 (no child activated in July)`)

  // 3. Activation Level
  const activationLevel = monthlyCashback // L1 same as cashback amount
  let actLvlTotal = 0
  for (const c of children) {
    const cActDate = new Date(c.activated_at)
    const m1c = new Date(cActDate); m1c.setMonth(m1c.getMonth() + 1)
    const m2c = new Date(cActDate); m2c.setMonth(m2c.getMonth() + 2)
    if (m1c.getMonth() === 6 && m1c.getFullYear() === 2026) actLvlTotal += activationLevel
    if (m2c.getMonth() === 6 && m2c.getFullYear() === 2026) actLvlTotal += activationLevel
  }
  console.log(`Activation Level: ₹${actLvlTotal}`)
  total += actLvlTotal

  // 4. Level Income (purchase-based)
  for (const cp of childPurchases) {
    const purchaseAmt = Number(cp.amount)
    const levelPercent = 5
    const dailyIncome = purchaseAmt * levelPercent / 100 * 12 / 365
    const julyDays = 31
    const julyIncome = dailyIncome * julyDays
    console.log(`Level Income: ₹${purchaseAmt} x ${levelPercent}% x 12/365 x ${julyDays} = ₹${julyIncome.toFixed(2)}`)
    total += julyIncome
  }

  console.log(`\nEXPECTED TOTAL GROSS FOR JULY: ₹${total.toFixed(2)}`)
  console.log(`ACTUAL PAID (from snapshot): ₹4,176.81`)
  console.log(`DIFFERENCE: ₹${(total - 4176.81).toFixed(2)}`)

  // 6. What does the actual getLevelRewards return? Check daily cap
  console.log('\n=== CHECK: Any daily cap in getLevelRewards? ===')
  const capConfig = await q(`SELECT * FROM system_settings WHERE key LIKE '%level%' OR key LIKE '%cap%' OR key LIKE '%daily%'`)
  for (const c of capConfig) console.log(`  ${c.key} = ${c.value}`)

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })

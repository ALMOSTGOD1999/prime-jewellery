const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const q = async (sql, p = []) => (await client.query(sql, p)).rows

  const userId = 630351
  const monthStart = '2026-07-01'
  const monthEnd = '2026-07-31'

  // 1. Check activation cashback eligibility
  console.log('=== 1. ACTIVATION CASHBACK ===')
  const user = await q(`SELECT id, name, activated_at, activation_amount FROM users WHERE id = $1`, [userId])
  const u = user[0]
  console.log(`Activated: ${u.activated_at}, Amount: ${u.activation_amount}`)
  const actAmt = Number(u.activation_amount) || 1000
  const monthlyCashback = (actAmt * 0.1) / 2
  console.log(`Monthly cashback (5% of ${actAmt}): ₹${monthlyCashback}`)
  const actDate = new Date(u.activated_at)
  const month1 = new Date(actDate)
  month1.setMonth(month1.getMonth() + 1)
  const month2 = new Date(actDate)
  month2.setMonth(month2.getMonth() + 2)
  console.log(`Month1 date: ${month1.toISOString()}, Month2 date: ${month2.toISOString()}`)
  console.log(`July 2026 in range? month1=${month1.toISOString().slice(0,7)} month2=${month2.toISOString().slice(0,7)}`)

  // 2. Check direct children and activation sponsor
  console.log('\n=== 2. ACTIVATION SPONSOR ===')
  const children = await q(`SELECT id, name, activated_at, activation_amount FROM users WHERE parent_id = $1`, [userId])
  console.log(`Children count: ${children.length}`)
  for (const c of children) {
    const inJuly = c.activated_at >= monthStart && c.activated_at <= monthEnd + ' 23:59:59'
    console.log(`  ${c.id} ${c.name} activated=${c.activated_at} in_july=${inJuly}`)
  }

  // 3. Check child's purchase and level income
  console.log('\n=== 3. LEVEL INCOME (purchase-based) ===')
  const childIds = children.map(c => c.id)
  if (childIds.length > 0) {
    // Check purchases of children
    const childPurchases = await q(`SELECT user_id, amount, approved_at FROM purchases WHERE user_id = ANY($1) AND cancelled_at IS NULL`, [childIds])
    console.log(`Child purchases:`, childPurchases)
    
    for (const cp of childPurchases) {
      const approvedDate = new Date(cp.approved_at)
      const purchaseAmt = Number(cp.amount)
      const levelPercent = 5 // L1
      const dailyIncome = purchaseAmt * levelPercent / 100 * 12 / 365
      console.log(`  Purchase ₹${purchaseAmt} approved ${cp.approved_at}`)
      console.log(`  Daily income (L1, ${levelPercent}%): ₹${dailyIncome.toFixed(2)}`)
      
      // How many days in July?
      const daysInJuly = 31
      const monthlyIncome = dailyIncome * daysInJuly
      console.log(`  Monthly income (31 days): ₹${monthlyIncome.toFixed(2)}`)
      
      // Also check: eligible from when? 10 months from approval
      const eligibleUntil = new Date(approvedDate)
      eligibleUntil.setMonth(eligibleUntil.getMonth() + 10)
      console.log(`  Eligible until: ${eligibleUntil.toISOString()}`)
    }
  }

  // 4. Check activation level rewards
  console.log('\n=== 4. ACTIVATION LEVEL REWARDS ===')
  // Check child's activation dates for eligibility
  for (const c of children) {
    const childActDate = new Date(c.activated_at)
    const childActAmt = Number(c.activation_amount) || 1000
    // L1 = 5% of activation amount per month for 2 months
    const lvlIncome = childActAmt * 0.05
    console.log(`  Child ${c.id}: activation ₹${childActAmt}, L1=₹${lvlIncome}/month`)
    const m1 = new Date(childActDate); m1.setMonth(m1.getMonth() + 1)
    const m2 = new Date(childActDate); m2.setMonth(m2.getMonth() + 2)
    console.log(`    Eligible months: ${m1.toISOString().slice(0,7)} and ${m2.toISOString().slice(0,7)}`)
  }

  // 5. Check EMI level income
  console.log('\n=== 5. EMI LEVEL INCOME ===')
  const emiTxns = await q(`SELECT user_id, amount, approved_at FROM emi_transactions WHERE user_id = ANY($1) AND cancelled_at IS NULL`, [childIds])
  console.log(`EMI transactions from children: ${emiTxns.length}`)
  for (const e of emiTxns) console.log(`  user=${e.user_id} amount=${e.amount} approved=${e.approved_at}`)

  // 6. Check salary
  console.log('\n=== 6. SALARY ===')
  const salaries = await q(`SELECT user_id, status, paid_at, info FROM salaries WHERE user_id = $1 AND status = 'paid'`, [userId])
  console.log(`Paid salaries: ${salaries.length}`)
  for (const s of salaries) console.log(`  paid=${s.paid_at} info=`, s.info)

  // 7. Check the actual snapshot
  console.log('\n=== 7. JULY SNAPSHOT ===')
  const snap = await q(`SELECT * FROM monthly_income_snapshots WHERE user_id = $1 AND month >= '2026-07-01' AND month <= '2026-08-01'`, [userId])
  console.log(`Snapshots:`, snap.length)
  for (const s of snap) console.log(JSON.stringify(s, null, 2))

  // 8. Check income details if stored
  console.log('\n=== 8. INCOME DETAILS (if stored in snapshot) ===')
  if (snap.length > 0 && snap[0].income_details) {
    console.log(JSON.stringify(snap[0].income_details, null, 2))
  } else {
    console.log('No income_details field or it is null')
    // Check snapshot columns
    const cols = await q(`SELECT column_name FROM information_schema.columns WHERE table_name = 'monthly_income_snapshots' ORDER BY ordinal_position`)
    console.log('Snapshot columns:', cols.map(c => c.column_name))
  }

  // 9. Check ALL investments for child
  console.log('\n=== 9. CHILD INVESTMENT DETAILS ===')
  const childInvs = await q(`
    SELECT i.id, i.user_id, i.amount, i.status, i.started_at, i.monthly_return_rate,
           SUM(d.return_amount)::float as total_returned, COUNT(d.id) as dist_count
    FROM investments i
    LEFT JOIN investment_return_distributions d ON d.investment_id = i.id
    WHERE i.user_id = ANY($1)
    GROUP BY i.id
  `, [childIds])
  console.log(`Child investments:`, childInvs)

  // 10. Check what processWorkingWalletPayout actually processes
  console.log('\n=== 10. PAYMENT SERVICE CODE CHECK ===')
  const payoutService = await q(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'monthly_income_snapshots' ORDER BY ordinal_position
  `)
  console.log('Snapshot table schema:', payoutService.map(c => `${c.column_name}(${c.data_type})`))

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })

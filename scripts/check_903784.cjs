const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // User info
  const uRes = await c.query('SELECT id, name, parent_id, status, activated_at FROM users WHERE id = 903784')
  console.log('User:', uRes.rows[0])

  // Salaries
  const salRes = await c.query(`
    SELECT * FROM salaries WHERE user_id = 903784 ORDER BY created_at DESC LIMIT 12
  `)
  console.log(`\nSalaries (${salRes.rows.length}):`)
  for (const r of salRes.rows) {
    console.log(`  power=${r.power}, weaker=${r.weaker}, qualifying_business=${r.qualifying_business}, status=${r.status}, paid_at=${r.paid_at}`)
  }

  // Monthly income snapshots
  const snapRes = await c.query(`
    SELECT * FROM monthly_income_snapshots WHERE user_id = 903784 ORDER BY month DESC LIMIT 12
  `)
  console.log(`\nMonthly income snapshots (${snapRes.rows.length}):`)
  for (const r of snapRes.rows) {
    console.log(`  month=${r.month}, gross=${r.gross_amount}, income_wallet=${r.income_wallet_amount}, repurchase_wallet=${r.repurchase_wallet_amount}, paid_out_at=${r.paid_out_at}`)
  }

  // Direct children count
  const childRes = await c.query('SELECT COUNT(*) as cnt FROM users WHERE parent_id = 903784')
  console.log(`\nDirect children: ${childRes.rows[0].cnt}`)

  // Team size
  const teamRes = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 903784
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT COUNT(*) as cnt FROM descendants
  `)
  console.log(`Team size: ${teamRes.rows[0].cnt}`)

  // Purchases
  const purchRes = await c.query(`
    SELECT p.id, p.user_id, p.amount, p.approved_at
    FROM purchases p
    WHERE p.user_id = 903784 AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
    ORDER BY p.approved_at
  `)
  console.log(`\nPurchases (${purchRes.rows.length}):`)
  for (const r of purchRes.rows) {
    console.log(`  Amount: ₹${r.amount}, Approved: ${r.approved_at}`)
  }

  // Team business - total
  const teamBizRes = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 903784
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT COALESCE(SUM(p.amount), 0)::float as total
    FROM purchases p
    INNER JOIN descendants d ON p.user_id = d.id
    WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
  `)
  console.log(`\nTotal team business: ₹${teamBizRes.rows[0].total}`)

  // Team business - August only
  const augBizRes = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 903784
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT COALESCE(SUM(p.amount), 0)::float as total
    FROM purchases p
    INNER JOIN descendants d ON p.user_id = d.id
    WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
      AND p.approved_at >= '2026-08-01' AND p.approved_at < '2026-09-01'
  `)
  console.log(`Team business in August: ₹${augBizRes.rows[0].total}`)

  // Performance incentive config
  const piRes = await c.query(`
    SELECT * FROM performance_incentives WHERE is_active = true ORDER BY sort_order
  `)
  console.log(`\nPerformance incentive targets:`)
  for (const r of piRes.rows) {
    console.log(`  ${r.title}: target=₹${r.business_target}, reward=₹${r.reward_amount}`)
  }

  // Check August payout snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  if (cfgRes.rows.length > 0) {
    const snapshot = JSON.parse(cfgRes.rows[0].value)
    const u = snapshot.users.find(u => u.userId === 903784)
    if (u) {
      console.log(`\nAugust payout snapshot:`)
      console.log(`  Salary: ₹${u.workingWallet?.salary || 0}`)
      console.log(`  Activation Cashback: ₹${u.workingWallet?.activationCashback || 0}`)
      console.log(`  Activation Sponsor: ₹${u.workingWallet?.activationSponsor || 0}`)
      console.log(`  Activation Level: ₹${u.workingWallet?.activationLevel || 0}`)
      console.log(`  Level Income: ₹${u.workingWallet?.levelIncome || 0}`)
      console.log(`  EMI Level Income: ₹${u.workingWallet?.emiLevelIncome || 0}`)
      console.log(`  Gross Total: ₹${u.workingWallet?.grossTotal || 0}`)
    } else {
      console.log('\nPJ903784 NOT in August payout snapshot')
    }
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

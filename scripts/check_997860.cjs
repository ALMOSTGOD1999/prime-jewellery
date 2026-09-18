const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15, 5: 0.15, 6: 0.15, 7: 0.15, 8: 0.1, 9: 0.1, 10: 0.1, 11: 0.1, 12: 0.05, 13: 0.05, 14: 0.05, 15: 0.05, 16: 0.05, 17: 0.05, 18: 0.05, 19: 0.05, 20: 0.02, 21: 0.02, 22: 0.02, 23: 0.02, 24: 0.02 }

async function main() {
  await c.connect()

  const userId = 997860

  // User info
  const uRes = await c.query('SELECT id, name, parent_id, status, activated_at, income_wallet, working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  const user = uRes.rows[0]
  console.log('=== User Info ===')
  console.log(`PJ${user.id} (${user.name})`)
  console.log(`Status: ${user.status}, Activated: ${user.activated_at}`)
  console.log(`Parent: PJ${user.parent_id}`)
  console.log(`Wallets: income=₹${user.income_wallet}, working=₹${user.working_wallet}, repurchase=₹${user.repurchase_wallet}`)

  // Direct children
  const childRes = await c.query('SELECT id, name, activated_at FROM users WHERE parent_id = $1', [userId])
  console.log(`\n=== Direct Children (${childRes.rows.length}) ===`)
  for (const ch of childRes.rows) {
    console.log(`  PJ${ch.id} (${ch.name}), activated: ${ch.activated_at}`)
  }

  // Salary records
  const salRes = await c.query('SELECT id, power, weaker, qualifying_business, status, paid_at FROM salaries WHERE user_id = $1 ORDER BY created_at DESC', [userId])
  console.log(`\n=== Salary Records (${salRes.rows.length}) ===`)
  for (const r of salRes.rows) {
    console.log(`  power=₹${r.power}, weaker=₹${r.weaker}, qualifying=₹${r.qualifying_business}, status=${r.status}, paid_at=${r.paid_at}`)
  }

  // Level income calculation - flat monthly
  console.log('\n=== Level Income (Flat Monthly) ===')
  const descRes = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id, 1 as depth FROM users WHERE parent_id = $1
      UNION ALL
      SELECT u.id, u.parent_id, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      WHERE d.depth < 25
    )
    SELECT d.depth, p.amount, p.approved_at
    FROM descendants d
    JOIN purchases p ON p.user_id = d.id
    WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
      AND p.approved_at >= '2026-08-01' AND p.approved_at < '2026-09-01'
    ORDER BY d.depth, p.approved_at
  `, [userId])

  let totalLevelIncome = 0
  for (const p of descRes.rows) {
    const pct = LEVEL_PCT[p.depth] || 0
    if (pct === 0) continue
    const income = Number(p.amount) * (pct / 100)
    totalLevelIncome += income
    const sign = income > 0 ? '+' : ''
    console.log(`  Depth ${p.depth} (${pct}%): ₹${p.amount} approved ${new Date(p.approved_at).toISOString().split('T')[0]} → ₹${income.toFixed(2)}`)
  }
  console.log(`  Total flat monthly level income: ₹${totalLevelIncome.toFixed(2)}`)
  console.log(`  Snapshot level income: ₹1150.98`)

  // Check August snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)
  const snapUser = snapshot.users.find(u => u.userId === userId)
  if (snapUser) {
    console.log('\n=== August Snapshot ===')
    console.log(`  Salary: ₹${snapUser.workingWallet?.salary || 0}`)
    console.log(`  Activation Cashback: ₹${snapUser.workingWallet?.activationCashback || 0}`)
    console.log(`  Activation Sponsor: ₹${snapUser.workingWallet?.activationSponsor || 0}`)
    console.log(`  Activation Level: ₹${snapUser.workingWallet?.activationLevel || 0}`)
    console.log(`  Level Income: ₹${snapUser.workingWallet?.levelIncome || 0}`)
    console.log(`  EMI Level Income: ₹${snapUser.workingWallet?.emiLevelIncome || 0}`)
    console.log(`  Gross Total: ₹${snapUser.workingWallet?.grossTotal || 0}`)
    console.log(`  Working Share: ₹${snapUser.workingWallet?.workingShare || 0}`)
    console.log(`  Repurchase Share: ₹${snapUser.workingWallet?.repurchaseShare || 0}`)
  } else {
    console.log('\nNot in August snapshot')
  }

  // Performance incentive check
  console.log('\n=== Performance Incentive Check ===')
  const windowStart = '2026-03-01'
  const windowEnd = '2026-08-31 23:59:59'

  const childVolumes = []
  for (const child of childRes.rows) {
    const volRes = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT COALESCE(SUM(p.amount), 0)::float as total
      FROM purchases p
      INNER JOIN descendants d ON p.user_id = d.id
      WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
        AND p.approved_at >= $2 AND p.approved_at <= $3
    `, [child.id, windowStart, windowEnd])

    const ownRes = await c.query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM purchases
      WHERE user_id = $1 AND approved_at IS NOT NULL AND cancelled_at IS NULL
        AND approved_at >= $2 AND approved_at <= $3
    `, [child.id, windowStart, windowEnd])

    const total = Number(volRes.rows[0].total) + Number(ownRes.rows[0].total)
    childVolumes.push(total)
    console.log(`  PJ${child.id} (${child.name}): ₹${total}`)
  }

  childVolumes.sort((a, b) => b - a)
  const power = childVolumes[0] || 0
  const weaker = childVolumes.slice(1).reduce((sum, v) => sum + v, 0)
  const total = power + weaker
  const otherLegs = total - power

  console.log(`\n  Power: ₹${power}, Weaker: ₹${weaker}, Total: ₹${total}`)

  const thresholds = [
    { name: 'Starter', criteria: 200000, reward: 999 },
    { name: 'Bronze', criteria: 500000, reward: 2499 },
    { name: 'Silver', criteria: 1000000, reward: 5499 },
  ]

  for (const t of thresholds) {
    const eligible = total >= t.criteria && power >= t.criteria * 0.6 && otherLegs >= t.criteria * 0.4
    console.log(`  ${t.name}: ${eligible ? '✅ ELIGIBLE ₹' + t.reward : '✗ not eligible'}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

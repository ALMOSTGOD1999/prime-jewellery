const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Get direct children
  const childrenRes = await c.query('SELECT id, name, activated_at FROM users WHERE parent_id = 903784')
  console.log('Direct children:', childrenRes.rows)

  // For each child, get their subtree volume (all approved purchases from Mar-Aug 2026)
  const windowStart = '2026-03-01'
  const windowEnd = '2026-08-31 23:59:59'

  const childVolumes = []
  for (const child of childrenRes.rows) {
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

    // Also include child's own purchases
    const ownRes = await c.query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM purchases
      WHERE user_id = $1 AND approved_at IS NOT NULL AND cancelled_at IS NULL
        AND approved_at >= $2 AND approved_at <= $3
    `, [child.id, windowStart, windowEnd])

    const descendantTotal = Number(volRes.rows[0].total)
    const ownTotal = Number(ownRes.rows[0].total)
    const total = descendantTotal + ownTotal

    childVolumes.push({ childId: child.id, childName: child.name, descendantTotal, ownTotal, total })
    console.log(`\nChild PJ${child.id} (${child.name}):`)
    console.log(`  Own purchases: ₹${ownTotal}`)
    console.log(`  Descendant purchases: ₹${descendantTotal}`)
    console.log(`  Subtotal: ₹${total}`)
  }

  // Sort by volume descending
  childVolumes.sort((a, b) => b.total - a.total)

  const power = childVolumes[0]?.total || 0
  const weaker = childVolumes.slice(1).reduce((sum, v) => sum + v.total, 0)
  const total = power + weaker
  const otherLegs = total - power

  console.log(`\n=== Leg Analysis ===`)
  console.log(`Power leg: ₹${power}`)
  console.log(`Weaker legs: ₹${weaker}`)
  console.log(`Total: ₹${total}`)
  console.log(`Top leg: ₹${power}`)
  console.log(`Other legs: ₹${otherLegs}`)

  // Check against performance incentive thresholds
  const thresholds = [
    { name: 'Starter', criteria: 200000, reward: 999 },
    { name: 'Bronze', criteria: 500000, reward: 2499 },
    { name: 'Silver', criteria: 1000000, reward: 5499 },
    { name: 'Gold', criteria: 2500000, reward: 15999 },
  ]

  console.log(`\n=== Threshold Check ===`)
  for (const t of thresholds) {
    const totalPass = total >= t.criteria
    const topLegPass = power >= t.criteria * 0.6
    const otherLegsPass = otherLegs >= t.criteria * 0.4
    const eligible = totalPass && topLegPass && otherLegsPass
    console.log(`${t.name} (₹${t.criteria}): total ${totalPass ? '✓' : '✗'} (${total} >= ${t.criteria}), topLeg ${topLegPass ? '✓' : '✗'} (${power} >= ${t.criteria * 0.6}), otherLegs ${otherLegsPass ? '✓' : '✗'} (${otherLegs} >= ${t.criteria * 0.4}) => ${eligible ? 'ELIGIBLE ₹' + t.reward : 'NOT ELIGIBLE'}`)
  }

  // Check the income wallet payout flow - was resolveMonthlySalary called?
  const payoutCfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(payoutCfgRes.rows[0].value)
  const userSnap = snapshot.users.find(u => u.userId === 903784)
  if (userSnap) {
    console.log(`\nAugust snapshot salary: ₹${userSnap.workingWallet?.salary || 0}`)
  }

  // Check how payout was applied - look at income wallet
  const walletRes = await c.query('SELECT income_wallet, working_wallet, repurchase_wallet FROM users WHERE id = 903784')
  console.log(`\nCurrent wallets:`, walletRes.rows[0])

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

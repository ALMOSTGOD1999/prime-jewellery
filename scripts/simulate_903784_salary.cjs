const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

// Replicate PERFORMANCE_INCENTIVE_CONFIG from the code
const PERFORMANCE_INCENTIVE_CONFIG = [
  { designation: 'Starter', criteria: 200000, reward: 999 },
  { designation: 'Bronze', criteria: 500000, reward: 2499 },
  { designation: 'Silver', criteria: 1000000, reward: 5499 },
  { designation: 'Gold', criteria: 2500000, reward: 15999 },
  { designation: 'Platinum', criteria: 5000000, reward: 24999 },
  { designation: 'Emerald', criteria: 10000000, reward: 51999 },
  { designation: 'Ruby', criteria: 30000000, reward: 105999 },
  { designation: 'Sapphire', criteria: 50000000, reward: 154999 },
  { designation: 'Topaz', criteria: 100000000, reward: 254999 },
  { designation: 'Diamond', criteria: 200000000, reward: 509999 },
  { designation: 'Black Diamond', criteria: 500000000, reward: 824999 },
  { designation: 'Crown Diamond', criteria: 1000000000, reward: 1249999 },
  { designation: 'Royal Diamond', criteria: 3000000000, reward: 2999999 },
  { designation: 'Crown', criteria: 8000000000, reward: 4949999 },
  { designation: 'Royal', criteria: 12000000000, reward: 7499999 },
  { designation: 'Elite', criteria: 17000000000, reward: 9999999 },
  { designation: 'Legend', criteria: 25000000000, reward: 14999999 },
  { designation: 'Supreme', criteria: 35000000000, reward: 19999999 },
  { designation: 'Master', criteria: 50000000000, reward: 24000000 },
  { designation: 'Emperor', criteria: 80000000000, reward: 34999999 },
  { designation: 'King', criteria: 100000000000, reward: 49999999 },
]

function getSalaryInfo(legAmounts) {
  if (!legAmounts || legAmounts.length === 0) return null
  const total = legAmounts.reduce((sum, val) => sum + val, 0)
  const sorted = [...legAmounts].sort((a, b) => b - a)
  const topLeg = sorted[0]
  const otherLegs = total - topLeg
  if (total === 0 || otherLegs === 0) return null

  const descending = [...PERFORMANCE_INCENTIVE_CONFIG].sort((a, b) => b.criteria - a.criteria)
  for (const rank of descending) {
    if (
      total >= rank.criteria &&
      topLeg >= rank.criteria * 0.6 &&
      otherLegs >= rank.criteria * 0.4
    ) {
      return { designation: rank.designation, reward: rank.reward, criteria: rank.criteria, totalBusiness: total, topLeg, otherLegs, matched: true }
    }
  }
  return null
}

async function main() {
  await c.connect()

  const userId = 903784
  const targetMonth = '2026-08'
  const windowStart = '2026-03-01'
  const windowEnd = '2026-08-31 23:59:59'

  console.log('=== Simulating resolveMonthlySalary for PJ903784 ===')
  console.log(`Target month: ${targetMonth}, Window: ${windowStart} to ${windowEnd}\n`)

  // Step 1: Get direct children (same as code line 1406)
  const directChildren = await c.query('SELECT id, name FROM users WHERE parent_id = $1', [userId])
  console.log(`Direct children: ${directChildren.rows.length}`)
  for (const ch of directChildren.rows) {
    console.log(`  PJ${ch.id} (${ch.name})`)
  }

  // Step 2: For each child, get their subtree volume (same as code lines 1417-1453)
  const childrenVolumes = []
  for (const child of directChildren.rows) {
    // Get all descendants of this child
    const descRes = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT id FROM descendants
    `, [child.id])

    const descendantIds = descRes.rows.map(r => r.id)
    const allIds = [child.id, ...descendantIds]

    // Get total approved purchases within window
    const volRes = await c.query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM purchases
      WHERE user_id = ANY($1)
        AND approved_at IS NOT NULL AND cancelled_at IS NULL
        AND approved_at >= $2 AND approved_at <= $3
    `, [allIds, windowStart, windowEnd])

    const total = Number(volRes.rows[0].total)
    childrenVolumes.push(total)
    console.log(`  PJ${child.id}: subtree volume = ₹${total} (${descendantIds.length} descendants)`)
  }

  // Step 3: Sort and identify power/weaker
  const sortedVolumes = [...childrenVolumes].sort((a, b) => b - a)
  const power = sortedVolumes[0] || 0
  const weaker = sortedVolumes.slice(1).reduce((sum, val) => sum + val, 0)

  console.log(`\nPower: ₹${power}`)
  console.log(`Weaker: ₹${weaker}`)
  console.log(`Total: ₹${power + weaker}`)

  // Step 4: Check eligibility
  const eligibleInfo = getSalaryInfo(childrenVolumes)
  if (!eligibleInfo) {
    console.log('\n❌ NOT ELIGIBLE for any salary tier')
  } else {
    console.log(`\n✅ ELIGIBLE: ${eligibleInfo.designation} = ₹${eligibleInfo.reward}`)
    console.log(`   Total: ₹${eligibleInfo.totalBusiness}, Top: ₹${eligibleInfo.topLeg}, Other: ₹${eligibleInfo.otherLegs}`)
  }

  // Step 5: Check growth requirement (anchor check)
  // First salary ever paid
  const anchorRes = await c.query(`
    SELECT * FROM salaries WHERE user_id = $1 AND status = 'paid' AND paid_at IS NOT NULL
    ORDER BY paid_at ASC LIMIT 1
  `, [userId])

  if (anchorRes.rows.length > 0) {
    const anchor = anchorRes.rows[0]
    console.log(`\nAnchor salary found: paid_at=${anchor.paid_at}, qualifying_business=${anchor.qualifying_business}`)
  } else {
    console.log('\nNo anchor salary (first credit) — no growth check needed')
  }

  // Step 6: Check if month salary already exists
  const monthSalRes = await c.query(`
    SELECT * FROM salaries WHERE user_id = $1
    AND created_at >= '2026-08-01' AND created_at <= '2026-08-31 23:59:59'
    ORDER BY created_at ASC
  `, [userId])

  console.log(`\nAugust salary records: ${monthSalRes.rows.length}`)
  if (monthSalRes.rows.length > 0) {
    for (const r of monthSalRes.rows) {
      console.log(`  status=${r.status}, power=${r.power}, weaker=${r.weaker}, qualifying_business=${r.qualifying_business}`)
    }
  }

  // The salary was never created. Let's check if resolveMonthlySalary was even called
  // by looking at the income wallet payout log or timing
  console.log('\n=== Diagnosis ===')
  console.log('resolveMonthlySalary creates a salary record if none exists for the month.')
  console.log('No salary record means either:')
  console.log('1. getSalaryInfo returned null (not eligible)')
  console.log('2. resolveMonthlySalary threw an error')
  console.log('3. The user was not in the active users list when snapshot ran')

  // Check if user was active in August
  const userRes = await c.query('SELECT status, activated_at FROM users WHERE id = $1', [userId])
  console.log(`\nUser status: ${userRes.rows[0].status}, activated: ${userRes.rows[0].activated_at}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

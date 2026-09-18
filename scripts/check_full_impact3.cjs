const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Get ALL level income percentages from DB
  const lvlRes = await c.query("SELECT level, percentage::float FROM level_incomes WHERE is_active = true ORDER BY level")
  const pctMap = {}
  for (const r of lvlRes.rows) {
    pctMap[r.level] = r.percentage
  }
  console.log('Level percentages from DB:', JSON.stringify(pctMap))

  // Get snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // For each user with level income, recompute using DB percentages
  let totalOld = 0, totalNew = 0, count = 0, unchanged = 0
  const changes = []

  for (const u of snapshot.users) {
    const oldLevelIncome = u.workingWallet?.levelIncome || 0
    if (oldLevelIncome === 0) continue

    // Find descendant purchases in August with depth
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
    `, [u.userId])

    if (descRes.rows.length === 0) continue

    // Correct flat monthly: amount * pct / 100 for the month
    // But we need to know how many active days each purchase had
    // The code iterates day by day and sums dailyLevelReward. With new formula:
    // dailyLevelReward = cumulativeAmount * pct / 100 / daysInMonth
    // For a purchase active for N days in August: contribution = amount * pct / 100 / 31 * N
    let correctIncome = 0
    for (const p of descRes.rows) {
      const pct = pctMap[p.depth] || 0
      if (pct === 0) continue
      const daysActive = 31 - new Date(p.approved_at).getDate() + 1
      correctIncome += Number(p.amount) * (pct / 100) / 31 * daysActive
    }
    correctIncome = Math.round(correctIncome * 100) / 100

    const delta = Math.round((correctIncome - oldLevelIncome) * 100) / 100
    if (Math.abs(delta) < 0.01) { unchanged++; continue }

    totalOld += oldLevelIncome
    totalNew += correctIncome
    count++
    changes.push({ userId: u.userId, name: u.userName, old: oldLevelIncome, correct: correctIncome, delta })
  }

  console.log(`\n=== Level Income Corrections: ${count} users changed, ${unchanged} unchanged ===\n`)

  // Show top 20 by absolute delta
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  console.log(`${'PJ ID'.padEnd(12)}${'Name'.padEnd(28)}${'Old'.padStart(12)}${'Correct'.padStart(12)}${'Delta'.padStart(12)}`)
  console.log('-'.repeat(76))
  for (const ch of changes.slice(0, 20)) {
    const sign = ch.delta > 0 ? '+' : ''
    console.log(`PJ${ch.userId}`.padEnd(12) + ch.name.padEnd(28) + `₹${ch.old.toFixed(2)}`.padStart(12) + `₹${ch.correct.toFixed(2)}`.padStart(12) + `${sign}₹${ch.delta.toFixed(2)}`.padStart(12))
  }
  if (changes.length > 20) console.log(`... and ${changes.length - 20} more`)

  console.log('-'.repeat(76))
  const netDelta = totalNew - totalOld
  console.log(`\nOld total level income: ₹${totalOld.toFixed(2)}`)
  console.log(`Correct total level income: ₹${totalNew.toFixed(2)}`)
  console.log(`Net delta: ₹${netDelta.toFixed(2)}`)
  console.log(`Working wallet impact (70%): ₹${(netDelta * 0.7).toFixed(2)}`)
  console.log(`Repurchase wallet impact (20%): ₹${(netDelta * 0.2).toFixed(2)}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

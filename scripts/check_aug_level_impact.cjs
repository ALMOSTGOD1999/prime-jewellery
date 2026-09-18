const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  await c.connect()

  // Get the Aug snapshot config
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  if (!cfgRes.rows.length) { console.log('No Aug snapshot'); await c.end(); return }
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // For each user in snapshot that has level income, recalculate correct flat monthly
  const changes = []
  let totalOld = 0, totalNew = 0

  for (const u of snapshot.users) {
    if (!u.levelIncome || u.levelIncome === 0) continue

    // Find descendant purchases in August
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
    `, [u.userId])

    if (descRes.rows.length === 0) continue

    // Correct flat monthly calculation: sum(amount * pct/100) for each purchase
    let correctIncome = 0
    for (const p of descRes.rows) {
      const pct = LEVEL_PCT[p.depth] || 0
      if (pct === 0) continue
      correctIncome += Number(p.amount) * (pct / 100)
    }
    correctIncome = Math.round(correctIncome * 100) / 100

    const delta = Math.round((correctIncome - u.levelIncome) * 100) / 100
    if (Math.abs(delta) < 0.01) continue

    totalOld += u.levelIncome
    totalNew += correctIncome
    changes.push({ userId: u.userId, name: u.userName, old: u.levelIncome, correct: correctIncome, delta })
  }

  console.log(`Users needing correction: ${changes.length}`)
  console.log(`\n${'PJ ID'.padEnd(12)}${'Name'.padEnd(25)}${'Old'.padStart(12)}${'Correct'.padStart(12)}${'Delta'.padStart(12)}`)
  console.log('-'.repeat(73))
  for (const ch of changes) {
    const sign = ch.delta > 0 ? '+' : ''
    console.log(`PJ${ch.userId}`.padEnd(12) + ch.name.padEnd(25) + `₹${ch.old.toFixed(2)}`.padStart(12) + `₹${ch.correct.toFixed(2)}`.padStart(12) + `${sign}₹${ch.delta.toFixed(2)}`.padStart(12))
  }
  console.log('-'.repeat(73))
  console.log(`${'TOTAL'.padEnd(37)}₹${totalOld.toFixed(2)}`.padStart(49) + `₹${totalNew.toFixed(2)}`.padStart(12) + ` ₹${(totalNew - totalOld).toFixed(2)}`.padStart(12))

  // Also check working/repurchase wallet impact
  let workingDelta = 0, repurchaseDelta = 0
  for (const ch of changes) {
    workingDelta += ch.delta * 0.7
    repurchaseDelta += ch.delta * 0.2
  }
  console.log(`\nWorking wallet impact: ${workingDelta >= 0 ? '+' : ''}₹${workingDelta.toFixed(2)}`)
  console.log(`Repurchase wallet impact: ${repurchaseDelta >= 0 ? '+' : ''}₹${repurchaseDelta.toFixed(2)}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

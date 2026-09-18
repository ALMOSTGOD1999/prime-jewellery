const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  await c.connect()

  // Check payout months from platform_configs
  const pmRes = await c.query("SELECT key, value FROM platform_configs WHERE key LIKE '%payout_month%'")
  console.log('Payout month configs:')
  for (const r of pmRes.rows) {
    console.log(`  ${r.key} = ${r.value}`)
  }

  // Check snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  let totalOldLevelIncome = 0
  let totalNewLevelIncome = 0
  let count = 0
  const changes = []

  for (const u of snapshot.users) {
    const oldLevelIncome = u.workingWallet?.levelIncome || 0
    if (oldLevelIncome === 0) continue

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

    let correctIncome = 0
    for (const p of descRes.rows) {
      const pct = LEVEL_PCT[p.depth] || 0
      if (pct === 0) continue
      correctIncome += Number(p.amount) * (pct / 100)
    }
    correctIncome = Math.round(correctIncome * 100) / 100

    const delta = Math.round((correctIncome - oldLevelIncome) * 100) / 100
    if (Math.abs(delta) < 0.01) continue

    totalOldLevelIncome += oldLevelIncome
    totalNewLevelIncome += correctIncome
    count++
    changes.push({ userId: u.userId, name: u.userName, old: oldLevelIncome, correct: correctIncome, delta })
  }

  console.log(`\n=== Level Income Corrections: ${count} users ===\n`)
  console.log(`${'PJ ID'.padEnd(12)}${'Name'.padEnd(28)}${'Old'.padStart(12)}${'Correct'.padStart(12)}${'Delta'.padStart(12)}`)
  console.log('-'.repeat(76))
  for (const ch of changes) {
    const sign = ch.delta > 0 ? '+' : ''
    console.log(`PJ${ch.userId}`.padEnd(12) + ch.name.padEnd(28) + `₹${ch.old.toFixed(2)}`.padStart(12) + `₹${ch.correct.toFixed(2)}`.padStart(12) + `${sign}₹${ch.delta.toFixed(2)}`.padStart(12))
  }
  console.log('-'.repeat(76))

  const netDelta = totalNewLevelIncome - totalOldLevelIncome
  console.log(`\nOld level income total: ₹${totalOldLevelIncome.toFixed(2)}`)
  console.log(`Correct level income total: ₹${totalNewLevelIncome.toFixed(2)}`)
  console.log(`Net delta: ₹${netDelta.toFixed(2)}`)
  console.log(`Working wallet (70%): ₹${(netDelta * 0.7).toFixed(2)}`)
  console.log(`Repurchase wallet (20%): ₹${(netDelta * 0.2).toFixed(2)}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  await c.connect()

  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // Check PJ408872 specifically - had depth 1 purchase of 200000
  const u = snapshot.users.find(u => u.userId === 408872)
  if (!u) { console.log('PJ408872 not found'); await c.end(); return }

  console.log(`PJ${u.userId} (${u.userName}): snapshot levelIncome = ${u.levelIncome}`)

  // Get descendant purchases
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

  for (const p of descRes.rows) {
    const pct = LEVEL_PCT[p.depth] || 0
    const amt = Number(p.amount)
    const daysActive = 31 - new Date(p.approved_at).getDate() + 1
    const flat = amt * (pct / 100)
    const daily = amt * (pct / 100) * 12 / 365 * daysActive
    console.log(`  Depth ${p.depth}: ₹${amt} approved ${new Date(p.approved_at).toISOString().split('T')[0]}, ${daysActive} days`)
    console.log(`    Flat monthly: ₹${flat.toFixed(2)}, Daily pro-rata: ₹${daily.toFixed(2)}`)
  }

  // Now sum all purchases
  let flatTotal = 0
  let dailyTotal = 0
  for (const p of descRes.rows) {
    const pct = LEVEL_PCT[p.depth] || 0
    const amt = Number(p.amount)
    const daysActive = 31 - new Date(p.approved_at).getDate() + 1
    flatTotal += amt * (pct / 100)
    dailyTotal += amt * (pct / 100) * 12 / 365 * daysActive
  }
  console.log(`\nSnapshot: ₹${u.levelIncome}, Flat total: ₹${flatTotal.toFixed(2)}, Daily total: ₹${dailyTotal.toFixed(2)}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

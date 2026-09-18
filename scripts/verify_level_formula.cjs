const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  await c.connect()

  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // Check a few users with level income
  const checkUsers = snapshot.users.filter(u => u.levelIncome > 0).slice(0, 10)

  for (const u of checkUsers) {
    // Recalculate flat monthly
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

    let flatIncome = 0
    let dailyIncome = 0
    for (const p of descRes.rows) {
      const pct = LEVEL_PCT[p.depth] || 0
      if (pct === 0) continue
      flatIncome += Number(p.amount) * (pct / 100)
      // Old daily pro-rata: amount * pct / 100 * 12 / 365 * daysActive
      const daysActive = 31 - new Date(p.approved_at).getDate() + 1
      dailyIncome += Number(p.amount) * (pct / 100) * 12 / 365 * daysActive
    }
    flatIncome = Math.round(flatIncome * 100) / 100
    dailyIncome = Math.round(dailyIncome * 100) / 100

    console.log(`PJ${u.userId} (${u.userName}): snapshot=${u.levelIncome}, flat=${flatIncome}, daily=${dailyIncome}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

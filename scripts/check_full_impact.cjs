const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

const LEVEL_PCT = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  await c.connect()

  // Check payout months
  const monthRes = await c.query(`
    SELECT income_wallet_payout_month, working_wallet_payout_month, COUNT(*) as cnt
    FROM users WHERE role = 'user'
    GROUP BY income_wallet_payout_month, working_wallet_payout_month
  `)
  console.log('User payout months:')
  for (const m of monthRes.rows) {
    console.log(`  income=${m.income_wallet_payout_month}, working=${m.working_wallet_payout_month}: ${m.cnt} users`)
  }

  // Check a few users who had level income
  const users = [408872, 444473, 957, 585222]
  for (const uid of users) {
    const uRes = await c.query(`
      SELECT id, name, working_wallet, repurchase_wallet, income_wallet,
        income_wallet_payout_month, working_wallet_payout_month
      FROM users WHERE id = $1
    `, [uid])
    if (uRes.rows.length === 0) continue
    const u = uRes.rows[0]
    console.log(`\nPJ${u.id} (${u.name}): working_wallet=${u.working_wallet}, repurchase_wallet=${u.repurchase_wallet}, income_wallet=${u.income_wallet}`)
    console.log(`  income_payout_month=${u.income_wallet_payout_month}, working_payout_month=${u.working_wallet_payout_month}`)
  }

  // Now recalculate correct level income for these users
  console.log('\n=== Flat Monthly Level Income Recalculation ===\n')

  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  let totalOldLevelIncome = 0
  let totalNewLevelIncome = 0
  let count = 0

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

    if (count <= 20) {
      const sign = delta > 0 ? '+' : ''
      console.log(`PJ${u.userId} (${u.userName}): old=₹${oldLevelIncome.toFixed(2)}, correct=₹${correctIncome.toFixed(2)}, delta=${sign}₹${delta.toFixed(2)}`)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Users needing correction: ${count}`)
  console.log(`Old total level income: ₹${totalOldLevelIncome.toFixed(2)}`)
  console.log(`Correct total level income: ₹${totalNewLevelIncome.toFixed(2)}`)
  console.log(`Net delta: ₹${(totalNewLevelIncome - totalOldLevelIncome).toFixed(2)}`)
  console.log(`Working wallet impact (70%): ₹${((totalNewLevelIncome - totalOldLevelIncome) * 0.7).toFixed(2)}`)
  console.log(`Repurchase wallet impact (20%): ₹${((totalNewLevelIncome - totalOldLevelIncome) * 0.2).toFixed(2)}`)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

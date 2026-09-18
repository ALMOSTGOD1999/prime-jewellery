const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check ALL monthly snapshot months
  const months = await c.query('SELECT month, COUNT(*) as cnt FROM monthly_income_snapshots GROUP BY month ORDER BY month')
  console.log('=== Snapshot months ===')
  console.log(JSON.stringify(months.rows, null, 2))

  // Check Aug snapshots
  const augSnaps = await c.query("SELECT * FROM monthly_income_snapshots WHERE month >= '2026-08-01' AND month < '2026-09-01' LIMIT 10")
  console.log('\n=== August snapshots (sample) ===')
  console.log(JSON.stringify(augSnaps.rows, null, 2))

  // Check level income config
  const levels = await c.query('SELECT * FROM level_incomes WHERE is_active = true ORDER BY level')
  console.log('\n=== Level income config ===')
  console.log(JSON.stringify(levels.rows, null, 2))

  // Check activation level rewards logic - what are the activation amounts for 456594's descendants?
  // PJ456594's direct children: 534707, 602705, 601529 (3 directs -> maxDepth=5)
  // Need to find activated descendants within depth 5
  const desc456 = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, name, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = 456594
      UNION ALL
      SELECT u.id, u.name, u.parent_id, u.activated_at, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 5
    )
    SELECT id, name, activated_at, depth FROM descendants WHERE activated_at IS NOT NULL ORDER BY depth
  `)
  console.log('\n=== PJ456594 activated descendants (depth <=5) ===')
  console.log(JSON.stringify(desc456.rows, null, 2))

  // PJ577611's direct children: 727361 only (1 direct -> maxDepth=3)
  const desc577 = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, name, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = 577611
      UNION ALL
      SELECT u.id, u.name, u.parent_id, u.activated_at, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 3
    )
    SELECT id, name, activated_at, depth FROM descendants WHERE activated_at IS NOT NULL ORDER BY depth
  `)
  console.log('\n=== PJ577611 activated descendants (depth <=3) ===')
  console.log(JSON.stringify(desc577.rows, null, 2))

  // Check if August payout was actually cleared (wallets credited)
  const augTxns = await c.query("SELECT COUNT(*) as cnt, SUM(amount) as total FROM transactions WHERE type = 'wallet_credit' AND created_at >= '2026-09-01' AND created_at < '2026-10-01' AND remark LIKE '%working%'")
  console.log('\n=== August working wallet credits (Sept) ===')
  console.log(JSON.stringify(augTxns.rows, null, 2))

  // Check recent wallet credits to understand if August payout was cleared
  const recentCredits = await c.query("SELECT remark, COUNT(*) as cnt, SUM(amount) as total FROM transactions WHERE type = 'wallet_credit' AND created_at >= '2026-09-01' GROUP BY remark ORDER BY total DESC LIMIT 20")
  console.log('\n=== Recent wallet credits (Sept+) ===')
  console.log(JSON.stringify(recentCredits.rows, null, 2))

  // Check EMI level income - what tables/functions are involved?
  try {
    const emiCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_emi_subscriptions' ORDER BY ordinal_position")
    console.log('\n=== user_emi_subscriptions columns ===')
    console.log(emiCols.rows.map(r => r.column_name).join(', '))
  } catch(e) {}

  // Check user_emi_subscriptions for both users
  const emi456 = await c.query('SELECT * FROM user_emi_subscriptions WHERE user_id = 456594')
  console.log('\n=== PJ456594 EMI subscriptions ===')
  console.log(emi456.rows.length ? JSON.stringify(emi456.rows, null, 2) : 'NONE')

  const emi577 = await c.query('SELECT * FROM user_emi_subscriptions WHERE user_id = 577611')
  console.log('\n=== PJ577611 EMI subscriptions ===')
  console.log(emi577.rows.length ? JSON.stringify(emi577.rows, null, 2) : 'NONE')

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

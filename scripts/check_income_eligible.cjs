const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // For PJ456594: check all descendant purchases (for level income)
  const descendants456 = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id, 1 as depth FROM users WHERE parent_id = 456594
      UNION ALL
      SELECT u.id, u.parent_id, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      WHERE d.depth < 24
    )
    SELECT d.id, d.depth, u.name, u.activated_at, u.status
    FROM descendants d
    JOIN users u ON u.id = d.id
    ORDER BY d.depth, d.id
  `)
  console.log('=== PJ456594 descendants ===')
  console.log(JSON.stringify(descendants456.rows, null, 2))

  // Purchases by descendants of 456594
  const descIds456 = descendants456.rows.map(r => r.id)
  if (descIds456.length > 0) {
    const purchases = await c.query(`SELECT p.*, u.name as user_name FROM purchases p JOIN users u ON u.id = p.user_id WHERE p.user_id = ANY($1) AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL ORDER BY p.approved_at`, [descIds456])
    console.log('\n=== PJ456594 descendant purchases ===')
    console.log(JSON.stringify(purchases.rows, null, 2))
  }

  // For PJ577611: check all descendant purchases
  const descendants577 = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id, 1 as depth FROM users WHERE parent_id = 577611
      UNION ALL
      SELECT u.id, u.parent_id, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      WHERE d.depth < 24
    )
    SELECT d.id, d.depth, u.name, u.activated_at, u.status
    FROM descendants d
    JOIN users u ON u.id = d.id
    ORDER BY d.depth, d.id
  `)
  console.log('\n=== PJ577611 descendants ===')
  console.log(JSON.stringify(descendants577.rows, null, 2))

  const descIds577 = descendants577.rows.map(r => r.id)
  if (descIds577.length > 0) {
    const purchases = await c.query(`SELECT p.*, u.name as user_name FROM purchases p JOIN users u ON u.id = p.user_id WHERE p.user_id = ANY($1) AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL ORDER BY p.approved_at`, [descIds577])
    console.log('\n=== PJ577611 descendant purchases ===')
    console.log(JSON.stringify(purchases.rows, null, 2))
  }

  // Check what months the working payout has been run for
  const payoutMonths = await c.query('SELECT DISTINCT month FROM monthly_income_snapshots ORDER BY month')
  console.log('\n=== Working payout months run ===')
  console.log(JSON.stringify(payoutMonths.rows, null, 2))

  // Check platform config for payout status
  const configs = await c.query("SELECT * FROM platform_configs WHERE key LIKE '%payout%' OR key LIKE '%month%' ORDER BY key")
  console.log('\n=== Platform payout configs ===')
  console.log(JSON.stringify(configs.rows, null, 2))

  // Check: did the level income generation happen when children were activated?
  // Check activation cashback for 456594's children
  for (const childId of [534707, 602705, 601529]) {
    const child = await c.query('SELECT id, name, activated_at, activation_amount FROM users WHERE id = $1', [childId])
    console.log(`\n=== Child ${childId} activation info ===`)
    console.log(JSON.stringify(child.rows[0], null, 2))
  }

  // Check: does 456594 have activationAmount set?
  const user456 = await c.query('SELECT id, name, activation_amount FROM users WHERE id = 456594')
  console.log('\n=== PJ456594 activation amount ===')
  console.log(JSON.stringify(user456.rows[0], null, 2))

  // Check: does 577611 have activationAmount set?
  const user577 = await c.query('SELECT id, name, activation_amount FROM users WHERE id = 577611')
  console.log('\n=== PJ577611 activation amount ===')
  console.log(JSON.stringify(user577.rows[0], null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

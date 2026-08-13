const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const q = async (label, sql, params = []) => {
    const r = await client.query(sql, params)
    console.log(`\n=== ${label} (${r.rows.length}) ===`)
    for (const row of r.rows) console.log('  ' + JSON.stringify(row))
    return r.rows
  }

  // All transactions for 577611 ever
  await q('ALL transactions for 577611', `SELECT id, amount, type, remark, approved_at, created_at FROM transactions WHERE user_id = 577611 ORDER BY created_at`)

  // Downline of 577611
  const down = await q(
    'DOWNLINE of 577611 (recursive parent_id)',
    `WITH RECURSIVE tree AS (
       SELECT id, name, parent_id, activated_at, status, created_at, 1 AS depth FROM users WHERE parent_id = 577611
       UNION ALL
       SELECT u.id, u.name, u.parent_id, u.activated_at, u.status, u.created_at, t.depth + 1
       FROM users u JOIN tree t ON u.parent_id = t.id
     ) SELECT id, name, parent_id, activated_at, status, created_at, depth FROM tree ORDER BY depth, id`
  )

  const downIds = down.map((r) => r.id)
  if (downIds.length) {
    await q(
      'DOWNLINE activated on 2026-07-27',
      `SELECT id, name, parent_id, activated_at, status, created_at FROM users WHERE id = ANY($1) AND activated_at >= '2026-07-27T00:00:00+05:30' AND activated_at < '2026-07-28T00:00:00+05:30' ORDER BY activated_at`,
      [downIds]
    )
    await q(
      'DOWNLINE activated Jul27-Aug10 (since 577611 activation)',
      `SELECT id, name, parent_id, activated_at, status, created_at FROM users WHERE id = ANY($1) AND activated_at >= '2026-07-27T00:00:00+05:30' ORDER BY activated_at`,
      [downIds]
    )
  }

  // Everyone activated on 2026-07-27 (same day as 577611)
  await q(
    'ALL users activated 2026-07-27',
    `SELECT id, name, parent_id, activated_at, status FROM users WHERE activated_at >= '2026-07-27T00:00:00+05:30' AND activated_at < '2026-07-28T00:00:00+05:30' ORDER BY activated_at`
  )

  // Upline chain of 577611
  await q(
    'UPLINE chain of 577611',
    `WITH RECURSIVE up AS (
       SELECT id, name, parent_id, activated_at, 1 AS depth FROM users WHERE id = 577611
       UNION ALL
       SELECT u.id, u.name, u.parent_id, u.activated_at, up.depth + 1 FROM users u JOIN up ON u.id = up.parent_id
     ) SELECT id, name, parent_id, activated_at, depth FROM up ORDER BY depth`
  )

  // reward_awards for 577611
  await q('reward_awards rows for 577611', `SELECT * FROM reward_awards WHERE user_id = 577611 ORDER BY created_at DESC`)
  await q('reward_awards ALL rows (last 10)', `SELECT * FROM reward_awards ORDER BY created_at DESC LIMIT 10`)

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

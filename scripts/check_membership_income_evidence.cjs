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

  // Any transaction anywhere mentioning membership/level income/referral/activation reward
  await q(
    'transactions with membership/level/activation-reward remarks (ANY user)',
    `SELECT id, user_id, amount, type, remark, approved_at
     FROM transactions
     WHERE remark ILIKE '%membership%' OR remark ILIKE '%level income%' OR remark ILIKE '%level-income%'
        OR remark ILIKE '%activation reward%' OR remark ILIKE '%activation_reward%'
     ORDER BY created_at DESC LIMIT 50`
  )

  // reward_awards schema + rows
  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='reward_awards' ORDER BY ordinal_position`
  )
  console.log('\nreward_awards columns: ' + cols.rows.map((c) => `${c.column_name}:${c.data_type}`).join(', '))
  await q('reward_awards ALL rows', `SELECT * FROM reward_awards ORDER BY id LIMIT 30`)

  // users with reward_wallet > 0 (did anyone ever get reward wallet credits?)
  await q(
    'users with reward_wallet != 0',
    `SELECT id, name, reward_wallet, activated_at, status FROM users WHERE reward_wallet != 0 ORDER BY reward_wallet DESC LIMIT 20`
  )

  // Count of all users activated (context)
  await q('activation summary', `SELECT count(*) FILTER (WHERE activated_at IS NOT NULL) AS activated, count(*) AS total FROM users`)

  // activation_amount distribution
  await q(
    'activation_amount values in use',
    `SELECT activation_amount, count(*) FROM users GROUP BY activation_amount ORDER BY activation_amount`
  )

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

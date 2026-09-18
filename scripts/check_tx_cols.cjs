const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check transactions schema
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position")
  console.log('Transactions columns:', cols.rows.map(r => r.column_name).join(', '))

  // Check current state for PJ903784
  const uRes = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = 903784')
  console.log('\nCurrent wallets:', uRes.rows[0])

  const salRes = await c.query('SELECT id, power, weaker, qualifying_business, status, paid_at FROM salaries WHERE user_id = 903784')
  console.log('Salary records:', salRes.rows)

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

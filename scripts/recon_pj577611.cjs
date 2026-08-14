const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // 1. Full user row for PJ 577611
  const u = await client.query('SELECT * FROM users WHERE id = 577611')
  console.log('=== USER 577611 (PJ577611) ===')
  if (u.rows.length === 0) {
    console.log('NOT FOUND')
  } else {
    for (const [k, v] of Object.entries(u.rows[0])) {
      console.log(`  ${k}: ${v}`)
    }
  }

  // 2. All tables (to spot income/level/tree tables)
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  )
  console.log('\n=== ALL TABLES ===')
  console.log(tables.rows.map((r) => r.table_name).join(', '))

  // 3. users table columns
  const cols = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
  )
  console.log('\n=== users columns ===')
  for (const c of cols.rows) console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`)

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const roles = await client.query(`SELECT role, count(*) FROM users GROUP BY role ORDER BY 2 DESC`)
  console.log('=== ROLES ===')
  for (const r of roles.rows) console.log(JSON.stringify(r))

  const admins = await client.query(
    `SELECT id, name, role, status FROM users WHERE role = 'admin' ORDER BY id LIMIT 10`
  )
  console.log('=== ADMIN ROWS ===')
  for (const a of admins.rows) console.log(JSON.stringify(a))

  // top-level users (parent_id null) - often the owner/admin
  const top = await client.query(
    `SELECT id, name, role, status, parent_id FROM users WHERE parent_id IS NULL ORDER BY id LIMIT 10`
  )
  console.log('=== TOP-LEVEL USERS ===')
  for (const t of top.rows) console.log(JSON.stringify(t))

  const adm = await client.query(`SELECT id, name, role, status FROM users WHERE role = 'admin'`)
  console.log('=== ADMIN USER ===')
  for (const a of adm.rows) console.log(JSON.stringify(a))

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

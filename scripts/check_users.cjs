const { Client } = require('pg')
require('dotenv').config()

async function main() {
  // Override sslmode to avoid the pg SSL warning
  const url = process.env.DATABASE_URL.replace(/sslmode=[^&]+/, 'sslmode=disable')
  const client = new Client({ connectionString: url })
  await client.connect()

  const r = await client.query(
    'SELECT id, name, parent_id, status FROM users WHERE id IN (997860, 248892)'
  )
  const lines = r.rows.map(
    (row) =>
      'PJ' +
      row.id +
      ' | ' +
      row.name +
      ' | parent: ' +
      (row.parent_id ? 'PJ' + row.parent_id : 'none') +
      ' | ' +
      row.status
  )

  require('fs').writeFileSync('scripts/out.txt', lines.join('\n') + '\n')
  await client.end()
}

main().catch((e) => {
  require('fs').writeFileSync('scripts/out.txt', 'ERROR: ' + e.message)
  process.exit(1)
})

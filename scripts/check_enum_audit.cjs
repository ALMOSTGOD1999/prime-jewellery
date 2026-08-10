const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const types = await client.query(
    `SELECT typname, enumlabel
     FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname LIKE '%transaction%' ORDER BY typname, enumsortorder`
  )
  console.log('Transaction-related enum types/labels:')
  for (const t of types.rows) console.log(`  ${t.typname}: ${t.enumlabel}`)

  const audit = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'audit_logs' ORDER BY ordinal_position`
  )
  console.log('\naudit_logs columns:')
  for (const c of audit.rows) console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`)

  const txnCols = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'transactions' ORDER BY ordinal_position`
  )
  console.log('\ntransactions columns:')
  for (const c of txnCols.rows) console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default})`)

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

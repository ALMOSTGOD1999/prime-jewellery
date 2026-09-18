const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Find correct wallet table name
  const tables = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
  console.log('Tables:', tables.rows.map(r => r.tablename).join(', '))

  // Find wallet model
  const models = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%wallet%'")
  console.log('Wallet tables:', models.rows.map(r => r.tablename).join(', '))

  // Find transaction table
  const txTables = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%transaction%'")
  console.log('Transaction tables:', txTables.rows.map(r => r.tablename).join(', '))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check enum values
  const enumRes = await c.query(`
    SELECT e.enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type_enum'
    ORDER BY e.enumsortorder
  `)
  console.log('Valid transaction types:', enumRes.rows.map(r => r.enumlabel).join(', '))

  // Check existing salary transactions
  const txRes = await c.query(`
    SELECT type, COUNT(*) as cnt FROM transactions GROUP BY type ORDER BY cnt DESC
  `)
  console.log('\nExisting transaction types:')
  for (const r of txRes.rows) {
    console.log(`  ${r.type}: ${r.cnt}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

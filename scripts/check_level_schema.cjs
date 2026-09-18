const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'level_incomes' ORDER BY ordinal_position")
  console.log('level_incomes columns:', cols.rows.map(r => r.column_name).join(', '))

  const res = await c.query("SELECT * FROM level_incomes ORDER BY id")
  console.log('\nData:')
  for (const r of res.rows) {
    console.log(`  ${JSON.stringify(r)}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

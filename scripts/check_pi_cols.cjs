const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check column names for key tables
  const tables = ['performance_incentives', 'salaries', 'team_business_levels', 'monthly_income_snapshots']
  for (const t of tables) {
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`)
    console.log(`${t}: ${cols.rows.map(r => r.column_name).join(', ')}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

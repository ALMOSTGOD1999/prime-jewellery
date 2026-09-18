const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const res = await c.query("SELECT * FROM level_incomes ORDER BY depth")
  console.log('Level income percentages:')
  for (const r of res.rows) {
    console.log(`  Depth ${r.depth}: ${r.percentage}%`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

const { Client } = require('pg')
require('dotenv').config()
const q = async (c, s, p=[]) => (await c.query(s,p)).rows
async function main(){
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('=== snapshot columns ===')
  const cols = await q(c, `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='monthly_income_snapshots' ORDER BY ordinal_position`)
  console.log(cols.map(x=>x.column_name+':'+x.data_type).join(', '))
  console.log('=== sample snapshot rows (raw) ===')
  const s = await q(c, `SELECT * FROM monthly_income_snapshots WHERE month='2026-07-01' ORDER BY gross_amount DESC LIMIT 3`)
  console.log(JSON.stringify(s, null, 1).slice(0, 4000))
  await c.end()
}
main().catch(e=>{console.error(e);process.exit(1)})

const { Client } = require('pg')
require('dotenv').config()
const q = async (c, s, p=[]) => (await c.query(s,p)).rows
async function main(){
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('=== level_incomes schema ===')
  const cols = await q(c, `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='level_incomes' ORDER BY ordinal_position`)
  console.log(cols.map(x=>x.column_name+':'+x.data_type).join(', '))
  console.log('=== level_incomes rows ===')
  const li = await q(c, `SELECT * FROM level_incomes ORDER BY 1 LIMIT 20`)
  console.log(JSON.stringify(li, null, 1))
  await c.end()
}
main().catch(e=>{console.error(e);process.exit(1)})

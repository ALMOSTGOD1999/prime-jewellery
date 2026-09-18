const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Get all table names
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  console.log('=== All Tables ===')
  console.log(tables.rows.map(r => r.table_name).join('\n'))

  // Get columns for key tables
  const keyTables = ['level_incomes', 'monthly_income_snapshots', 'salaries', 'cashback_rewards', 'activation_cashbacks', 'activation_sponsor_rewards', 'activation_level_rewards', 'investment_return_distributions', 'reward_awards']
  for (const t of keyTables) {
    try {
      const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t])
      console.log(`\n=== ${t} columns ===`)
      console.log(cols.rows.map(r => `  ${r.column_name} (${r.data_type})`).join('\n'))
    } catch(e) {
      console.log(`\n=== ${t}: ERROR ${e.message} ===`)
    }
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

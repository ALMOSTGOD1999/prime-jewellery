const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check membership_level_incomes table structure
  const mliCols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'membership_level_incomes' ORDER BY ordinal_position")
  console.log('=== membership_level_incomes columns ===')
  console.log(mliCols.rows.map(r => `  ${r.column_name} (${r.data_type})`).join('\n'))

  // Check membership_level_incomes for both users
  for (const id of [456594, 577611]) {
    const mli = await c.query('SELECT * FROM membership_level_incomes WHERE receiver_id = $1 ORDER BY created_at', [id])
    console.log(`\n--- membership_level_incomes for ${id} ---`)
    console.log(mli.rows.length ? JSON.stringify(mli.rows, null, 2) : 'NONE')
  }

  // Check performance_incentives table structure
  const piCols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'performance_incentives' ORDER BY ordinal_position")
  console.log('\n=== performance_incentives columns ===')
  console.log(piCols.rows.map(r => `  ${r.column_name} (${r.data_type})`).join('\n'))

  // Check what income was credited to children's parents during Aug-Sep
  // Children of 456594: 534707, 602705, 601529
  // Check if any level income was credited to 456594 for Tumpa (602705, activated Aug 31) and Jahanara (601529, activated Sep 5)
  const childIncomes456 = await c.query(`
    SELECT t.id, t.user_id, t.amount, t.type, t.remark, t.created_at 
    FROM transactions t 
    WHERE t.type = 'wallet_credit' 
    AND t.remark LIKE '%456594%' 
    AND t.created_at >= '2026-08-17'
    ORDER BY t.created_at
  `)
  console.log('\n--- Transactions crediting 456594 since Aug 17 ---')
  console.log(childIncomes456.rows.length ? JSON.stringify(childIncomes456.rows, null, 2) : 'NONE')

  // Check level income received by 577611 since Aug 17
  const childIncomes577 = await c.query(`
    SELECT t.id, t.user_id, t.amount, t.type, t.remark, t.created_at 
    FROM transactions t 
    WHERE t.type = 'wallet_credit' 
    AND t.remark LIKE '%577611%' 
    AND t.created_at >= '2026-08-17'
    ORDER BY t.created_at
  `)
  console.log('\n--- Transactions crediting 577611 since Aug 17 ---')
  console.log(childIncomes577.rows.length ? JSON.stringify(childIncomes577.rows, null, 2) : 'NONE')

  // Check all transactions for children of 456594 since Aug 17 (activations, purchases)
  const childTxns = await c.query(`
    SELECT t.id, t.user_id, t.amount, t.type, t.remark, t.created_at 
    FROM transactions t 
    WHERE t.user_id IN (534707, 602705, 601529)
    AND t.created_at >= '2026-08-17'
    ORDER BY t.user_id, t.created_at
  `)
  console.log('\n--- Children of 456594 transactions since Aug 17 ---')
  console.log(childTxns.rows.length ? JSON.stringify(childTxns.rows, null, 2) : 'NONE')

  // Check purchases for children of 456594
  const childPurchases = await c.query(`
    SELECT p.* FROM purchases p 
    WHERE p.user_id IN (534707, 602705, 601529)
    ORDER BY p.created_at
  `)
  console.log('\n--- Children of 456594 purchases ---')
  console.log(childPurchases.rows.length ? JSON.stringify(childPurchases.rows, null, 2) : 'NONE')

  // Check level income system: how does it work?
  // Look at the level_incomes config
  const levels = await c.query('SELECT * FROM level_incomes WHERE is_active = true ORDER BY level')
  console.log('\n--- Active Level Income Config ---')
  console.log(JSON.stringify(levels.rows, null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

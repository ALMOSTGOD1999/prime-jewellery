const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check level incomes credited for Tumpa (602705) and Jahanara (601529) activations
  for (const childId of [602705, 601529]) {
    const txns = await c.query(`
      SELECT t.id, t.user_id, t.amount, t.type, t.remark, t.created_at, t.approved_at
      FROM transactions t
      WHERE t.remark LIKE '%' || $1 || '%'
      ORDER BY t.created_at
    `, [String(childId)])
    console.log(`\n--- Level incomes from child ${childId} ---`)
    console.log(txns.rows.length ? JSON.stringify(txns.rows, null, 2) : 'NONE')
  }

  // Check if Monoj (534707) has any purchases that would generate cashback for PJ456594
  const monoPurchases = await c.query('SELECT * FROM purchases WHERE user_id = 534707 ORDER BY created_at')
  console.log('\n--- Monoj (534707) purchases ---')
  console.log(monoPurchases.rows.length ? JSON.stringify(monoPurchases.rows, null, 2) : 'NONE')

  // Check investments for all children of 456594
  for (const childId of [534707, 602705, 601529]) {
    const inv = await c.query('SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at', [childId])
    console.log(`\n--- Investments of child ${childId} ---`)
    console.log(inv.rows.length ? JSON.stringify(inv.rows, null, 2) : 'NONE')
  }

  // Check all income types - what does the system generate?
  // Check if there's a cashback from child investment returns
  const cashbackTxns456 = await c.query(`
    SELECT t.id, t.user_id, t.amount, t.type, t.remark, t.created_at
    FROM transactions t
    WHERE t.user_id = 456594
    AND t.type = 'wallet_credit'
    ORDER BY t.created_at
  `)
  console.log('\n--- All wallet credits to 456594 ---')
  console.log(JSON.stringify(cashbackTxns456.rows, null, 2))

  // Check what the payout system generates - look at processWorkingPayout and other income types
  // Check the active income types
  const rewardAwards = await c.query('SELECT * FROM reward_awards WHERE is_active = true ORDER BY sort_order')
  console.log('\n--- Active Reward Awards ---')
  console.log(JSON.stringify(rewardAwards.rows, null, 2))

  // Check team business levels
  const tbl = await c.query('SELECT * FROM team_business_levels WHERE is_active = true ORDER BY level')
  console.log('\n--- Active Team Business Levels ---')
  console.log(JSON.stringify(tbl.rows, null, 2))

  // Check what children 602705 and 601529 have in terms of children/purchases
  for (const childId of [602705, 601529]) {
    const grandchildren = await c.query('SELECT id, name, status, activated_at FROM users WHERE parent_id = $1', [childId])
    console.log(`\n--- Children of ${childId} ---`)
    console.log(grandchildren.rows.length ? JSON.stringify(grandchildren.rows, null, 2) : 'NONE')

    const childTxns = await c.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at', [childId])
    console.log(`--- Transactions of ${childId} ---`)
    console.log(childTxns.rows.length ? JSON.stringify(childTxns.rows, null, 2) : 'NONE')
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

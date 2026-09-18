const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const ids = [456594, 577611]

  for (const id of ids) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`USER ${id}`)
    console.log(`${'='.repeat(60)}`)

    // User basic
    const user = await c.query('SELECT id, name, status, parent_id, leg, activated_at, created_at, updated_at, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested FROM users WHERE id = $1', [id])
    console.log('\n--- User Info ---')
    console.log(JSON.stringify(user.rows[0], null, 2))

    // Purchases
    const purchases = await c.query('SELECT * FROM purchases WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Purchases ---')
    console.log(purchases.rows.length ? JSON.stringify(purchases.rows, null, 2) : 'NONE')

    // Transactions
    const txns = await c.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Transactions ---')
    console.log(JSON.stringify(txns.rows, null, 2))

    // Children
    const children = await c.query('SELECT id, name, status, leg, activated_at FROM users WHERE parent_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Children ---')
    console.log(JSON.stringify(children.rows, null, 2))

    // Membership level incomes (check columns first)
    try {
      const mliCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'membership_level_incomes' ORDER BY ordinal_position")
      const mliColsList = mliCols.rows.map(r => r.column_name)
      const mli = await c.query(`SELECT * FROM membership_level_incomes WHERE ${mliColsList.includes('user_id') ? 'user_id' : mliColsList.includes('receiver_id') ? 'receiver_id' : '1=0'} = $1 ORDER BY created_at`, [id])
      console.log(`\n--- Membership Level Incomes (cols: ${mliColsList.join(', ')}) ---`)
      console.log(JSON.stringify(mli.rows, null, 2))
    } catch(e) {
      console.log('\n--- Membership Level Incomes: ERROR ---', e.message)
    }

    // Performance incentives
    try {
      const piCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'performance_incentives' ORDER BY ordinal_position")
      const piColsList = piCols.rows.map(r => r.column_name)
      const pi = await c.query(`SELECT * FROM performance_incentives WHERE ${piColsList.includes('user_id') ? 'user_id' : '1=0'} = $1 ORDER BY created_at`, [id])
      console.log(`\n--- Performance Incentives (cols: ${piColsList.join(', ')}) ---`)
      console.log(JSON.stringify(pi.rows, null, 2))
    } catch(e) {
      console.log('\n--- Performance Incentives: ERROR ---', e.message)
    }

    // Monthly income snapshots
    const snaps = await c.query('SELECT * FROM monthly_income_snapshots WHERE user_id = $1 ORDER BY month', [id])
    console.log('\n--- Monthly Income Snapshots ---')
    console.log(snaps.rows.length ? JSON.stringify(snaps.rows, null, 2) : 'NONE')

    // Salaries
    const sals = await c.query('SELECT * FROM salaries WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Salaries ---')
    console.log(sals.rows.length ? JSON.stringify(sals.rows, null, 2) : 'NONE')

    // Investment return distributions
    const ird = await c.query('SELECT * FROM investment_return_distributions WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Investment Return Distributions ---')
    console.log(ird.rows.length ? JSON.stringify(ird.rows, null, 2) : 'NONE')
  }

  // Also check team_business_levels
  try {
    const tblCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'team_business_levels' ORDER BY ordinal_position")
    const tblColsList = tblCols.rows.map(r => r.column_name)
    console.log(`\nteam_business_levels columns: ${tblColsList.join(', ')}`)
  } catch(e) {}

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

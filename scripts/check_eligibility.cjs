const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const ids = [456594, 577611]

  for (const id of ids) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`USER ${id}`)
    console.log(`${'='.repeat(60)}`)

    // Basic info
    const user = await c.query('SELECT id, name, status, parent_id, leg, activated_at, created_at, updated_at, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested FROM users WHERE id = $1', [id])
    console.log('\n--- User Info ---')
    console.log(JSON.stringify(user.rows[0], null, 2))

    // Purchases
    const purchases = await c.query('SELECT * FROM purchases WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Purchases ---')
    console.log(JSON.stringify(purchases.rows, null, 2))

    // Transactions
    const txns = await c.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Transactions ---')
    console.log(JSON.stringify(txns.rows, null, 2))

    // Children
    const children = await c.query('SELECT id, name, status, leg, activated_at FROM users WHERE parent_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Children ---')
    console.log(JSON.stringify(children.rows, null, 2))

    // Level incomes received
    const levelIncomes = await c.query('SELECT * FROM level_incomes WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Level Incomes ---')
    console.log(JSON.stringify(levelIncomes.rows, null, 2))

    // Monthly income snapshots
    const snapshots = await c.query('SELECT * FROM monthly_income_snapshots WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Monthly Income Snapshots ---')
    console.log(JSON.stringify(snapshots.rows, null, 2))

    // Salaries
    const salaries = await c.query('SELECT * FROM salaries WHERE user_id = $1 ORDER BY created_at', [id])
    console.log('\n--- Salaries ---')
    console.log(JSON.stringify(salaries.rows, null, 2))

    // Cashback rewards
    try {
      const cashback = await c.query('SELECT * FROM cashback_rewards WHERE user_id = $1 ORDER BY created_at', [id])
      console.log('\n--- Cashback Rewards ---')
      console.log(JSON.stringify(cashback.rows, null, 2))
    } catch(e) {
      console.log('\n--- Cashback Rewards: table may not exist ---')
    }

    // Activation cashback
    try {
      const actCashback = await c.query('SELECT * FROM activation_cashbacks WHERE user_id = $1 OR sponsor_id = $1 ORDER BY created_at', [id])
      console.log('\n--- Activation Cashback ---')
      console.log(JSON.stringify(actCashback.rows, null, 2))
    } catch(e) {
      console.log('\n--- Activation Cashback: table may not exist ---')
    }

    // Activation sponsor rewards
    try {
      const actSponsor = await c.query('SELECT * FROM activation_sponsor_rewards WHERE user_id = $1 ORDER BY created_at', [id])
      console.log('\n--- Activation Sponsor Rewards ---')
      console.log(JSON.stringify(actSponsor.rows, null, 2))
    } catch(e) {
      console.log('\n--- Activation Sponsor Rewards: table may not exist ---')
    }

    // Activation level rewards
    try {
      const actLevel = await c.query('SELECT * FROM activation_level_rewards WHERE user_id = $1 ORDER BY created_at', [id])
      console.log('\n--- Activation Level Rewards ---')
      console.log(JSON.stringify(actLevel.rows, null, 2))
    } catch(e) {
      console.log('\n--- Activation Level Rewards: table may not exist ---')
    }

    // Investment return distributions
    try {
      const ird = await c.query('SELECT * FROM investment_return_distributions WHERE user_id = $1 ORDER BY created_at', [id])
      console.log('\n--- Investment Return Distributions ---')
      console.log(JSON.stringify(ird.rows, null, 2))
    } catch(e) {
      console.log('\n--- Investment Return Distributions: table may not exist ---')
    }
  }

  // Also check: who is the parent of these users?
  console.log(`\n${'='.repeat(60)}`)
  console.log('PARENT INFO')
  console.log(`${'='.repeat(60)}`)
  const parents = await c.query('SELECT id, name, status, parent_id FROM users WHERE id IN (SELECT DISTINCT parent_id FROM users WHERE id IN (456594, 577611))')
  console.log(JSON.stringify(parents.rows, null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

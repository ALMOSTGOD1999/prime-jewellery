const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // 1. User wallet balances
  const user = await c.query(`
    SELECT id, name, status, role, parent_id, activated_at,
           income_wallet, repurchase_wallet, working_wallet,
           total_invested, activation_amount
    FROM users WHERE id = 456594
  `)
  console.log('=== USER PJ456594 ===')
  console.log(JSON.stringify(user.rows, null, 2))

  // 2. All transactions
  const txns = await c.query(`
    SELECT id, type, amount, remark, approved_at, created_at
    FROM transactions
    WHERE user_id = 456594
    ORDER BY created_at DESC
    LIMIT 30
  `)
  console.log('\n=== TRANSACTIONS ===')
  console.log(JSON.stringify(txns.rows, null, 2))

  // 3. Monthly income snapshots
  const snapshots = await c.query(`
    SELECT month, gross_amount, income_wallet_amount, repurchase_wallet_amount, paid_out_at
    FROM monthly_income_snapshots
    WHERE user_id = 456594
    ORDER BY month DESC
  `)
  console.log('\n=== MONTHLY INCOME SNAPSHOTS ===')
  console.log(JSON.stringify(snapshots.rows, null, 2))

  // 4. Salary records
  const salaries = await c.query(`
    SELECT id, power, weaker, status, paid_at, qualifying_business, created_at
    FROM salaries
    WHERE user_id = 456594
    ORDER BY created_at DESC
  `)
  console.log('\n=== SALARY RECORDS ===')
  console.log(JSON.stringify(salaries.rows, null, 2))

  // 5. Purchases
  const purchases = await c.query(`
    SELECT id, amount, buyer_name, approved_at, rejected_at, cancelled_at, created_at
    FROM purchases
    WHERE user_id = 456594
    ORDER BY created_at DESC
    LIMIT 10
  `)
  console.log('\n=== PURCHASES ===')
  console.log(JSON.stringify(purchases.rows, null, 2))

  // 6. Children/directs
  const children = await c.query(`
    SELECT id, name, status, activated_at, leg
    FROM users
    WHERE parent_id = 456594
    ORDER BY created_at DESC
  `)
  console.log('\n=== CHILDREN/DIRECTS ===')
  console.log(JSON.stringify(children.rows, null, 2))

  // 7. Level incomes credited to this user
  const levelIncomes = await c.query(`
    SELECT id, amount, remark, created_at
    FROM transactions
    WHERE user_id = 456594
    AND remark LIKE '%Level%Income%'
    ORDER BY created_at DESC
    LIMIT 10
  `)
  console.log('\n=== LEVEL INCOME TRANSACTIONS ===')
  console.log(JSON.stringify(levelIncomes.rows, null, 2))

  // 8. Wallet credit/debit transactions grouped by type
  const walletTxns = await c.query(`
    SELECT type, remark, count(*) as cnt, sum(amount) as total
    FROM transactions
    WHERE user_id = 456594
    GROUP BY type, remark
    ORDER BY total DESC
  `)
  console.log('\n=== WALLET TRANSACTIONS GROUPED ===')
  console.log(JSON.stringify(walletTxns.rows, null, 2))

  // 9. Withdrawals
  const withdrawals = await c.query(`
    SELECT id, type, amount, net_amount, status, admin_charges, created_at
    FROM withdrawls
    WHERE user_id = 456594
    ORDER BY created_at DESC
  `)
  console.log('\n=== WITHDRAWALS ===')
  console.log(JSON.stringify(withdrawals.rows, null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

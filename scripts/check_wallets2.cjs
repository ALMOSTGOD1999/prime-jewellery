const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // 1. Check users with snapshots but 0 repurchase wallet
  const snapNoRepurchase = await c.query(`
    SELECT mis.user_id, mis.repurchase_wallet_amount, u.repurchase_wallet, u.name
    FROM monthly_income_snapshots mis
    JOIN users u ON u.id = mis.user_id
    WHERE mis.month = '2026-08-01'
    AND mis.repurchase_wallet_amount > 0
    AND u.repurchase_wallet = 0
    AND mis.paid_out_at IS NOT NULL
    LIMIT 10
  `)
  console.log('=== USERS WITH SNAPSHOTS BUT 0 REPURCHASE WALLET ===')
  console.log(JSON.stringify(snapNoRepurchase.rows, null, 2))

  // 2. Check total repurchase credited via transactions vs wallet balance
  const repurchaseCheck = await c.query(`
    SELECT u.id, u.name, u.repurchase_wallet,
           (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.user_id = u.id AND t.type = 'wallet_credit' AND t.remark LIKE '%Repurchase%') as total_repurchase_credited,
           (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.user_id = u.id AND t.type = 'wallet_debit' AND t.remark LIKE '%repurchase%') as total_repurchase_debited
    FROM users u
    WHERE u.role = 'user' AND u.repurchase_wallet > 0
    ORDER BY u.repurchase_wallet DESC
    LIMIT 10
  `)
  console.log('\n=== TOP REPURCHASE WALLET USERS - CREDIT vs BALANCE ===')
  console.log(JSON.stringify(repurchaseCheck.rows, null, 2))

  // 3. Check salary records status
  const salaryDetail = await c.query(`
    SELECT s.user_id, u.name, s.status, s.power, s.weaker, s.is_paid, s.paid_at, s.created_at
    FROM salaries s
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= '2026-08-01' AND s.created_at < '2026-09-01'
    ORDER BY s.created_at DESC
    LIMIT 15
  `)
  console.log('\n=== AUGUST SALARY RECORDS DETAIL ===')
  console.log(JSON.stringify(salaryDetail.rows, null, 2))

  // 4. Check salary page: getSalaryStats query - does it work?
  const salaryPageCheck = await c.query(`
    SELECT s.user_id, u.name, s.status, s.is_paid,
           s.power, s.weaker
    FROM salaries s
    JOIN users u ON u.id = s.user_id
    WHERE u.status = 'active'
    AND s.status = 'paid'
    ORDER BY (s.power + s.weaker) DESC
    LIMIT 5
  `)
  console.log('\n=== PAID SALARIES - TOP USERS ===')
  console.log(JSON.stringify(salaryPageCheck.rows, null, 2))

  // 5. Check the actual snapshot - did salary get included?
  const snapshotSalary = await c.query(`
    SELECT mis.user_id, u.name, mis.gross_amount, mis.month,
           (SELECT COALESCE(SUM(s2.power + s2.weaker), 0) FROM salaries s2 WHERE s2.user_id = mis.user_id AND s2.status = 'paid' AND s2.paid_at >= '2026-08-01' AND s2.paid_at < '2026-09-01') as salary_in_month
    FROM monthly_income_snapshots mis
    JOIN users u ON u.id = mis.user_id
    WHERE mis.month = '2026-08-01'
    AND mis.gross_amount > 0
    ORDER BY mis.gross_amount DESC
    LIMIT 10
  `)
  console.log('\n=== SNAPSHOTS vs SALARY IN MONTH ===')
  console.log(JSON.stringify(snapshotSalary.rows, null, 2))

  // 6. Check if there are users with transactions but remark pattern issues
  const walletHistoryCheck = await c.query(`
    SELECT t.user_id, t.remark, t.amount, t.type, t.created_at
    FROM transactions t
    WHERE t.type = 'wallet_credit'
    AND t.remark LIKE '%Salary%'
    AND t.created_at >= '2026-08-01'
    LIMIT 10
  `)
  console.log('\n=== SALARY WALLET CREDIT TRANSACTIONS ===')
  console.log(JSON.stringify(walletHistoryCheck.rows, null, 2))

  // 7. Check wallet_history patterns - does salary show up?
  const walletPatterns = await c.query(`
    SELECT DISTINCT remark FROM transactions
    WHERE type = 'wallet_credit'
    AND remark LIKE '%salary%' OR remark LIKE '%Salary%'
    LIMIT 10
  `)
  console.log('\n=== SALARY TRANSACTION REMARKS ===')
  console.log(JSON.stringify(walletPatterns.rows, null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

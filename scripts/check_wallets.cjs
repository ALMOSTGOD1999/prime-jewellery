const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // 1. Payout status
  const configs = await c.query("SELECT key, value FROM platform_configs WHERE key LIKE '%payout%'")
  console.log('=== PAYOUT CONFIGS ===')
  console.log(JSON.stringify(configs.rows, null, 2))

  // 2. Salary stats
  const salaryStats = await c.query(`
    SELECT status, count(*) as cnt, sum(power) as total_power, sum(weaker) as total_weaker
    FROM salaries GROUP BY status
  `)
  console.log('\n=== SALARY STATS ===')
  console.log(JSON.stringify(salaryStats.rows, null, 2))

  // 3. Users with repurchase wallet > 0
  const repurchaseUsers = await c.query(`
    SELECT count(*) as cnt, sum(repurchase_wallet) as total FROM users WHERE repurchase_wallet > 0 AND role = 'user'
  `)
  console.log('\n=== REPURCHASE WALLET (users with balance) ===')
  console.log(JSON.stringify(repurchaseUsers.rows, null, 2))

  // 4. Working wallet stats
  const workingStats = await c.query(`
    SELECT count(*) as cnt, sum(working_wallet) as total FROM users WHERE working_wallet > 0 AND role = 'user'
  `)
  console.log('\n=== WORKING WALLET (users with balance) ===')
  console.log(JSON.stringify(workingStats.rows, null, 2))

  // 5. Check monthly income snapshots
  const snapshots = await c.query(`
    SELECT month, count(*) as cnt, sum(gross_amount) as gross, 
           sum(income_wallet_amount) as income, sum(repurchase_wallet_amount) as repurchase,
           count(paid_out_at) as paid
    FROM monthly_income_snapshots GROUP BY month ORDER BY month DESC LIMIT 5
  `)
  console.log('\n=== MONTHLY INCOME SNAPSHOTS ===')
  console.log(JSON.stringify(snapshots.rows, null, 2))

  // 6. Check if salary was included in snapshots
  const sampleSnapshot = await c.query(`
    SELECT mis.user_id, mis.gross_amount, mis.month, mis.paid_out_at,
           s.status as salary_status, s.power, s.weaker
    FROM monthly_income_snapshots mis
    LEFT JOIN salaries s ON s.user_id = mis.user_id
    WHERE mis.month = '2026-08-01'
    AND mis.gross_amount > 0
    ORDER BY mis.gross_amount DESC
    LIMIT 10
  `)
  console.log('\n=== SAMPLE SNAPSHOTS (Aug) with salary check ===')
  console.log(JSON.stringify(sampleSnapshot.rows, null, 2))

  // 7. Check transaction remarks for wallet credits
  const txRemarks = await c.query(`
    SELECT remark, count(*) as cnt, sum(amount) as total
    FROM transactions
    WHERE type = 'wallet_credit'
    AND remark LIKE '%2026%'
    GROUP BY remark
    ORDER BY total DESC
    LIMIT 20
  `)
  console.log('\n=== WALLET CREDIT REMARKS ===')
  console.log(JSON.stringify(txRemarks.rows, null, 2))

  // 8. Check how many users have salary records for Aug
  const augSalaries = await c.query(`
    SELECT status, count(*) as cnt, sum(power) as total_power, sum(weaker) as total_weaker
    FROM salaries
    WHERE created_at >= '2026-08-01' AND created_at < '2026-09-01'
    GROUP BY status
  `)
  console.log('\n=== AUGUST SALARY RECORDS ===')
  console.log(JSON.stringify(augSalaries.rows, null, 2))

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

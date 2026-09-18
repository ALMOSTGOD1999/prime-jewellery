const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check if payout was applied - look at wallets and transactions
  const walletRes = await c.query(`
    SELECT user_id, type, balance, total_earned
    FROM wallets
    WHERE type IN ('working', 'repurchase')
    ORDER BY total_earned DESC
    LIMIT 5
  `)
  console.log('Top wallets by total_earned:')
  for (const w of walletRes.rows) {
    console.log(`  User ${w.user_id} (${w.type}): balance=${w.balance}, total_earned=${w.total_earned}`)
  }

  // Check transactions for level income in August
  const txRes = await c.query(`
    SELECT type, COUNT(*) as cnt, SUM(amount)::float as total
    FROM transactions
    WHERE created_at >= '2026-08-01' AND created_at < '2026-09-01'
    GROUP BY type
    ORDER BY total DESC
  `)
  console.log('\nAugust transactions by type:')
  for (const tx of txRes.rows) {
    console.log(`  ${tx.type}: count=${tx.cnt}, total=₹${tx.total?.toFixed(2)}`)
  }

  // Check income_wallet_payout_month and working_wallet_payout_month
  const monthRes = await c.query(`
    SELECT income_wallet_payout_month, working_wallet_payout_month, COUNT(*) as cnt
    FROM users
    WHERE role = 'user'
    GROUP BY income_wallet_payout_month, working_wallet_payout_month
  `)
  console.log('\nUser payout months:')
  for (const m of monthRes.rows) {
    console.log(`  income=${m.income_wallet_payout_month}, working=${m.working_wallet_payout_month}: ${m.cnt} users`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

/* Recon 2: debit breakdown, June credit remarks, withdraw timing (read-only) */
const { Client } = require('pg')
require('dotenv').config()

const q = async (client, sql, params = []) => (await client.query(sql, params)).rows

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log('=== A. WALLET_DEBIT REMARK BREAKDOWN ===')
  const debits = await q(
    client,
    `SELECT left(remark, 90) remark, count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at
     FROM transactions WHERE type='wallet_debit' GROUP BY left(remark, 90) ORDER BY sum(amount) DESC`
  )
  for (const r of debits) {
    console.log(`  ${String(r.n).padStart(5)} x ${String(r.total).padStart(12)}  ${r.first_at} → ${r.last_at}  ${r.remark}`)
  }

  console.log('\n=== B. JUNE-PERIOD DISTRIBUTION CREDIT TRANSACTIONS (remarks) ===')
  const juneCredits = await q(
    client,
    `SELECT t.id, t.user_id, t.type, round(t.amount::numeric,2) amount, t.remark, t.approved_at
     FROM transactions t JOIN investment_return_distributions d ON d.income_wallet_transaction_id = t.id
     WHERE d.period_month = '2026-06-01' ORDER BY t.user_id LIMIT 40`
  )
  for (const r of juneCredits) {
    console.log(`  ${String(r.id).padEnd(26)} u=${String(r.user_id).padEnd(9)} ${String(r.amount).padStart(11)}  ${r.approved_at}  ${String(r.remark).slice(0, 80)}`)
  }

  console.log('\n=== C. ALL WALLET_DEBIT USER COUNTS / PER-USER MAX ===')
  const perUser = await q(
    client,
    `SELECT count(distinct user_id) users, count(*) n, round(sum(amount)::numeric,2) total,
            min(approved_at) first_at, max(approved_at) last_at
     FROM transactions WHERE type='wallet_debit'`
  )
  console.log(perUser)

  console.log('\n=== D. WHICH PERIOD DID 2026-08-06 CREDITS BELONG TO? (July 29 credits) ===')
  const julyCredits = await q(
    client,
    `SELECT d.period_month, count(*) n, round(sum(t.amount)::numeric,2) total
     FROM transactions t JOIN investment_return_distributions d ON d.income_wallet_transaction_id = t.id
     WHERE t.approved_at >= '2026-08-06' AND t.approved_at < '2026-08-07'
     GROUP BY d.period_month`
  )
  console.log(julyCredits)

  console.log('\n=== E. JUNE-PERIOD USERS: current balance composition ===')
  const comp = await q(
    client,
    `SELECT u.id, u.name, round(u.income_wallet::numeric,2) bal,
       round((SELECT COALESCE(sum(t2.amount),0) FROM transactions t2 WHERE t2.user_id=u.id AND t2.type='wallet_credit' AND t2.remark LIKE '%for June 2026%' OR t2.user_id=u.id AND t2.type='wallet_credit' AND t2.remark LIKE '%for July 2026%')::numeric,2) june_july_credits
     FROM users u
     JOIN (SELECT DISTINCT user_id FROM investment_return_distributions WHERE period_month='2026-06-01') d ON d.user_id=u.id
     ORDER BY u.id`
  )
  for (const r of comp) console.log(`  ${String(r.id).padEnd(9)} ${String(r.name || '').padEnd(24)} bal=${String(r.bal).padStart(11)}`)

  console.log('\n=== F. TOTAL income_wallet by composition bucket (all 246 positive) ===')
  const buckets = await q(
    client,
    `SELECT
       count(*) FILTER (WHERE (SELECT count(*) FROM transactions t WHERE t.user_id=u.id AND t.type='wallet_credit' AND t.remark LIKE 'Membership Level Income %') > 0) mli_users,
       (SELECT round(sum(amount)::numeric,2) FROM transactions WHERE type='wallet_credit' AND remark LIKE 'Cashback wallet (70%) from investment return%') invest_income_credits
     FROM users u WHERE role != 'admin' AND income_wallet > 0`
  )
  console.log(buckets)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

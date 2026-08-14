/* Recon: June leftovers + July payout state (read-only) */
const { Client } = require('pg')
require('dotenv').config()

const q = async (client, sql, params = []) => (await client.query(sql, params)).rows

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log('=== 1. PLATFORM CONFIG (payout months) ===')
  const cfg = await q(
    client,
    `SELECT key, value FROM platform_configs WHERE key IN ('income_wallet_payout_month','working_wallet_payout_month')`
  )
  console.log(cfg)

  console.log('\n=== 2. DISTRIBUTIONS BY MONTH ===')
  const dist = await q(
    client,
    `SELECT period_month, count(*) total, count(paid_out_at) paid, count(income_wallet_transaction_id) with_income_txn,
            round(sum(return_amount)::numeric,2) ret, round(sum(income_amount)::numeric,2) inc, round(sum(gold_amount)::numeric,2) gold
     FROM investment_return_distributions GROUP BY period_month ORDER BY period_month`
  )
  console.log(dist)

  console.log('\n=== 3. INCOME-WALLET RELATED TRANSACTION SUMMARIES ===')
  const txn = async (label, sql) => {
    const rows = await q(client, sql)
    console.log(label, rows[0])
  }
  await txn('June 2026 income credits   :', `SELECT count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at FROM transactions WHERE type='wallet_credit' AND remark LIKE 'Cashback wallet (70%) from investment return for June 2026'`)
  await txn('July 2026 income credits   :', `SELECT count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at FROM transactions WHERE type='wallet_credit' AND remark LIKE 'Cashback wallet (70%) from investment return for July 2026'`)
  await txn('31-day rule correction     :', `SELECT count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at FROM transactions WHERE type='wallet_credit' AND remark LIKE '%31-day rule correction%'`)
  await txn('MLI credits                :', `SELECT count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at FROM transactions WHERE type='wallet_credit' AND remark LIKE 'Membership Level Income %'`)
  await txn('Withdraw debits (cleared)  :', `SELECT count(*) n, round(sum(amount)::numeric,2) total, min(approved_at) first_at, max(approved_at) last_at FROM transactions WHERE type='wallet_debit' AND remark LIKE 'Income wallet (cashback) withdrawal%'`)
  await txn('All wallet_credit total    :', `SELECT count(*) n, round(sum(amount)::numeric,2) total FROM transactions WHERE type='wallet_credit'`)
  await txn('All wallet_debit total     :', `SELECT count(*) n, round(sum(amount)::numeric,2) total FROM transactions WHERE type='wallet_debit'`)

  console.log('\n=== 4. USERS WITH JUNE INCOME CREDIT vs WITHDRAW vs CURRENT BALANCE ===')
  const june = await q(
    client,
    `SELECT u.id, u.name, round(u.income_wallet::numeric,2) current_balance,
            round(j.june_income::numeric,2) june_income, j.june_credit_at,
            round(w.wd_total::numeric,2) withdraw_debit, w.wd_at
     FROM users u
     JOIN (SELECT t.user_id, sum(t.amount) june_income, max(t.approved_at) june_credit_at
           FROM transactions t
           JOIN investment_return_distributions d ON d.income_wallet_transaction_id = t.id
           WHERE d.period_month = '2026-06-01'
           GROUP BY t.user_id) j ON j.user_id = u.id
     LEFT JOIN (SELECT user_id, sum(amount) wd_total, max(approved_at) wd_at
                FROM transactions WHERE type='wallet_debit' AND remark LIKE 'Income wallet (cashback) withdrawal%'
                GROUP BY user_id) w ON w.user_id = u.id
     ORDER BY u.id`
  )
  const juneTotal = june.reduce((s, r) => s + Number(r.june_income || 0), 0)
  const juneLeftoverCandidates = june.filter((r) => Number(r.current_balance) > 0 && !r.withdraw_debit)
  const juneZeroBalance = june.filter((r) => Number(r.current_balance) === 0)
  console.log(`June income users: ${june.length}, total June income credited: ${juneTotal.toFixed(2)}`)
  console.log(`  -> users with withdraw debit: ${june.length - juneZeroBalance.filter(() => true).length}`)
  console.log(`  -> users with NO withdraw debit (candidate leftover): ${juneLeftoverCandidates.length}`)
  for (const r of june) {
    console.log(
      `  ${String(r.id).padEnd(9)} ${String(r.name || '').padEnd(24)} bal=${String(r.current_balance).padStart(10)} june=${String(r.june_income).padStart(10)} juneAt=${String(r.june_credit_at).slice(0, 19)} wd=${String(r.withdraw_debit).padStart(10)} wdAt=${String(r.wd_at || '').slice(0, 19)}`
    )
  }

  console.log('\n=== 5. FULL LEDGER RECONCILIATION (income_wallet vs credits-debits) ===')
  const mismatches = await q(
    client,
    `SELECT u.id, u.name, round(u.income_wallet::numeric,2) stored,
            round(COALESCE(c.credits,0)::numeric,2) credits, round(COALESCE(d.debits,0)::numeric,2) debits,
            round((COALESCE(c.credits,0) - COALESCE(d.debits,0))::numeric,2) computed,
            round((u.income_wallet - (COALESCE(c.credits,0) - COALESCE(d.debits,0)))::numeric,2) diff
     FROM users u
     LEFT JOIN (SELECT user_id, sum(amount) credits FROM transactions WHERE type='wallet_credit' GROUP BY user_id) c ON c.user_id=u.id
     LEFT JOIN (SELECT user_id, sum(amount) debits FROM transactions WHERE type='wallet_debit' GROUP BY user_id) d ON d.user_id=u.id
     WHERE abs(u.income_wallet - (COALESCE(c.credits,0) - COALESCE(d.debits,0))) > 0.005
     ORDER BY abs(u.income_wallet - (COALESCE(c.credits,0) - COALESCE(d.debits,0))) DESC`
  )
  console.log(`Mismatched users: ${mismatches.length}`)
  for (const r of mismatches.slice(0, 50)) {
    console.log(`  ${String(r.id).padEnd(9)} ${String(r.name || '').padEnd(24)} stored=${String(r.stored).padStart(11)} credits=${String(r.credits).padStart(11)} debits=${String(r.debits).padStart(11)} computed=${String(r.computed).padStart(11)} diff=${r.diff}`)
  }

  console.log('\n=== 6. USERS WITH income_wallet > 0 (all, incl. MLI) ===')
  const positive = await q(
    client,
    `SELECT count(*) n, round(sum(income_wallet)::numeric,2) total FROM users WHERE role != 'admin' AND income_wallet > 0`
  )
  console.log(positive)
  const posRows = await q(
    client,
    `SELECT u.id, u.name, round(u.income_wallet::numeric,2) bal,
            (SELECT round(sum(amount)::numeric,2) FROM transactions WHERE user_id=u.id AND type='wallet_credit' AND remark LIKE 'Membership Level Income %') mli,
            (SELECT round(sum(amount)::numeric,2) FROM transactions WHERE user_id=u.id AND type='wallet_credit' AND remark LIKE 'Cashback wallet (70%) from investment return for July 2026') july_income,
            (SELECT round(sum(amount)::numeric,2) FROM transactions WHERE user_id=u.id AND type='wallet_credit' AND remark LIKE 'Cashback wallet (70%) from investment return for June 2026') june_income,
            (SELECT round(sum(amount)::numeric,2) FROM transactions WHERE user_id=u.id AND type='wallet_credit' AND remark LIKE '%31-day rule correction%') july_topup
     FROM users u WHERE role != 'admin' AND income_wallet > 0 ORDER BY income_wallet DESC LIMIT 60`
  )
  for (const r of posRows) {
    console.log(`  ${String(r.id).padEnd(9)} ${String(r.name || '').padEnd(24)} bal=${String(r.bal).padStart(11)} mli=${String(r.mli).padStart(10)} july=${String(r.july_income).padStart(10)} june=${String(r.june_income).padStart(10)} topup=${String(r.july_topup).padStart(9)}`)
  }

  console.log('\n=== 7. WITHDRAWLS (investment_income) ===')
  const wd = await q(
    client,
    `SELECT status, count(*) n, round(sum(amount)::numeric,2) total FROM withdrawls WHERE type='investment_income' GROUP BY status`
  )
  console.log(wd)

  console.log('\n=== 8. MONTHLY INCOME SNAPSHOTS (working payout) ===')
  const snap = await q(
    client,
    `SELECT month, count(*) total, count(paid_out_at) paid, round(sum(gross_amount)::numeric,2) gross, round(sum(income_wallet_amount)::numeric,2) inc, round(sum(repurchase_wallet_amount)::numeric,2) repur
     FROM monthly_income_snapshots GROUP BY month ORDER BY month`
  )
  console.log(snap)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

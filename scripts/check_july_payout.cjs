const { Client } = require('pg')
require('dotenv').config()

// July 2026 payout check (read-only) for all eligible users.
// For every user with income_wallet > 0 OR with any July/MLI income:
//   expected = July distribution income (rule-B, ALREADY includes top-ups)
//            + MLI credits   (do NOT add top-ups separately - rows were updated
//              to rule-B which equals original credit + top-up)
//   leftover = stored - expected  (should be 0; June leftovers show as > 0)

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // July period distributions (paid, income side, rule-B stored values)
  const july = await client.query(
    `SELECT d.user_id, SUM(d.income_amount)::float AS july_income
     FROM investment_return_distributions d
     WHERE d.period_month = '2026-07-01' AND d.paid_out_at IS NOT NULL
     GROUP BY d.user_id`
  )

  // July top-ups (31-day rule correction, income side)
  const topups = await client.query(
    `SELECT user_id, SUM(amount)::float AS topup_income
     FROM transactions
     WHERE type = 'wallet_credit'
       AND remark LIKE 'Cashback wallet top-up (70%) for July 2026%'
     GROUP BY user_id`
  )

  // MLI credits (one-time membership level income)
  const mli = await client.query(
    `SELECT user_id, SUM(amount)::float AS mli_total, COUNT(*)::int AS mli_count
     FROM transactions
     WHERE type = 'wallet_credit' AND remark LIKE 'Membership Level Income %'
     GROUP BY user_id`
  )

  const julyMap = new Map(july.rows.map((r) => [r.user_id, Number(r.july_income)]))
  const topupMap = new Map(topups.rows.map((r) => [r.user_id, Number(r.topup_income)]))
  const mliMap = new Map(mli.rows.map((r) => [r.user_id, { total: Number(r.mli_total), count: r.mli_count }]))

  const allIds = new Set([...julyMap.keys(), ...topupMap.keys(), ...mliMap.keys()])

  const users = await client.query(
    `SELECT id, name, income_wallet FROM users WHERE id = ANY($1::int[])`,
    [[...allIds]]
  )
  const balMap = new Map(users.rows.map((r) => [r.id, { name: r.name, bal: Number(r.income_wallet) }]))

  console.log('=== JULY 2026 PAYOUT + MLI CHECK (all eligible users) ===')
  console.log(
    'user_id | name | july | topup(info) | mli | expected | stored | leftover'
  )

  let totJuly = 0, totTopup = 0, totMli = 0, totExpected = 0, totStored = 0
  const flagged = []

  for (const id of [...allIds].sort((a, b) => a - b)) {
    const j = julyMap.get(id) || 0
    const t = topupMap.get(id) || 0
    const m = mliMap.get(id)?.total || 0
    const expected = j + m // topups are already inside the July row value
    const u = balMap.get(id)
    if (!u) {
      flagged.push({ id, expected, stored: null, diff: null, name: 'NO USER ROW' })
      continue
    }
    const stored = u.bal
    const diff = Math.round((stored - expected) * 100) / 100
    totJuly += j; totTopup += t; totMli += m; totExpected += expected; totStored += stored
    const flag = Math.abs(diff) > 0.01
    console.log(
      `#${id} | ${(u.name || '').padEnd(20)} | ${j.toFixed(2).padStart(9)} | ${t.toFixed(2).padStart(10)} | ${m.toFixed(2).padStart(8)} | ${expected.toFixed(2).padStart(10)} | ${stored.toFixed(2).padStart(10)} | ${diff.toFixed(2).padStart(9)}${flag ? '   <-- FLAG' : ''}`
    )
    if (flag) flagged.push({ id, name: u.name, expected, stored, diff })
  }

  console.log('\n=== TOTALS ===')
  console.log(
    `July income ${totJuly.toFixed(2)} | top-up ${totTopup.toFixed(2)} | MLI ${totMli.toFixed(2)} | expected ${totExpected.toFixed(2)} | stored ${totStored.toFixed(2)} | diff ${(totStored - totExpected).toFixed(2)}`
  )
  console.log(`\nFlagged (diff > 0.01): ${flagged.length}`)
  for (const f of flagged) {
    console.log(`  #${f.id} ${f.name || ''} expected ${f.expected?.toFixed(2)} stored ${f.stored?.toFixed(2)} diff ${f.diff?.toFixed(2)}`)
  }

  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})

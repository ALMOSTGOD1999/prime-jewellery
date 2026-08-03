const { Client } = require('pg')
const fs = require('fs')
require('dotenv').config()

const outFile = 'scripts/july_payout_out.txt'
fs.writeFileSync(outFile, '')
const log = (...a) => {
  fs.appendFileSync(outFile, a.join(' ') + '\n')
  console.log(...a)
}

const ids = [
  63896, 67819, 139063, 150228, 245303, 278356, 331062, 499862, 533697, 617173, 644117, 698847,
  698875, 722361, 776339, 780949, 932914, 5937652, 7943738, 884535, 236641, 18168, 426687, 165958,
  295975,
]

const fmt = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // 1. Payout month configs
  const cfg = await client.query(
    `SELECT key, value, updated_at FROM platform_configs
     WHERE key IN ('income_wallet_payout_month', 'working_wallet_payout_month')`
  )
  log('\n=== PAYOUT CONFIG (platform_configs) ===')
  for (const c of cfg.rows) {
    log(`${c.key} = ${c.value}  (updated ${c.updated_at})`)
  }

  // 2. Users
  const users = await client.query(
    `SELECT id, name, status, income_wallet, working_wallet, repurchase_wallet
     FROM users WHERE id = ANY($1)`,
    [ids]
  )
  const userMap = new Map(users.rows.map((u) => [u.id, u]))
  log(`\n=== USERS FOUND: ${users.rows.length}/${ids.length} ===`)

  // 3. July investment return distributions (income/cashback payout)
  const dists = await client.query(
    `SELECT * FROM investment_return_distributions
     WHERE user_id = ANY($1) AND period_month = '2026-07-01'
     ORDER BY user_id`,
    [ids]
  )
  const distMap = new Map()
  for (const d of dists.rows) {
    if (!distMap.has(d.user_id)) distMap.set(d.user_id, [])
    distMap.get(d.user_id).push(d)
  }

  // 4. July monthly income snapshots (working payout)
  const snaps = await client.query(
    `SELECT * FROM monthly_income_snapshots
     WHERE user_id = ANY($1) AND month = '2026-07-01'
     ORDER BY user_id`,
    [ids]
  )
  const snapMap = new Map()
  for (const s of snaps.rows) {
    if (!snapMap.has(s.user_id)) snapMap.set(s.user_id, [])
    snapMap.get(s.user_id).push(s)
  }

  // 5. July wallet credit transactions
  const txns = await client.query(
    `SELECT id, user_id, amount, remark, approved_at, created_at
     FROM transactions
     WHERE user_id = ANY($1) AND type = 'wallet_credit'
       AND remark ILIKE '%July 2026%'
     ORDER BY user_id, created_at`,
    [ids]
  )
  const txnMap = new Map()
  for (const t of txns.rows) {
    if (!txnMap.has(t.user_id)) txnMap.set(t.user_id, [])
    txnMap.get(t.user_id).push(t)
  }

  // 6. July wallet debit / reversal transactions
  const debits = await client.query(
    `SELECT id, user_id, amount, remark, approved_at, created_at
     FROM transactions
     WHERE user_id = ANY($1) AND type = 'wallet_debit'
       AND (remark ILIKE '%July 2026%' OR remark ILIKE '%REVERSAL%')
     ORDER BY user_id, created_at`,
    [ids]
  )
  const debitMap = new Map()
  for (const d of debits.rows) {
    if (!debitMap.has(d.user_id)) debitMap.set(d.user_id, [])
    debitMap.get(d.user_id).push(d)
  }

  log('\n=== PER-USER JULY 2026 PAYOUT STATUS ===')
  for (const id of ids) {
    const u = userMap.get(id)
    const name = u ? u.name : '(NOT FOUND)'
    log(`\nPJ${String(id).padStart(6, '0')}  ${name}`)
    if (!u) continue

    const userDists = distMap.get(id) || []
    const userSnaps = snapMap.get(id) || []
    const userTxns = txnMap.get(id) || []
    const userDebits = debitMap.get(id) || []

    if (userDists.length === 0) {
      log('  Income (cashback)  : NO distribution record for July 2026')
    } else {
      for (const d of userDists) {
        const paid = d.paid_out_at ? 'PAID' : 'NOT PAID'
        log(
          `  Income (cashback)  : ${paid} — return ₹${fmt(d.return_amount)} → income ₹${fmt(d.income_amount)} + gold ₹${fmt(d.gold_amount)}` +
            (d.paid_out_at ? ` at ${d.paid_out_at}` : '')
        )
      }
    }

    if (userSnaps.length === 0) {
      log('  Working wallet     : NO snapshot record for July 2026')
    } else {
      for (const s of userSnaps) {
        const paid = s.paid_out_at ? 'PAID' : 'NOT PAID'
        log(
          `  Working wallet     : ${paid} — gross ₹${fmt(s.gross_amount)} → income ₹${fmt(s.income_wallet_amount)} + repurchase ₹${fmt(s.repurchase_wallet_amount)}` +
            (s.paid_out_at ? ` at ${s.paid_out_at}` : '')
        )
      }
    }

    if (userTxns.length === 0) {
      log('  Wallet credits     : NONE for July 2026')
    } else {
      for (const t of userTxns) {
        log(
          `  Wallet credit      : +₹${fmt(t.amount)}  txn#${t.id}  "${t.remark}"  (${t.created_at})`
        )
      }
    }

    if (userDebits.length === 0) {
      log('  Wallet debits/rev  : NONE for July 2026')
    } else {
      for (const t of userDebits) {
        log(
          `  Wallet debit/rev   : -₹${fmt(t.amount)}  txn#${t.id}  "${t.remark}"  (${t.created_at})`
        )
      }
    }

    log(
      `  Balances           : income ₹${fmt(u.income_wallet)} | working ₹${fmt(u.working_wallet)} | repurchase ₹${fmt(u.repurchase_wallet)}`
    )
  }

  await client.end()
}

main().catch((e) => {
  log('ERROR:', e.message)
  process.exit(1)
})

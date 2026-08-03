const { Client } = require('pg')
const fs = require('fs')
require('dotenv').config()

const outFile = 'scripts/cashback_check_out.txt'
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

  // ── A. SYSTEM-WIDE: all July 2026 distributions ─────────────────────────
  const dists = await client.query(
    `SELECT d.id, d.user_id, u.name, u.status AS user_status,
            d.investment_id, d.return_amount, d.income_amount, d.gold_amount,
            d.paid_out_at, d.income_wallet_transaction_id, d.gold_transaction_id
     FROM investment_return_distributions d
     JOIN users u ON u.id = d.user_id
     WHERE d.period_month = '2026-07-01'
     ORDER BY d.user_id`
  )
  log(`\n========== SYSTEM-WIDE JULY 2026 DISTRIBUTIONS: ${dists.rows.length} ==========`)

  const unpaid = dists.rows.filter((d) => !d.paid_out_at)
  log(`unpaid (paid_out_at IS NULL): ${unpaid.length}`)
  for (const d of unpaid) {
    log(`  UNPAID dist#${d.id} user=${d.user_id} ${d.name} income=${d.income_amount}`)
  }

  // Check paid distributions for missing/mismatched transaction links
  let linkIssues = 0
  const txnsById = new Map()
  for (const d of dists.rows.filter((d) => d.paid_out_at)) {
    const idCheck = [d.income_wallet_transaction_id, d.gold_transaction_id]
    for (const tId of idCheck) {
      if (tId) {
        if (!txnsById.has(tId)) {
          const t = (
            await client.query(
              `SELECT id, user_id, type, amount, remark, created_at FROM transactions WHERE id = $1`,
              [tId]
            )
          ).rows[0]
          if (t) txnsById.set(tId, t)
          else {
            log(
              `  LINK MISSING: dist#${d.id} user=${d.user_id} references txn ${tId} which does NOT exist`
            )
            linkIssues++
          }
        }
      }
    }
    // income wallet transaction amount should equal income_amount
    const it = txnsById.get(d.income_wallet_transaction_id)
    if (d.income_wallet_transaction_id && it) {
      if (Number(it.amount) !== Number(d.income_amount)) {
        log(
          `  AMOUNT MISMATCH: dist#${d.id} user=${d.user_id} ${d.name} income_amount=${d.income_amount} vs txn#${it.id} amount=${it.amount}`
        )
        linkIssues++
      }
      if (it.type !== 'wallet_credit') {
        log(`  TYPE ISSUE: dist#${d.id} income txn#${it.id} type=${it.type}`)
        linkIssues++
      }
    }
    const gt = txnsById.get(d.gold_transaction_id)
    if (d.gold_transaction_id && gt) {
      if (Number(gt.amount) !== Number(d.gold_amount)) {
        log(
          `  GOLD MISMATCH: dist#${d.id} user=${d.user_id} gold_amount=${d.gold_amount} vs txn#${gt.id} amount=${gt.amount}`
        )
        linkIssues++
      }
      if (gt.type !== 'wallet_credit') {
        log(`  TYPE ISSUE: dist#${d.id} gold txn#${gt.id} type=${gt.type}`)
        linkIssues++
      }
    }
  }
  log(`distribution link/amount issues: ${linkIssues}`)

  // ── B. SYSTEM-WIDE: all July cashback + repurchase credits & reversals ───
  const julyTxns = await client.query(
    `SELECT id, user_id, type, amount, remark, created_at
     FROM transactions
     WHERE (remark ILIKE '%Cashback wallet (70%) from investment return for July 2026%'
            OR remark ILIKE '%Repurchase wallet (20%) from investment return for July 2026%'
            OR remark ILIKE '%REVERSAL: July 2026 cashback payout%'
            OR remark ILIKE '%REVERSAL: July 2026 repurchase payout%')
     ORDER BY user_id, created_at`
  )
  log(
    `\n========== ALL JULY CASHBACK/REPURCHASE TXNS (credits + reversals): ${julyTxns.rows.length} ==========`
  )

  // net per user
  const net = new Map()
  for (const t of julyTxns.rows) {
    if (!net.has(t.user_id)) net.set(t.user_id, { cashback: 0, repurchase: 0 })
    const sign = t.type === 'wallet_credit' ? 1 : -1
    const r = t.remark || ''
    if (/Cashback wallet \(70%\)/.test(r) || /REVERSAL: July 2026 cashback payout/.test(r))
      net.get(t.user_id).cashback += sign * Number(t.amount)
    if (/Repurchase wallet \(20%\)/.test(r) || /REVERSAL: July 2026 repurchase payout/.test(r))
      net.get(t.user_id).repurchase += sign * Number(t.amount)
  }

  // expected per user from distributions
  const expected = new Map()
  for (const d of dists.rows) {
    if (!expected.has(d.user_id)) expected.set(d.user_id, { income: 0, gold: 0 })
    expected.get(d.user_id).income += Number(d.income_amount)
    expected.get(d.user_id).gold += Number(d.gold_amount)
  }

  log('\n--- NET vs EXPECTED (all users who got July distributions) ---')
  let netOk = true
  const allUserIds = new Set([...net.keys(), ...expected.keys()])
  for (const uid of [...allUserIds].sort((a, b) => a - b)) {
    const e = expected.get(uid) || { income: 0, gold: 0 }
    const n = net.get(uid) || { cashback: 0, repurchase: 0 }
    const ok = Math.abs(e.income - n.cashback) < 0.01 && Math.abs(e.gold - n.repurchase) < 0.01
    if (!ok) netOk = false
    log(
      `  PJ${String(uid).padStart(6, '0')}: expected cashback=${fmt(e.income)} gold=${fmt(e.gold)} | net credited cashback=${fmt(n.cashback)} repurchase=${fmt(n.repurchase)} ${ok ? 'OK' : '*** MISMATCH ***'}`
    )
  }
  log(`\nnet-vs-expected all OK: ${netOk}`)

  // ── C. THE 25 LISTED USERS ────────────────────────────────────────────────
  log('\n========== LISTED 25 USERS: JULY CASHBACK VERIFICATION ==========')
  for (const id of ids) {
    const u = (
      await client.query('SELECT id, name, status, income_wallet FROM users WHERE id = $1', [id])
    ).rows[0]
    if (!u) {
      log(`\nPJ${String(id).padStart(6, '0')}  NOT FOUND`)
      continue
    }
    const myDists = dists.rows.filter((d) => d.user_id === id)
    const expIncome = myDists.reduce((s, d) => s + Number(d.income_amount), 0)
    const myTxns = julyTxns.rows.filter((t) => t.user_id === id)
    let netCash = 0
    for (const t of myTxns) {
      const r = t.remark || ''
      if (/Cashback wallet \(70%\)/.test(r) || /REVERSAL: July 2026 cashback payout/.test(r))
        netCash += (t.type === 'wallet_credit' ? 1 : -1) * Number(t.amount)
    }
    const ok = Math.abs(expIncome - netCash) < 0.01
    log(
      `\nPJ${String(id).padStart(6, '0')}  ${u.name} (${u.status}) — expected cashback ₹${fmt(expIncome)}, net credited ₹${fmt(netCash)} → ${ok ? 'OK' : '*** MISMATCH ***'}`
    )
    for (const t of myTxns) {
      if (/Cashback wallet|REVERSAL: July 2026 cashback/.test(t.remark || '')) {
        log(
          `    ${t.type} ${t.amount > 0 ? '+' : ''}₹${fmt(t.amount)}  txn#${t.id}  "${t.remark}"  (${t.created_at})`
        )
      }
    }
    log(`    current income wallet balance: ₹${fmt(u.income_wallet)}`)
  }

  await client.end()
}

main().catch((e) => {
  log('ERROR:', e.message)
  process.exit(1)
})

const { Client } = require('pg')
const { createId } = require('@paralleldrive/cuid2')
require('dotenv').config()

// Wipes the June 2026 investment-return income that the admin's "Withdraw"
// button should have cleared but never did (withdrawAllIncome has never run:
// 0 'payout cleared by admin' debits exist).
//
// For each June-period distribution (paid, with income_wallet_transaction_id):
//   - debit exactly the stored June income amount (from the ORIGINAL credit txn)
//   - decrement users.income_wallet
//   - wallet_debit remark references the original credit txn (reversal convention)
//
// Guards:
//   - idempotent: skip if a wallet_debit with the wipe remark for that orig txn exists
//   - safety: skip + flag if current income_wallet < june amount
// Only the 70% income side is touched (matches admin withdraw behaviour;
// repurchase/gold wallet untouched). July + MLI + top-up money preserved.

const APPLY = process.argv.includes('--apply')
const PHASE2 = process.argv.includes('--phase2')
const PERIOD = '2026-06-01' // June 2026 (IST)

// Phase 2 clears the DUPLICATE June credit (the original distribution txn was
// wiped in phase 1; the duplicate copy remains in the wallet). Distinct remark +
// guard so phase-1's idempotency check does not skip these users.
const REMARK_PREFIX = PHASE2
  ? 'WIPE2: June 2026 duplicate investment return cleared'
  : 'WIPE: June 2026 investment return cleared'
const GUARD_LIKE = PHASE2
  ? '%June 2026 duplicate investment return cleared (orig txn #'
  : '%June 2026 investment return cleared (orig txn #'

const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log(
    `MODE: ${APPLY ? 'APPLY (writes DB)' : 'DRY RUN (no writes)'} | PHASE: ${PHASE2 ? 2 : 1}`
  )

  // ---------- Load June-period paid distributions + original credit amounts ----------
  const res = await client.query(
    `SELECT d.id AS dist_id, d.user_id, u.name,
            d.income_wallet_transaction_id AS txn_id,
            t.amount AS june_amount,
            u.income_wallet AS current_balance
     FROM investment_return_distributions d
     JOIN users u ON u.id = d.user_id
     JOIN transactions t ON t.id = d.income_wallet_transaction_id
     WHERE d.period_month = $1
       AND d.paid_out_at IS NOT NULL
       AND d.income_wallet_transaction_id IS NOT NULL
     ORDER BY d.user_id`,
    [PERIOD]
  )
  console.log(`\n=== JUNE 2026 PERIOD: ${res.rows.length} paid distribution(s) ===`)

  // ---------- Idempotency + balance guards ----------
  const toWipe = []
  let alreadyWiped = 0
  let balanceShort = 0
  for (const row of res.rows) {
    const guard = await client.query(
      `SELECT 1 FROM transactions
       WHERE type = 'wallet_debit'
         AND remark LIKE $1
       LIMIT 1`,
      [`${GUARD_LIKE}${row.txn_id})%`]
    )
    if (guard.rowCount > 0) {
      alreadyWiped++
      console.log(`  SKIP #${row.user_id} ${row.name} — already wiped (orig txn #${row.txn_id})`)
      continue
    }
    if (Number(row.current_balance) < Number(row.june_amount)) {
      balanceShort++
      console.log(
        `  FLAG #${row.user_id} ${row.name} — balance ${fmt(row.current_balance)} < June ${fmt(row.june_amount)} (skip)`
      )
      continue
    }
    toWipe.push(row)
  }

  const totalWipe = toWipe.reduce((s, r) => s + Number(r.june_amount), 0)

  console.log(`\n=== TO WIPE: ${toWipe.length} user(s), total ${fmt(totalWipe)} ===`)
  for (const r of toWipe) {
    console.log(
      `  #${r.user_id} ${r.name.padEnd(24)} June ${fmt(r.june_amount).padStart(12)}  balance ${fmt(r.current_balance).padStart(12)}  orig txn #${r.txn_id}`
    )
  }
  console.log(`\n  already wiped: ${alreadyWiped} | balance short (skipped): ${balanceShort}`)

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write (single transaction).')
    await client.end()
    return
  }

  if (toWipe.length === 0) {
    console.log('\nNothing to wipe. Exiting without writes.')
    await client.end()
    return
  }

  // ---------- Apply: one transaction ----------
  try {
    await client.query('BEGIN')
    for (const r of toWipe) {
      const txnId = createId()
      const remark = `${REMARK_PREFIX} (orig txn #${r.txn_id}) - withdraw effect`
      await client.query(
        `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'wallet_debit', $4, NOW(), NOW(), NOW())`,
        [txnId, r.user_id, r.june_amount, remark]
      )
      await client.query(
        `UPDATE users SET income_wallet = income_wallet - $2, updated_at = NOW() WHERE id = $1`,
        [r.user_id, r.june_amount]
      )
    }
    await client.query('COMMIT')
    console.log(`\nAPPLIED: ${toWipe.length} June wipe(s), total ${fmt(totalWipe)}`)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('\nROLLED BACK:', e.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

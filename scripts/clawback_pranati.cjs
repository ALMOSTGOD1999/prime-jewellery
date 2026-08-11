const { Client } = require('pg')
const { DateTime } = require('luxon')
const { createId } = require('@paralleldrive/cuid2')
require('dotenv').config()

const APPLY = process.argv.includes('--apply')
const ADMIN_ID = 2511245
const USER_ID = 617173 // Pranati Baidya
const PERIOD = '2026-07-01'

const roundMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100

// Rule-B recompute (same logic as apply_rule_b.cjs / investment_service.ts)
function ruleB(investment) {
  const startedAt = DateTime.fromJSDate(investment.started_at, { zone: 'utc' })
    .setZone('Asia/Kolkata')
    .startOf('day')
  const monthStart = DateTime.fromISO(PERIOD).startOf('month').setZone('Asia/Kolkata')
  const monthEnd = monthStart.endOf('month').startOf('day')
  const daysInMonth = monthEnd.day
  const activeDays = Math.min(monthEnd.diff(startedAt, 'days').days + 1, daysInMonth)
  const prorateFactor = Math.max(activeDays, 1) / 30
  const amount = Number(investment.amount)
  const rate = Number(investment.monthly_return_rate) || 3
  const returnAmount = roundMoney((amount * rate * prorateFactor) / 100)
  const incomeAmount = roundMoney((returnAmount * 70) / 100)
  const goldAmount = roundMoney((returnAmount * 20) / 100)
  return { returnAmount, incomeAmount, goldAmount }
}

const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log(`MODE: ${APPLY ? 'APPLY (writes DB)' : 'DRY RUN (no writes)'}`)

  // 1. Load Pranati's July distribution + investment + current wallets
  const dist = await client.query(
    `SELECT d.id, d.return_amount, d.income_amount, d.gold_amount,
            d.income_wallet_transaction_id, d.gold_transaction_id,
            i.amount, i.monthly_return_rate, i.started_at,
            u.income_wallet, u.repurchase_wallet
     FROM investment_return_distributions d
     JOIN investments i ON i.id = d.investment_id
     JOIN users u ON u.id = d.user_id
     WHERE d.user_id = $1 AND d.period_month = $2`,
    [USER_ID, PERIOD]
  )
  if (dist.rows.length !== 1) {
    console.error(`ERROR: expected exactly 1 distribution row, found ${dist.rows.length}`)
    await client.end()
    process.exit(1)
  }
  const d = dist.rows[0]

  const exp = ruleB(d)
  const stored = {
    returnAmount: Number(d.return_amount),
    incomeAmount: Number(d.income_amount),
    goldAmount: Number(d.gold_amount),
  }
  const claw = {
    income: roundMoney(stored.incomeAmount - exp.incomeAmount),
    gold: roundMoney(stored.goldAmount - exp.goldAmount),
  }

  console.log(`\nDistribution #${d.id} (Pranati Baidya, PJ617173, period ${PERIOD}):`)
  console.log(`  stored : return ${fmt(stored.returnAmount)} | income ${fmt(stored.incomeAmount)} | gold ${fmt(stored.goldAmount)}`)
  console.log(`  rule-B : return ${fmt(exp.returnAmount)} | income ${fmt(exp.incomeAmount)} | gold ${fmt(exp.goldAmount)}`)
  console.log(`  clawback: income -${fmt(claw.income)} | gold -${fmt(claw.gold)}`)
  console.log(`  wallets: income ${fmt(d.income_wallet)} | repurchase ${fmt(d.repurchase_wallet)}`)
  console.log(`  orig txns: income #${d.income_wallet_transaction_id} | gold #${d.gold_transaction_id}`)

  // 2. Guards
  const errors = []
  if (claw.income !== 11764.67 || claw.gold !== 3361.33) {
    errors.push(`Unexpected clawback deltas (income ${claw.income}, gold ${claw.gold}) - aborting`)
  }
  if (stored.returnAmount !== 24040 || stored.incomeAmount !== 16828 || stored.goldAmount !== 4808) {
    errors.push('Distribution row no longer has the original paid amounts - possible double-clawback, aborting')
  }
  if (Number(d.income_wallet) < claw.income) {
    errors.push(`income_wallet ${fmt(d.income_wallet)} < clawback ${fmt(claw.income)} - cannot cover`)
  }
  if (Number(d.repurchase_wallet) < claw.gold) {
    errors.push(`repurchase_wallet ${fmt(d.repurchase_wallet)} < clawback ${fmt(claw.gold)} - cannot cover`)
  }
  if (errors.length) {
    for (const e of errors) console.error(`GUARD: ${e}`)
    await client.end()
    process.exit(1)
  }

  if (!APPLY) {
    console.log('\nDry run complete - all guards passed. Re-run with --apply to write.')
    await client.end()
    return
  }

  // 3. Apply: wallet debits + wallet decrements + row reversal + audit log, in one txn
  const nowSql = new Date().toISOString()
  const auditId = (await client.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM audit_logs`)).rows[0].next_id

  try {
    await client.query('BEGIN')

    // Income clawback
    const incTxnId = createId()
    const incRemark = `REVERSAL: July 2026 cashback overpayment (orig txn #${d.income_wallet_transaction_id}) - 31-day rule clawback`
    await client.query(
      `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'wallet_debit', $4, $5, $5, $5)`,
      [incTxnId, USER_ID, claw.income, incRemark, nowSql]
    )
    await client.query(
      `UPDATE users SET income_wallet = income_wallet - $2, updated_at = $3 WHERE id = $1`,
      [USER_ID, claw.income, nowSql]
    )

    // Gold clawback
    const goldTxnId = createId()
    const goldRemark = `REVERSAL: July 2026 repurchase overpayment (orig txn #${d.gold_transaction_id}) - 31-day rule clawback`
    await client.query(
      `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'wallet_debit', $4, $5, $5, $5)`,
      [goldTxnId, USER_ID, claw.gold, goldRemark, nowSql]
    )
    await client.query(
      `UPDATE users SET repurchase_wallet = repurchase_wallet - $2, updated_at = $3 WHERE id = $1`,
      [USER_ID, claw.gold, nowSql]
    )

    // Reverse distribution row to rule-B
    await client.query(
      `UPDATE investment_return_distributions
       SET return_amount = $2, income_amount = $3, gold_amount = $4, updated_at = $5
       WHERE id = $1`,
      [d.id, exp.returnAmount, exp.incomeAmount, exp.goldAmount, nowSql]
    )

    // Audit trail
    await client.query(
      `INSERT INTO audit_logs (id, entity_type, entity_id, field, old_value, new_value, changed_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        auditId,
        'investment_return_distribution',
        d.id,
        'rule_b_clawback',
        `return=${stored.returnAmount},income=${stored.incomeAmount},gold=${stored.goldAmount}`,
        `return=${exp.returnAmount},income=${exp.incomeAmount},gold=${exp.goldAmount}`,
        ADMIN_ID,
        '31-day rule clawback for July 2026 overpayment (user approved clawback)',
        nowSql,
      ]
    )

    await client.query('COMMIT')
    console.log(`\nAPPLIED: dist#${d.id} reversed to rule-B; income -${fmt(claw.income)} (txn ${incTxnId}); gold -${fmt(claw.gold)} (txn ${goldTxnId}); audit_logs#${auditId}.`)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('ERROR (rolled back):', e.message)
    process.exit(1)
  }

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

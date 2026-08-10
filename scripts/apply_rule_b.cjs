const { Client } = require('pg')
const { DateTime } = require('luxon')
const { createId } = require('@paralleldrive/cuid2')
require('dotenv').config()

const APPLY = process.argv.includes('--apply')
const ADMIN_ID = 2511245
// Pranati Baidya - July overpayment (24040 paid vs rule-B 7233.33) is an OPEN
// clawback decision; her July row is skipped until the user decides.
const SKIP_JULY_USER_ID = 617173

const roundMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100

function ruleB(investment, period) {
  const startedAt = DateTime.fromJSDate(investment.started_at, { zone: 'utc' })
    .setZone('Asia/Kolkata')
    .startOf('day')
  const monthStart = DateTime.fromISO(period).startOf('month').setZone('Asia/Kolkata')
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
  if (APPLY) {
    console.log(`  adminId: ${ADMIN_ID} | skipping July user ${SKIP_JULY_USER_ID} (Pranati, clawback open)`)
  }

  // ---------- AUGUST 2026: direct row updates (unpaid, no transactions) ----------
  const aug = await client.query(
    `SELECT d.id, d.user_id, d.return_amount, d.income_amount, d.gold_amount, d.paid_out_at, u.name,
            i.amount, i.monthly_return_rate, i.started_at
     FROM investment_return_distributions d
     JOIN users u ON u.id = d.user_id
     JOIN investments i ON i.id = d.investment_id
     WHERE d.period_month = '2026-08-01'`
  )
  console.log(`\n=== AUGUST 2026 (${aug.rows.length} unpaid rows - update rows only) ===`)
  let augUpdates = 0
  const augRows = []
  for (const d of aug.rows) {
    const exp = ruleB(d, '2026-08-01')
    const changed =
      exp.returnAmount !== Number(d.return_amount) ||
      exp.incomeAmount !== Number(d.income_amount) ||
      exp.goldAmount !== Number(d.gold_amount)
    if (!changed) continue
    augUpdates++
    augRows.push([d.id, exp.returnAmount, exp.incomeAmount, exp.goldAmount])
    console.log(
      `  dist#${d.id} PJ${String(d.user_id).padStart(6, '0')} ${d.name.padEnd(20)} ` +
        `return ${fmt(d.return_amount)}->${fmt(exp.returnAmount)} | income ${fmt(d.income_amount)}->${fmt(exp.incomeAmount)} | gold ${fmt(d.gold_amount)}->${fmt(exp.goldAmount)}`
    )
  }
  console.log(`August: ${augUpdates} row(s) to update`)

  // ---------- JULY 2026: paid rows - top-up credits + row updates ----------
  const jul = await client.query(
    `SELECT d.id, d.user_id, d.return_amount, d.income_amount, d.gold_amount, d.paid_out_at, u.name,
            i.amount, i.monthly_return_rate, i.started_at
     FROM investment_return_distributions d
     JOIN users u ON u.id = d.user_id
     JOIN investments i ON i.id = d.investment_id
     WHERE d.period_month = '2026-07-01'`
  )
  console.log(`\n=== JULY 2026 (${jul.rows.length} paid rows - top-up credits + row updates) ===`)
  let julChanges = 0
  const julRows = []
  for (const d of jul.rows) {
    const exp = ruleB(d, '2026-07-01')
    const dInc = roundMoney(exp.incomeAmount - Number(d.income_amount))
    const dGold = roundMoney(exp.goldAmount - Number(d.gold_amount))
    const changed = dInc !== 0 || dGold !== 0
    if (!changed) continue
    if (d.user_id === SKIP_JULY_USER_ID) {
      console.log(
        `  SKIP PJ${String(d.user_id).padStart(6, '0')} ${d.name.padEnd(20)} (clawback decision open) - paid income ${fmt(d.income_amount)}, rule-B ${fmt(exp.incomeAmount)}`
      )
      continue
    }
    julChanges++
    julRows.push({ distId: d.id, userId: d.user_id, name: d.name, exp, dInc, dGold })
    console.log(
      `  dist#${d.id} PJ${String(d.user_id).padStart(6, '0')} ${d.name.padEnd(20)} ` +
        `+income ${fmt(dInc)} | +gold ${fmt(dGold)} | return ${fmt(d.return_amount)}->${fmt(exp.returnAmount)}`
    )
  }
  console.log(`July: ${julChanges} user(s) to top-up`)

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write.')
    await client.end()
    return
  }

  // ---------- APPLY ----------
  const nowSql = new Date().toISOString()

  try {
    await client.query('BEGIN')

    // August: update rows
    for (const [id, ret, inc, gold] of augRows) {
      await client.query(
        `UPDATE investment_return_distributions
         SET return_amount = $2, income_amount = $3, gold_amount = $4, updated_at = $5
         WHERE id = $1`,
        [id, ret, inc, gold, nowSql]
      )
    }

    // July: update rows + create top-up wallet credits
    for (const r of julRows) {
      // Distribution row -> rule-B amounts
      await client.query(
        `UPDATE investment_return_distributions
         SET return_amount = $2, income_amount = $3, gold_amount = $4, updated_at = $5
         WHERE id = $1`,
        [r.distId, r.exp.returnAmount, r.exp.incomeAmount, r.exp.goldAmount, nowSql]
      )

      // Top-up transactions (same convention as WalletService: wallet_credit,
      // approved_at = now, cuid-style id)
      if (r.dInc !== 0) {
        const txnId = createId()
        const remark = `Cashback wallet top-up (70%) for July 2026 investment return - 31-day rule correction`
        await client.query(
          `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'wallet_credit', $4, $5, $5, $5)`,
          [txnId, r.userId, r.dInc, remark, nowSql]
        )
        await client.query(
          `UPDATE users SET income_wallet = income_wallet + $2, updated_at = $3 WHERE id = $1`,
          [r.userId, r.dInc, nowSql]
        )
      }
      if (r.dGold !== 0) {
        const txnId = createId()
        const remark = `Repurchase wallet top-up (20%) for July 2026 investment return - 31-day rule correction`
        await client.query(
          `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'wallet_credit', $4, $5, $5, $5)`,
          [txnId, r.userId, r.dGold, remark, nowSql]
        )
        await client.query(
          `UPDATE users SET repurchase_wallet = repurchase_wallet + $2, updated_at = $3 WHERE id = $1`,
          [r.userId, r.dGold, nowSql]
        )
      }
    }

    await client.query('COMMIT')
    console.log(`\nAPPLIED: ${augUpdates} August row(s), ${julChanges} July user(s) topped up.`)
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

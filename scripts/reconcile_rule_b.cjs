const { Client } = require('pg')
const { DateTime } = require('luxon')
require('dotenv').config()

// Replicates InvestmentService.roundMoney
const roundMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100

// Computes rule-B amounts for a given investment and period (copied from
// distributeMonthlyReturns AFTER the fix: cap = actual daysInMonth, divisor = 30)
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
  return { activeDays, prorateFactor, returnAmount, incomeAmount, goldAmount }
}

const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const months = process.argv[2] ? [process.argv[2]] : ['2026-07-01', '2026-08-01']

  for (const period of months) {
    const dists = await client.query(
      `SELECT d.id, d.user_id, d.investment_id, d.period_month, d.return_amount, d.income_amount,
              d.gold_amount, d.paid_out_at, u.name, i.amount, i.monthly_return_rate, i.started_at
       FROM investment_return_distributions d
       JOIN users u ON u.id = d.user_id
       JOIN investments i ON i.id = d.investment_id
       WHERE d.period_month = $1
       ORDER BY d.user_id, d.investment_id`,
      [period]
    )

    console.log(`\n========== PERIOD ${period} — ${dists.rows.length} distribution(s) ==========`)

    let totalDeltaReturn = 0
    let totalDeltaIncome = 0
    let totalDeltaGold = 0
    let changedCount = 0

    for (const d of dists.rows) {
      const exp = ruleB(d, period)
      const dRet = roundMoney(exp.returnAmount - Number(d.return_amount))
      const dInc = roundMoney(exp.incomeAmount - Number(d.income_amount))
      const dGold = roundMoney(exp.goldAmount - Number(d.gold_amount))
      const changed = dRet !== 0 || dInc !== 0 || dGold !== 0
      if (changed) changedCount++
      totalDeltaReturn += dRet
      totalDeltaIncome += dInc
      totalDeltaGold += dGold

      const paid = d.paid_out_at ? 'PAID ' : 'unpaid'
      const flag = changed ? ' <-- CHANGED' : ' ok'
      console.log(
        `PJ${String(d.user_id).padStart(6, '0')} ${d.name.padEnd(20)} inv#${String(d.investment_id).padStart(7, ' ')} ${paid} | ` +
          `return ${fmt(d.return_amount)} -> ${fmt(exp.returnAmount)} (d${fmt(dRet)}) | ` +
          `income ${fmt(d.income_amount)} -> ${fmt(exp.incomeAmount)} (d${fmt(dInc)}) | ` +
          `gold ${fmt(d.gold_amount)} -> ${fmt(exp.goldAmount)} (d${fmt(dGold)}) | ` +
          `days=${exp.activeDays}/30${flag}`
      )
    }

    console.log(
      `\nTOTALS ${period}: ${changedCount}/${dists.rows.length} changed | ` +
        `Δreturn ₹${fmt(totalDeltaReturn)} | Δincome ₹${fmt(totalDeltaIncome)} | Δgold ₹${fmt(totalDeltaGold)}`
    )
  }

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

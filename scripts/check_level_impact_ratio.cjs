const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // The old formula: amount * pct/100 * 12/365 per day. Over 31 days = amount * pct/100 * 31*12/365 = amount * pct/100 * 1.0192
  // The new formula: amount * pct/100 / 31 per day. Over 31 days = amount * pct/100 * 1.0
  // So every user's level income is multiplied by: 1.0 / 1.0192 = 0.9812
  // Users were overpaid by ~1.92%

  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // Sum total level income from snapshot
  let totalLevelIncome = 0
  let totalWorking = 0
  let totalRepurchase = 0
  let userCount = 0

  for (const u of snapshot.users) {
    const li = u.workingWallet?.levelIncome || 0
    if (li > 0) {
      totalLevelIncome += li
      userCount++
    }
    totalWorking += u.workingWallet?.grossTotal || 0
    totalRepurchase += u.workingWallet?.repurchaseShare || 0
  }

  // Ratio: new/old = 365/(12*31) = 0.98117
  const ratio = 365 / (12 * 31)
  const correctedLevelIncome = totalLevelIncome * ratio
  const delta = correctedLevelIncome - totalLevelIncome

  console.log('=== August 2026 Level Income Impact ===')
  console.log(`Users with level income: ${userCount}`)
  console.log(`Old total level income: ₹${totalLevelIncome.toFixed(2)}`)
  console.log(`Correct total level income: ₹${correctedLevelIncome.toFixed(2)}`)
  console.log(`Overpayment: ₹${(-delta).toFixed(2)} (${((1 - ratio) * 100).toFixed(2)}%)`)
  console.log(`\nLevel income is part of working wallet (70% of gross):`)
  console.log(`  Working wallet overpayment: ₹${(-delta * 0.7).toFixed(2)}`)
  console.log(`  Repurchase wallet overpayment: ₹${(-delta * 0.2).toFixed(2)}`)
  console.log(`  Total wallet overpayment: ₹${(-delta * 0.9).toFixed(2)}`)

  // Show per-user impact for top 20
  console.log(`\n=== Top 20 users by overpayment ===`)
  console.log(`${'PJ ID'.padEnd(12)}${'Name'.padEnd(28)}${'Old LI'.padStart(12)}${'Correct LI'.padStart(12)}${'Overpaid'.padStart(12)}`)
  console.log('-'.repeat(76))

  const userDeltas = []
  for (const u of snapshot.users) {
    const li = u.workingWallet?.levelIncome || 0
    if (li > 0) {
      const userDelta = li * (ratio - 1)
      userDeltas.push({ userId: u.userId, name: u.userName, old: li, correct: li * ratio, delta: userDelta })
    }
  }
  userDeltas.sort((a, b) => a.delta - b.delta) // most negative first

  for (const ud of userDeltas.slice(0, 20)) {
    console.log(`PJ${ud.userId}`.padEnd(12) + ud.name.padEnd(28) + `₹${ud.old.toFixed(2)}`.padStart(12) + `₹${ud.correct.toFixed(2)}`.padStart(12) + `₹${ud.delta.toFixed(2)}`.padStart(12))
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const userId = 997860

  // === 1. Level Income Correction ===
  const levelIncomeDelta = 964.79
  const workingLevelDelta = Math.round(levelIncomeDelta * 0.7 * 100) / 100
  const repurchaseLevelDelta = Math.round(levelIncomeDelta * 0.2 * 100) / 100

  console.log('=== Level Income Correction ===')
  console.log(`Delta: +₹${levelIncomeDelta} (working +₹${workingLevelDelta}, repurchase +₹${repurchaseLevelDelta})`)

  await c.query('UPDATE users SET working_wallet = working_wallet + $1, updated_at = NOW() WHERE id = $2', [workingLevelDelta, userId])
  await c.query('UPDATE users SET repurchase_wallet = repurchase_wallet + $1, updated_at = NOW() WHERE id = $2', [repurchaseLevelDelta, userId])
  console.log('✓ Wallets credited')

  // === 2. Salary Correction ===
  const salaryDelta = 6000
  const workingSalaryDelta = Math.round(salaryDelta * 0.7 * 100) / 100
  const repurchaseSalaryDelta = Math.round(salaryDelta * 0.2 * 100) / 100

  console.log('\n=== Salary Correction ===')
  console.log(`Delta: +₹${salaryDelta} (working +₹${workingSalaryDelta}, repurchase +₹${repurchaseSalaryDelta})`)

  await c.query('UPDATE users SET working_wallet = working_wallet + $1, updated_at = NOW() WHERE id = $2', [workingSalaryDelta, userId])
  await c.query('UPDATE users SET repurchase_wallet = repurchase_wallet + $1, updated_at = NOW() WHERE id = $2', [repurchaseSalaryDelta, userId])
  console.log('✓ Wallets credited')

  // Update salary record
  await c.query('UPDATE salaries SET power = 15239148, weaker = 1820414, qualifying_business = 17059562, updated_at = NOW() WHERE user_id = $1', [userId])
  console.log('✓ Salary record updated')

  // === 3. Update Snapshot ===
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)
  const u = snapshot.users.find(u => u.userId === userId)
  if (u) {
    u.workingWallet.levelIncome = 2115.77
    u.workingWallet.salary = 15999
    u.workingWallet.grossTotal = 50 + 400 + 470 + 2115.77 + 15999
    u.workingWallet.workingShare = Math.round(u.workingWallet.grossTotal * 0.7 * 100) / 100
    u.workingWallet.repurchaseShare = Math.round(u.workingWallet.grossTotal * 0.2 * 100) / 100
    await c.query("UPDATE platform_configs SET value = $1, updated_at = NOW() WHERE key = 'payout_preview_2026-08'", [JSON.stringify(snapshot)])
    console.log('\n✓ August snapshot updated')
    console.log(`  Gross: ₹${u.workingWallet.grossTotal}, Working: ₹${u.workingWallet.workingShare}, Repurchase: ₹${u.workingWallet.repurchaseShare}`)
  }

  // === 4. Record Transactions ===
  const { createId } = require('@paralleldrive/cuid2')
  await c.query(`INSERT INTO transactions (id, user_id, type, amount, remark, created_at, updated_at) VALUES ($1, $2, 'wallet_credit', $3, $4, NOW(), NOW())`, [createId(), userId, levelIncomeDelta, 'August 2026 level income correction (flat monthly formula)'])
  await c.query(`INSERT INTO transactions (id, user_id, type, amount, remark, created_at, updated_at) VALUES ($1, $2, 'wallet_credit', $3, $4, NOW(), NOW())`, [createId(), userId, salaryDelta, 'August 2026 salary correction (Gold ₹15,999)'])
  console.log('✓ Transactions recorded')

  // === 5. Verify ===
  const verify = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  console.log(`\nFinal wallets: working=₹${verify.rows[0].working_wallet}, repurchase=₹${verify.rows[0].repurchase_wallet}`)
  console.log('\n✅ DONE')
  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

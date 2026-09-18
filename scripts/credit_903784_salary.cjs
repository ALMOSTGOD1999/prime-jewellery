const pg = require('pg')
const { createId } = require('@paralleldrive/cuid2')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const userId = 903784
  const reward = 2499
  const power = 714000
  const weaker = 260700
  const qualifyingBusiness = 974700
  const createdAt = '2026-08-31 23:59:00+05:30'
  const paidAt = '2026-08-31 23:59:00+05:30'

  // 1. Create salary record
  console.log('Creating salary record...')
  const salaryId = createId()
  const salRes = await c.query(`
    INSERT INTO salaries (id, user_id, power, weaker, qualifying_business, status, paid_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $7)
    RETURNING id
  `, [salaryId, userId, power, weaker, qualifyingBusiness, paidAt, createdAt])
  console.log(`  ✓ Salary record created: id=${salRes.rows[0].id}`)

  // 2. Credit working wallet (70% of reward)
  const workingShare = Math.round(reward * 0.7 * 100) / 100
  console.log(`\nCrediting working wallet: +₹${workingShare}`)
  await c.query(`
    UPDATE users SET working_wallet = working_wallet + $1, updated_at = NOW() WHERE id = $2
  `, [workingShare, userId])

  // 3. Credit repurchase wallet (20% of reward)
  const repurchaseShare = Math.round(reward * 0.2 * 100) / 100
  console.log(`Crediting repurchase wallet: +₹${repurchaseShare}`)
  await c.query(`
    UPDATE users SET repurchase_wallet = repurchase_wallet + $1, updated_at = NOW() WHERE id = $2
  `, [repurchaseShare, userId])

  // 4. Record transaction
  await c.query(`
    INSERT INTO transactions (user_id, type, amount, description, created_at, updated_at)
    VALUES ($1, 'salary', $2, 'August 2026 Performance Incentive - Bronze (₹9,74,700 team business)', NOW(), NOW())
  `, [userId, reward])
  console.log(`  ✓ Transaction recorded: +₹${reward}`)

  // 5. Update August snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)
  const userSnap = snapshot.users.find(u => u.userId === userId)
  if (userSnap) {
    userSnap.workingWallet.salary = reward
    userSnap.workingWallet.grossTotal = (userSnap.workingWallet.grossTotal || 0) + reward
    userSnap.workingWallet.workingShare = Math.round(userSnap.workingWallet.grossTotal * 0.7 * 100) / 100
    userSnap.workingWallet.repurchaseShare = Math.round(userSnap.workingWallet.grossTotal * 0.2 * 100) / 100
    await c.query(
      "UPDATE platform_configs SET value = $1, updated_at = NOW() WHERE key = 'payout_preview_2026-08'",
      [JSON.stringify(snapshot)]
    )
    console.log(`  ✓ August snapshot updated`)
  }

  // 6. Verify
  const verifyRes = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  console.log(`\nFinal wallets: working=₹${verifyRes.rows[0].working_wallet}, repurchase=₹${verifyRes.rows[0].repurchase_wallet}`)

  console.log('\n✅ DONE — PJ903784 credited ₹2,499 Bronze Performance Incentive')
  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

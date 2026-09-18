const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Record transaction with valid type
  await c.query(`
    INSERT INTO transactions (id, user_id, type, amount, remark, created_at, updated_at)
    VALUES ('cuid_salary_903784_aug', 903784, 'wallet_credit', 2499, 'August 2026 Performance Incentive - Bronze', NOW(), NOW())
  `)
  console.log('✓ Transaction recorded: +₹2,499 wallet_credit')

  // Update August snapshot
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)
  const u = snapshot.users.find(u => u.userId === 903784)
  if (u) {
    u.workingWallet.salary = 2499
    u.workingWallet.grossTotal = (u.workingWallet.grossTotal || 0) + 2499
    u.workingWallet.workingShare = Math.round(u.workingWallet.grossTotal * 0.7 * 100) / 100
    u.workingWallet.repurchaseShare = Math.round(u.workingWallet.grossTotal * 0.2 * 100) / 100
    await c.query(
      "UPDATE platform_configs SET value = $1, updated_at = NOW() WHERE key = 'payout_preview_2026-08'",
      [JSON.stringify(snapshot)]
    )
    console.log('✓ August snapshot updated')
  }

  // Verify
  const verify = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = 903784')
  console.log(`\nFinal: working=₹${verify.rows[0].working_wallet}, repurchase=₹${verify.rows[0].repurchase_wallet}`)
  console.log('\n✅ PJ903784 credited ₹2,499 Bronze Performance Incentive')

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

const pg = require('pg')
const { DateTime } = require('luxon')

function cuid() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let rand = ''
  for (let i = 0; i < 24; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)]
  }
  return 'c' + rand
}

const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  const userId = 456594
  const TZ = 'Asia/Kolkata'

  // Correct calculation
  const activationCashback = 50
  const activationSponsor = 100
  const activationLevel = 160
  const levelIncome = 2000  // User says ₹2000 for Tumpa's ₹2L business at 1%
  const emiLevelIncome = 0
  const salary = 0

  const grossTotal = activationCashback + activationSponsor + activationLevel + levelIncome + emiLevelIncome + salary
  const workingShare = Math.round(grossTotal * 0.7 * 100) / 100
  const repurchaseShare = Math.round(grossTotal * 0.2 * 100) / 100

  console.log(`Corrected totals:`)
  console.log(`  Gross Total: ₹${grossTotal}`)
  console.log(`  Working Share (70%): ₹${workingShare}`)
  console.log(`  Repurchase Share (20%): ₹${repurchaseShare}`)

  // Currently credited
  const u = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  const currentWorking = Number(u.rows[0].working_wallet)
  const currentRepurchase = Number(u.rows[0].repurchase_wallet)
  console.log(`\nCurrently credited: working=₹${currentWorking}, repurchase=₹${currentRepurchase}`)

  const fixWorking = workingShare - currentWorking
  const fixRepurchase = repurchaseShare - currentRepurchase
  console.log(`Need to add: working +₹${fixWorking.toFixed(2)}, repurchase +₹${fixRepurchase.toFixed(2)}`)

  // Update snapshot
  const monthStart = DateTime.fromISO('2026-08-01', { zone: TZ }).startOf('month')
  await c.query(`
    UPDATE monthly_income_snapshots SET gross_amount = $1, income_wallet_amount = $2, repurchase_wallet_amount = $3, updated_at = NOW()
    WHERE user_id = $4 AND month = $5
  `, [grossTotal, workingShare, repurchaseShare, userId, monthStart.toSQL()])
  console.log(`✓ Updated snapshot`)

  // Credit wallets
  await c.query('UPDATE users SET working_wallet = working_wallet + $1, repurchase_wallet = repurchase_wallet + $2 WHERE id = $3',
    [fixWorking, fixRepurchase, userId])
  console.log(`✓ Credited wallets`)

  // Create transactions for the difference
  const now = DateTime.now().setZone(TZ).toSQL()
  if (fixWorking > 0) {
    await c.query(`
      INSERT INTO transactions (id, user_id, type, amount, approved_at, remark, created_at, updated_at)
      VALUES ($1, $2, 'wallet_credit', $3, $4, $5, $6, $6)
    `, [cuid(), userId, fixWorking, now,
      'Working wallet (70%) — level income correction for August 2026 (was calculated as daily pro-rata instead of monthly)',
      now])
    console.log(`✓ Created working wallet correction transaction: +₹${fixWorking.toFixed(2)}`)
  }

  if (fixRepurchase > 0) {
    await c.query(`
      INSERT INTO transactions (id, user_id, type, amount, approved_at, remark, created_at, updated_at)
      VALUES ($1, $2, 'wallet_credit', $3, $4, $5, $6, $6)
    `, [cuid(), userId, fixRepurchase, now,
      'Repurchase wallet (20%) — level income correction for August 2026 (was calculated as daily pro-rata instead of monthly)',
      now])
    console.log(`✓ Created repurchase wallet correction transaction: +₹${fixRepurchase.toFixed(2)}`)
  }

  // Verify
  const final = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  console.log(`\nFinal: working=₹${final.rows[0].working_wallet}, repurchase=₹${final.rows[0].repurchase_wallet}`)

  const snap = await c.query('SELECT * FROM monthly_income_snapshots WHERE user_id = $1 AND month >= $2', [userId, '2026-08-01'])
  if (snap.rows.length) {
    const s = snap.rows[0]
    console.log(`Snapshot: gross=₹${s.gross_amount}, working=₹${s.income_wallet_amount}, repurchase=₹${s.repurchase_wallet_amount}`)
  }

  await c.end()
  console.log('\n✅ DONE')
}

main().catch(e => { console.error(e); process.exit(1) })

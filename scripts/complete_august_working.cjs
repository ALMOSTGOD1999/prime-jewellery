/**
 * Complete August 2026 Working Wallet Payout
 *
 * Phase 1: Create missing snapshots (skips existing ones)
 * Phase 2: Credit all unpaid snapshots (70% working + 20% repurchase)
 * Phase 3: Set working_wallet_payout_month
 *
 * Run: node scripts/complete_august_working.cjs
 */

const { Client } = require('pg')
const c = new Client({
  connectionString:
    'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
})

const MONTH = '2026-08-01'

async function main() {
  await c.connect()

  console.log('══════════════════════════════════════════════════')
  console.log('  COMPLETING AUGUST 2026 WORKING WALLET PAYOUT')
  console.log('══════════════════════════════════════════════════')
  console.log('')

  // ── Phase 1: Credit all unpaid snapshots ──
  console.log('─── Phase 1: Crediting unpaid snapshots ──')

  const unpaid = await c.query(
    `SELECT s.id, s.user_id, s.gross_amount, s.income_wallet_amount, s.repurchase_wallet_amount
     FROM monthly_income_snapshots s
     WHERE s.month = $1 AND s.paid_out_at IS NULL
     ORDER BY s.user_id`,
    [MONTH]
  )

  console.log(`  Found ${unpaid.rows.length} unpaid snapshots`)

  let credited = 0
  let failed = 0
  let totalGross = 0

  for (const snap of unpaid.rows) {
    const userId = snap.user_id
    const gross = Number(snap.gross_amount)
    const workingAmount = Math.round(gross * 0.7 * 100) / 100
    const repurchaseAmount = Math.round(gross * 0.2 * 100) / 100

    try {
      // Check user is still active
      const userCheck = await c.query('SELECT id, status FROM users WHERE id = $1', [userId])
      if (!userCheck.rows.length || userCheck.rows[0].status !== 'active') {
        // Mark as paid (skip inactive)
        await c.query('UPDATE monthly_income_snapshots SET paid_out_at = NOW() WHERE id = $1', [snap.id])
        console.log(`  ${userId}: skipped (inactive)`)
        continue
      }

      // Credit working wallet (70%)
      if (workingAmount > 0) {
        await c.query(
          `UPDATE users SET working_wallet = working_wallet + $1, updated_at = NOW() WHERE id = $2`,
          [workingAmount, userId]
        )
        // Insert wallet transaction
        await c.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, remark, reference_type, reference_id, created_at, updated_at)
           SELECT $1, 'CREDIT', $2, working_wallet, $3, 'WorkingWalletCredit', $4, NOW(), NOW()
           FROM users WHERE id = $1`,
          [userId, workingAmount, `Working wallet (70%) from working income for August 2026`, snap.id]
        )
      }

      // Credit repurchase wallet (20%)
      if (repurchaseAmount > 0) {
        await c.query(
          `UPDATE users SET repurchase_wallet = repurchase_wallet + $1, updated_at = NOW() WHERE id = $2`,
          [repurchaseAmount, userId]
        )
        await c.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, remark, reference_type, reference_id, created_at, updated_at)
           SELECT $1, 'CREDIT', $2, repurchase_wallet, $3, 'RepurchaseWalletCredit', $4, NOW(), NOW()
           FROM users WHERE id = $1`,
          [userId, repurchaseAmount, `Repurchase wallet (20%) from working income for August 2026`, snap.id]
        )
      }

      // Mark snapshot as paid
      await c.query('UPDATE monthly_income_snapshots SET paid_out_at = NOW() WHERE id = $1', [snap.id])

      credited++
      totalGross += gross

      if (credited % 50 === 0 || credited === unpaid.rows.length) {
        console.log(`  Progress: ${credited}/${unpaid.rows.length} (gross ₹${Math.round(totalGross).toLocaleString('en-IN')})`)
      }
    } catch (error) {
      failed++
      console.error(`  ${userId}: FAILED - ${error.message}`)
    }
  }

  console.log(`\n  Credited: ${credited} | Failed: ${failed} | Total gross: ₹${Math.round(totalGross).toLocaleString('en-IN')}`)

  // ── Phase 2: Set payout month ──
  console.log('\n─── Phase 2: Setting working_wallet_payout_month ──')
  await c.query(
    `INSERT INTO platform_configs (key, value, group_name, description, created_at, updated_at)
     VALUES ('working_wallet_payout_month', '2026-08', 'payout', 'Last month for which working wallet payout was processed', NOW(), NOW())
     ON CONFLICT (key) DO UPDATE SET value = '2026-08', updated_at = NOW()`
  )
  console.log('  Set working_wallet_payout_month = 2026-08')

  // ── Phase 3: Summary ──
  console.log('\n─── Summary ──')
  const summary = await c.query(`
    SELECT
      (SELECT count(*) FROM monthly_income_snapshots WHERE month = $1) as total_snapshots,
      (SELECT count(*) FROM monthly_income_snapshots WHERE month = $1 AND paid_out_at IS NOT NULL) as paid_snapshots,
      (SELECT coalesce(sum(gross_amount),0)::float FROM monthly_income_snapshots WHERE month = $1) as total_gross,
      (SELECT coalesce(sum(income_wallet),0)::float FROM users WHERE role='user') as total_working,
      (SELECT coalesce(sum(repurchase_wallet),0)::float FROM users WHERE role='user') as total_repurchase,
      (SELECT count(*) FROM users WHERE role='user' AND (working_wallet > 0 OR repurchase_wallet > 0)) as users_with_balance
  `, [MONTH])

  const s = summary.rows[0]
  console.log(`  Snapshots: ${s.total_snapshots} total, ${s.paid_snapshots} paid`)
  console.log(`  Total gross: ₹${Math.round(s.total_gross).toLocaleString('en-IN')}`)
  console.log(`  Working wallet: ₹${Math.round(s.total_working).toLocaleString('en-IN')}`)
  console.log(`  Repurchase wallet: ₹${Math.round(s.total_repurchase).toLocaleString('en-IN')}`)
  console.log(`  Users with balance: ${s.users_with_balance}`)

  // Check PJ585222
  const pj = await c.query(
    `SELECT s.gross_amount, s.paid_out_at, u.working_wallet, u.repurchase_wallet
     FROM monthly_income_snapshots s
     JOIN users u ON s.user_id = u.id
     WHERE s.user_id = 585222 AND s.month = $1`,
    [MONTH]
  )
  if (pj.rows.length) {
    console.log(`\n  PJ585222: gross ₹${pj.rows[0].gross_amount}, working ₹${pj.rows[0].working_wallet}, repurchase ₹${pj.rows[0].repurchase_wallet}, paid: ${pj.rows[0].paid_out_at ? 'YES' : 'NO'}`)
  } else {
    console.log(`\n  PJ585222: NO SNAPSHOTTED (missing from snapshot creation)`)
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log('  DONE')
  console.log('══════════════════════════════════════════════════')

  await c.end()
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})

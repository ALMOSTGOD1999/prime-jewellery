import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class AuditJulyPayouts extends BaseCommand {
  static commandName = 'audit-july-payouts'
  static description = 'Audit July 2026 payouts for ALL users'
  static options: CommandOptions = { startApp: true }

  async run() {
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  AUDIT: JULY 2026 PAYOUTS — ALL USERS')
    this.logger.info('══════════════════════════════════════════════════')

    // ─── Config check ───
    const config = await db.rawQuery(
      `SELECT key, value FROM platform_configs WHERE key IN ('income_wallet_payout_month', 'working_wallet_payout_month')`
    )
    console.log('\n=== PAYOUT CONFIGS ===')
    for (const c of config.rows) {
      console.log(`  ${c.key} = ${c.value}`)
    }

    // ─── Cashback (Income Wallet) Payout Audit ───
    console.log('\n=== CASHBACK (INCOME WALLET) PAYOUT ===')
    const distTotal = await db.rawQuery(
      `SELECT count(*)::int as total, count(paid_out_at) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid FROM investment_return_distributions WHERE period_month = '2026-07-01'`
    )
    console.log(`  Distributions: ${distTotal.rows[0].total} total, ${distTotal.rows[0].paid} paid`)

    // For each paid distribution, check if wallet credit transaction exists
    const distCredits = await db.rawQuery(
      `SELECT d.user_id, d.income_amount, d.gold_amount, d.paid_out_at,
              d.income_wallet_transaction_id, d.gold_transaction_id,
              u.id as uid, u.name, u.income_wallet, u.repurchase_wallet
       FROM investment_return_distributions d
       JOIN users u ON u.id = d.user_id
       WHERE d.period_month = '2026-07-01' AND d.paid_out_at IS NOT NULL
       ORDER BY u.id`
    )
    const distIssues: string[] = []
    for (const d of distCredits.rows) {
      const incomeTxn = d.income_wallet_transaction_id
        ? await db.rawQuery(`SELECT id, amount FROM transactions WHERE id = ?`, [d.income_wallet_transaction_id])
        : { rows: [] as any[] }
      const goldTxn = d.gold_transaction_id
        ? await db.rawQuery(`SELECT id, amount FROM transactions WHERE id = ?`, [d.gold_transaction_id])
        : { rows: [] as any[] }

      const incomeMissing = incomeTxn.rows.length === 0
      const goldMissing = goldTxn.rows.length === 0

      if (incomeMissing || goldMissing) {
        distIssues.push(
          `  ⚠ ${d.name} (ID:${d.uid}): income txn ${incomeMissing ? 'MISSING' : 'OK'}, repurchase txn ${goldMissing ? 'MISSING' : 'OK'}`
        )
      }
    }
    if (distIssues.length > 0) {
      console.log(`  ISSUES FOUND:`)
      distIssues.forEach((i) => console.log(i))
    } else {
      console.log(`  ✅ All ${distCredits.rows.length} cashback credits verified — transactions exist`)
    }

    // ─── Working Wallet Payout Audit ───
    console.log('\n=== WORKING WALLET PAYOUT ===')
    const snapTotal = await db.rawQuery(
      `SELECT count(*)::int as total,
              count(paid_out_at) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid,
              coalesce(sum(gross_amount), 0)::float as total_gross
       FROM monthly_income_snapshots WHERE month = '2026-07-01'`
    )
    console.log(`  Snapshots: ${snapTotal.rows[0].total} total, ${snapTotal.rows[0].paid} paid, gross ₹${Number(snapTotal.rows[0].total_gross).toLocaleString('en-IN')}`)

    // Check working wallet credits for July
    const workingTxns = await db.rawQuery(
      `SELECT user_id, sum(amount)::float as total_credited
       FROM transactions
       WHERE remark LIKE '%Working wallet (70%) from working income for July 2026%'
       GROUP BY user_id`
    )
    const workingMap = new Map<number, number>(workingTxns.rows.map((r: any) => [r.user_id, Number(r.total_credited)]))

    // Check repurchase wallet credits for July (from working income)
    const repurchaseTxns = await db.rawQuery(
      `SELECT user_id, sum(amount)::float as total_credited
       FROM transactions
       WHERE remark LIKE '%Repurchase wallet (20%) from working income for July 2026%'
       GROUP BY user_id`
    )
    const repurchaseMap = new Map<number, number>(repurchaseTxns.rows.map((r: any) => [r.user_id, Number(r.total_credited)]))

    const snapCredits = await db.rawQuery(
      `SELECT s.user_id, s.gross_amount, s.income_wallet_amount, s.repurchase_wallet_amount, s.paid_out_at,
              u.id as uid, u.name, u.working_wallet, u.repurchase_wallet
       FROM monthly_income_snapshots s
       JOIN users u ON u.id = s.user_id
       WHERE s.month = '2026-07-01' AND s.paid_out_at IS NOT NULL
       ORDER BY u.id`
    )

    const snapIssues: string[] = []
    let allPaidOk = 0
    for (const s of snapCredits.rows) {
      const workingCredited = workingMap.get(Number(s.user_id)) || 0
      const repurchaseCredited = repurchaseMap.get(Number(s.user_id)) || 0
      const expectedWorking = Math.round(Number(s.gross_amount) * 0.7 * 100) / 100
      const expectedRepurchase = Math.round(Number(s.gross_amount) * 0.2 * 100) / 100

      const workingOk = Math.abs(workingCredited - expectedWorking) < 0.02
      const repurchaseOk = Math.abs(repurchaseCredited - expectedRepurchase) < 0.02

      if (!workingOk || !repurchaseOk) {
        snapIssues.push(
          `  ⚠ ${s.name} (ID:${s.uid}): working ₹${workingCredited} (expected ₹${expectedWorking}), repurchase ₹${repurchaseCredited} (expected ₹${expectedRepurchase})`
        )
      } else {
        allPaidOk++
      }
    }
    if (snapIssues.length > 0) {
      console.log(`  CREDIT ISSUES (${snapIssues.length}):`)
      snapIssues.forEach((i) => console.log(i))
    } else if (snapCredits.rows.length > 0) {
      console.log(`  ✅ All ${snapCredits.rows.length} working wallet credits verified`)
    }

    // ─── Unpaid snapshots ───
    const unpaidSnaps = await db.rawQuery(
      `SELECT s.user_id, u.name, u.id as uid, s.gross_amount
       FROM monthly_income_snapshots s
       JOIN users u ON u.id = s.user_id
       WHERE s.month = '2026-07-01' AND s.paid_out_at IS NULL`
    )
    if (unpaidSnaps.rows.length > 0) {
      console.log(`\n  ⚠ UNPAID SNAPSHOTS (${unpaidSnaps.rows.length}):`)
      for (const u of unpaidSnaps.rows) {
        console.log(`    ${u.name} (ID:${u.uid}): gross ₹${u.gross_amount}`)
      }
    }

    // ─── Wallet balances overview ───
    console.log('\n=== ALL ACTIVE USER WALLET BALANCES (sorted by total) ===')
    const allUsers = await db.rawQuery(
      `SELECT id, name, working_wallet, income_wallet, repurchase_wallet
       FROM users WHERE role = 'user' AND status = 'active'
       ORDER BY (COALESCE(working_wallet, 0) + COALESCE(income_wallet, 0) + COALESCE(repurchase_wallet, 0)) DESC`
    )
    for (const u of allUsers.rows) {
      const total = Number(u.working_wallet || 0) + Number(u.income_wallet || 0) + Number(u.repurchase_wallet || 0)
      console.log(
        `  ID:${String(u.id).padEnd(8)} ${String(u.name).padEnd(20)} | Working: ₹${String(u.working_wallet || 0).padStart(10)} | Income: ₹${String(u.income_wallet || 0).padStart(10)} | Repurchase: ₹${String(u.repurchase_wallet || 0).padStart(10)} | Total: ₹${total.toLocaleString('en-IN')}`
      )
    }

    // ─── Summary ───
    console.log('\n══════════════════════════════════════════════════')
    console.log(`  SUMMARY`)
    console.log(`  Cashback distributions: ${distTotal.rows[0].paid}/${distTotal.rows[0].total} paid`)
    console.log(`  Working snapshots: ${snapTotal.rows[0].paid}/${snapTotal.rows[0].total} paid`)
    console.log(`  Working wallet credits verified: ${allPaidOk}/${snapCredits.rows.length}`)
    console.log(`  Cashback issues: ${distIssues.length}`)
    console.log(`  Working wallet issues: ${snapIssues.length}`)
    console.log(`  Unpaid snapshots: ${unpaidSnaps.rows.length}`)
    console.log('══════════════════════════════════════════════════')

    await db.manager.close('read')
  }
}

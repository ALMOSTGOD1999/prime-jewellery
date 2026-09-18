/**
 * Fix level income for August 2026 payout using flat monthly formula.
 *
 * Old (wrong): cumulativeAmount * percentage / 100 * 12 / 365 * daysInMonth
 * New (correct): cumulativeAmount * percentage / 100  (flat monthly, split across days → /30 per day)
 *
 * Steps:
 *   1. For every Aug snapshot, recompute correct level income from descendant purchases.
 *   2. Compute the delta vs what was already credited.
 *   3. Update the snapshot gross/working/repurchase fields.
 *   4. Credit/debit working + repurchase wallets.
 *   5. Record correction transactions.
 */

const pg = require('pg')

const connectionString =
  'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

const LEVEL_PERCENTAGES = { 1: 1.0, 2: 0.5, 3: 0.2, 4: 0.15 }

async function main() {
  const c = new pg.Client({ connectionString })
  await c.connect()

  try {
    // 1. Get the August snapshot config
    const cfgRes = await c.query(
      "SELECT value FROM platform_configs WHERE key = 'payout_snapshot_2026-08'"
    )
    if (cfgRes.rows.length === 0) {
      console.log('No August snapshot found')
      return
    }
    const snapshot = JSON.parse(cfgRes.rows[0].value)

    // 2. Get all August-approved purchases
    const allPurchasesRes = await c.query(`
      SELECT user_id, amount, approved_at
      FROM purchases
      WHERE approved_at IS NOT NULL
        AND cancelled_at IS NULL
        AND approved_at >= '2026-08-01'
        AND approved_at < '2026-09-01'
    `)
    const purchasesByUser = {}
    for (const p of allPurchasesRes.rows) {
      if (!purchasesByUser[p.user_id]) purchasesByUser[p.user_id] = []
      purchasesByUser[p.user_id].push(p)
    }

    // 3. For each snapshot user, recompute correct level income
    let totalDelta = 0
    let corrected = 0
    const corrections = []

    for (const u of snapshot.users) {
      if (!u.levelIncome || u.levelIncome === 0) continue

      // Find this user's direct children
      const childrenRes = await c.query(
        'SELECT id FROM users WHERE parent_id = $1',
        [u.userId]
      )
      const childIds = childrenRes.rows.map((r) => r.id)
      if (childIds.length === 0) continue

      // Find descendant purchases (BFS up to depth 25)
      const descRes = await c.query(`
        WITH RECURSIVE descendants AS (
          SELECT id, parent_id, 1 as depth
          FROM users
          WHERE parent_id = $1
          UNION ALL
          SELECT u.id, u.parent_id, d.depth + 1
          FROM users u
          INNER JOIN descendants d ON u.parent_id = d.id
          WHERE d.depth < 25
        )
        SELECT d.id as user_id, d.depth, p.amount, p.approved_at
        FROM descendants d
        JOIN purchases p ON p.user_id = d.id
        WHERE p.approved_at IS NOT NULL
          AND p.cancelled_at IS NULL
          AND p.approved_at >= '2026-08-01'
          AND p.approved_at < '2026-09-01'
        ORDER BY d.depth, p.approved_at
      `, [u.userId])

      if (descRes.rows.length === 0) continue

      // Calculate flat monthly level income (correct formula)
      let correctLevelIncome = 0
      for (const p of descRes.rows) {
        const pct = LEVEL_PERCENTAGES[p.depth] || 0
        if (pct === 0) continue
        correctLevelIncome += Number(p.amount) * (pct / 100)
      }

      correctLevelIncome = Math.round(correctLevelIncome * 100) / 100
      const delta = Math.round((correctLevelIncome - u.levelIncome) * 100) / 100

      if (Math.abs(delta) < 0.01) continue

      corrections.push({
        userId: u.userId,
        name: u.userName,
        oldLevelIncome: u.levelIncome,
        correctLevelIncome,
        delta,
      })
      totalDelta += delta
      corrected++
    }

    if (corrections.length === 0) {
      console.log('No corrections needed - all level incomes match flat monthly formula.')
      return
    }

    console.log(`\n=== Level Income Corrections (${corrected} users) ===\n`)
    console.log(
      'User'.padEnd(35) +
        'Old'.padStart(12) +
        'Correct'.padStart(12) +
        'Delta'.padStart(12)
    )
    console.log('-'.repeat(71))

    let totalOld = 0
    let totalCorrect = 0
    for (const c of corrections) {
      totalOld += c.oldLevelIncome
      totalCorrect += c.correctLevelIncome
      const sign = c.delta > 0 ? '+' : ''
      console.log(
        `PJ${c.userId} ${c.name}`.padEnd(35) +
          `₹${c.oldLevelIncome.toFixed(2)}`.padStart(12) +
          `₹${c.correctLevelIncome.toFixed(2)}`.padStart(12) +
          `${sign}₹${c.delta.toFixed(2)}`.padStart(12)
      )
    }

    console.log('-'.repeat(71))
    console.log(
      'TOTAL'.padEnd(35) +
        `₹${totalOld.toFixed(2)}`.padStart(12) +
        `₹${totalCorrect.toFixed(2)}`.padStart(12) +
        `${totalDelta > 0 ? '+' : ''}₹${totalDelta.toFixed(2)}`.padStart(12)
    )

    console.log(`\nOld level income total: ₹${totalOld.toFixed(2)}`)
    console.log(`Correct level income total: ₹${totalCorrect.toFixed(2)}`)
    console.log(`Net delta: ${totalDelta > 0 ? '+' : ''}₹${totalDelta.toFixed(2)}`)

    // 4. Ask for confirmation before applying
    const readline = require('readline')
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise((resolve) =>
      rl.question('\nApply corrections? (yes/no): ', resolve)
    )
    rl.close()

    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted.')
      return
    }

    // 5. Apply corrections
    for (const corr of corrections) {
      const u = snapshot.users.find((u) => u.userId === corr.userId)
      if (!u) continue

      // Update snapshot totals
      const oldWorkingLevelIncome = u.workingWallet.levelIncome || 0
      const oldRepurchaseLevelIncome = u.repurchaseWallet.levelIncome || 0

      // Level income goes 70% to working, 20% to repurchase
      const correctWorkingLevel = Math.round(corr.correctLevelIncome * 0.7 * 100) / 100
      const correctRepurchaseLevel = Math.round(corr.correctLevelIncome * 0.2 * 100) / 100

      const workingDelta = Math.round((correctWorkingLevel - oldWorkingLevelIncome) * 100) / 100
      const repurchaseDelta = Math.round(
        (correctRepurchaseLevel - oldRepurchaseLevelIncome) * 100
      ) / 100

      // Update snapshot user
      u.workingWallet.levelIncome = correctWorkingLevel
      u.repurchaseWallet.levelIncome = correctRepurchaseLevel
      u.workingWallet.gross = Math.round((u.workingWallet.gross + workingDelta) * 100) / 100
      u.repurchaseWallet.gross = Math.round(
        (u.repurchaseWallet.gross + repurchaseDelta) * 100
      ) / 100
      u.totalIncome = Math.round((u.totalIncome + workingDelta + repurchaseDelta) * 100) / 100

      // Credit wallets
      if (workingDelta !== 0) {
        await c.query(
          `UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1 WHERE user_id = $2 AND type = 'working'`,
          [workingDelta, corr.userId]
        )
      }
      if (repurchaseDelta !== 0) {
        await c.query(
          `UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1 WHERE user_id = $2 AND type = 'repurchase'`,
          [repurchaseDelta, corr.userId]
        )
      }

      // Record transactions
      if (workingDelta !== 0) {
        await c.query(
          `INSERT INTO transactions (id, user_id, type, amount, description, metadata, created_at, updated_at)
           VALUES ($1, $2, 'level_income_correction', $3, 'August 2026 level income correction (flat monthly formula)', $4, NOW(), NOW())`,
          [
            'cuid_level_' + corr.userId,
            corr.userId,
            workingDelta,
            JSON.stringify({
              oldLevelIncome: corr.oldLevelIncome,
              correctLevelIncome: corr.correctLevelIncome,
              formula: 'flat_monthly_1_30',
            }),
          ]
        )
      }
      if (repurchaseDelta !== 0) {
        await c.query(
          `INSERT INTO transactions (id, user_id, type, amount, description, metadata, created_at, updated_at)
           VALUES ($1, $2, 'level_income_correction', $3, 'August 2026 repurchase level income correction (flat monthly formula)', $4, NOW(), NOW())`,
          [
            'cuid_replevel_' + corr.userId,
            corr.userId,
            repurchaseDelta,
            JSON.stringify({
              oldLevelIncome: corr.oldLevelIncome,
              correctLevelIncome: corr.correctLevelIncome,
              formula: 'flat_monthly_1_30',
            }),
          ]
        )
      }

      console.log(
        `✓ PJ${corr.userId}: working ${workingDelta >= 0 ? '+' : ''}₹${workingDelta.toFixed(2)}, repurchase ${repurchaseDelta >= 0 ? '+' : ''}₹${repurchaseDelta.toFixed(2)}`
      )
    }

    // 6. Update snapshot totals and save
    snapshot.summary = snapshot.users.reduce(
      (acc, u) => ({
        totalGross: acc.totalGross + u.totalIncome,
        totalWorking: acc.totalWorking + u.workingWallet.gross,
        totalRepurchase: acc.totalRepurchase + u.repurchaseWallet.gross,
      }),
      { totalGross: 0, totalWorking: 0, totalRepurchase: 0 }
    )
    snapshot.summary.totalGross = Math.round(snapshot.summary.totalGross * 100) / 100
    snapshot.summary.totalWorking = Math.round(snapshot.summary.totalWorking * 100) / 100
    snapshot.summary.totalRepurchase = Math.round(snapshot.summary.totalRepurchase * 100) / 100

    await c.query(
      "UPDATE platform_configs SET value = $1, updated_at = NOW() WHERE key = 'payout_snapshot_2026-08'",
      [JSON.stringify(snapshot)]
    )

    console.log('\n✓ Snapshot updated')
    console.log(`\nNew snapshot totals: gross=₹${snapshot.summary.totalGross}, working=₹${snapshot.summary.totalWorking}, repurchase=₹${snapshot.summary.totalRepurchase}`)
    console.log('\n✅ DONE')
  } finally {
    await c.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

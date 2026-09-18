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

const TZ = 'Asia/Kolkata'
const INCOME_PERCENT = 0.7
const REPURCHASE_PERCENT = 0.2

const LEVEL_PERCENTAGES = {
  1: 1.00, 2: 0.50, 3: 0.20, 4: 0.15, 5: 0.15,
  6: 0.15, 7: 0.15, 8: 0.10, 9: 0.10, 10: 0.10,
  11: 0.10, 12: 0.05, 13: 0.05, 14: 0.05, 15: 0.05,
  16: 0.05, 17: 0.05, 18: 0.05, 19: 0.05, 20: 0.02
}

const LEVEL_MIN_DIRECTS = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4, 13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6
}

const LEVEL_MIN_TBL = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 5, 6: 5, 7: 5, 8: 5,
  9: 10, 10: 10, 11: 10, 12: 10, 13: 15, 14: 15, 15: 15, 16: 15,
  17: 25, 18: 25, 19: 25, 20: 25
}

const TBL_LEVELS = [
  { level: 1, min_business: 0 },
  { level: 2, min_business: 100000 },
  { level: 3, min_business: 200000 },
  { level: 4, min_business: 350000 },
  { level: 5, min_business: 500000 },
  { level: 6, min_business: 700000 },
  { level: 7, min_business: 900000 },
  { level: 8, min_business: 1200000 },
  { level: 9, min_business: 1500000 },
  { level: 10, min_business: 1800000 },
]

function roundMoney(v) { return Math.round((v + Number.EPSILON) * 100) / 100 }

function getTblLevel(business) {
  let level = 1
  for (const tbl of TBL_LEVELS) {
    if (business >= tbl.min_business) level = tbl.level
  }
  return level
}

function getMaxUnlockedLevel(directCount, tblLevel) {
  for (let l = 20; l >= 1; l--) {
    if (directCount >= LEVEL_MIN_DIRECTS[l] && tblLevel >= LEVEL_MIN_TBL[l]) return l
  }
  return 0
}

async function main() {
  await c.connect()

  const period = DateTime.fromISO('2026-08-01', { zone: TZ })
  const monthStart = period.startOf('month')
  const monthEnd = period.endOf('month')

  console.log(`Period: ${monthStart.toISODate()} to ${monthEnd.toISODate()}`)

  for (const userId of [456594, 577611]) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`PROCESSING PJ${userId}`)
    console.log(`${'='.repeat(60)}`)

    // Check existing state
    const existingSnap = await c.query(
      'SELECT * FROM monthly_income_snapshots WHERE user_id = $1 AND month = $2',
      [userId, monthStart.toSQL()]
    )
    if (existingSnap.rows.length > 0) {
      console.log(`  ℹ Snapshot already exists (id=${existingSnap.rows[0].id}). Checking transactions...`)
    }

    const existingTxns = await c.query(
      "SELECT * FROM transactions WHERE user_id = $1 AND remark LIKE '%August 2026%' AND remark LIKE '%retroactive%'",
      [userId]
    )
    if (existingTxns.rows.length >= 2) {
      console.log(`  ℹ Retroactive transactions already exist (${existingTxns.rows.length}). Skipping wallet credit.`)
    }

    // 1. Reactivate user
    await c.query("UPDATE users SET status = 'active' WHERE id = $1", [userId])
    console.log(`✓ Reactivated PJ${userId}`)

    const userRes = await c.query('SELECT * FROM users WHERE id = $1', [userId])
    const user = userRes.rows[0]
    const actAmt = Number(user.activation_amount) || 1000
    const activatedAt = DateTime.fromISO(user.activated_at.toISOString(), { zone: TZ })

    // ─── 1. Activation Cashback ──────────────────────
    const monthlyCashback = (actAmt * 0.1) / 2
    const month1Date = activatedAt.plus({ months: 1 })
    const month2Date = activatedAt.plus({ months: 2 })
    let activationCashback = 0
    if (monthEnd >= month1Date && month1Date.toFormat('yyyy-MM') === period.toFormat('yyyy-MM'))
      activationCashback += monthlyCashback
    if (monthEnd >= month2Date && month2Date.toFormat('yyyy-MM') === period.toFormat('yyyy-MM'))
      activationCashback += monthlyCashback
    console.log(`  Activation Cashback: ₹${activationCashback}`)

    // ─── 2. Activation Sponsor ──────────────────────
    const childrenRes = await c.query(
      "SELECT id, activated_at FROM users WHERE parent_id = $1 AND activated_at IS NOT NULL AND activated_at >= $2 AND activated_at <= $3",
      [userId, monthStart.toSQL(), monthEnd.toSQL()]
    )
    const activationSponsor = childrenRes.rows.length * (actAmt * 0.1)
    console.log(`  Activation Sponsor: ${childrenRes.rows.length} children × ₹${actAmt * 0.1} = ₹${activationSponsor}`)

    // ─── 3. Activation Level ──────────────────────────
    const directCountRes = await c.query('SELECT COUNT(*) as cnt FROM users WHERE parent_id = $1', [userId])
    const directCount = Number(directCountRes.rows[0].cnt)

    const teamBizRes = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT COALESCE(SUM(p.amount), 0)::float as total
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
    `, [userId])
    const teamBusiness = Number(teamBizRes.rows[0].total)
    const tblLevel = getTblLevel(teamBusiness)
    const maxActLevel = Math.min(directCount >= 2 ? 5 : directCount >= 1 ? 3 : 1, 5)

    const asOfStart = monthStart.minus({ days: 1 })
    const descStart = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id, u.name, u.parent_id, u.activated_at, d.depth + 1
        FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < $2
      )
      SELECT id, name, activated_at, depth FROM descendants WHERE activated_at IS NOT NULL AND activated_at <= $3 ORDER BY depth
    `, [userId, maxActLevel, asOfStart.toSQL()])

    let eligibleAtStart = 0
    for (const m of descStart.rows) {
      const mAct = DateTime.fromISO(m.activated_at.toISOString(), { zone: TZ })
      const monthsElapsed = asOfStart.diff(mAct, 'months').months
      const monthlyPct = m.depth === 1 ? 0.05 : m.depth === 2 ? 0.02 : 0.01
      const eligibleMonths = monthsElapsed >= 2 ? 2 : monthsElapsed >= 1 ? 2 : 1
      eligibleAtStart += actAmt * monthlyPct * eligibleMonths
    }

    const descEnd = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id, u.name, u.parent_id, u.activated_at, d.depth + 1
        FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < $2
      )
      SELECT id, name, activated_at, depth FROM descendants WHERE activated_at IS NOT NULL AND activated_at <= $3 ORDER BY depth
    `, [userId, maxActLevel, monthEnd.toSQL()])

    let eligibleAtEnd = 0
    for (const m of descEnd.rows) {
      const mAct = DateTime.fromISO(m.activated_at.toISOString(), { zone: TZ })
      const monthsElapsed = monthEnd.diff(mAct, 'months').months
      const monthlyPct = m.depth === 1 ? 0.05 : m.depth === 2 ? 0.02 : 0.01
      const eligibleMonths = monthsElapsed >= 2 ? 2 : monthsElapsed >= 1 ? 2 : 1
      eligibleAtEnd += actAmt * monthlyPct * eligibleMonths
    }

    const activationLevel = Math.max(0, roundMoney(eligibleAtEnd - eligibleAtStart))
    console.log(`  Activation Level: eligibleAtEnd=${roundMoney(eligibleAtEnd)} - eligibleAtStart=${roundMoney(eligibleAtStart)} = ₹${activationLevel}`)

    // ─── 4. Level Income (monthly from purchases) ──────
    const maxLvlDepth = getMaxUnlockedLevel(directCount, tblLevel)
    console.log(`  Level Income: directCount=${directCount}, tblLevel=${tblLevel}, maxDepth=${maxLvlDepth}`)

    const descPurchases = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id, u.parent_id, u.activated_at, d.depth + 1
        FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < $2
      )
      SELECT d.id as user_id, d.depth, d.activated_at, p.amount, p.approved_at, p.stopped_at, p.cancelled_at
      FROM descendants d
      JOIN purchases p ON p.user_id = d.id
      WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
      ORDER BY d.depth, p.approved_at
    `, [userId, maxLvlDepth])

    const purchasesByUser = new Map()
    for (const p of descPurchases.rows) {
      if (!purchasesByUser.has(p.user_id)) purchasesByUser.set(p.user_id, [])
      purchasesByUser.get(p.user_id).push(p)
    }

    let levelIncome = 0
    for (const [pUserId, userPurchases] of purchasesByUser) {
      const depth = userPurchases[0].depth
      const percentage = LEVEL_PERCENTAGES[depth] || 0
      if (percentage === 0) continue

      const firstPurchaseDate = DateTime.fromISO(userPurchases[0].approved_at.toISOString(), { zone: TZ }).startOf('day')
      const userAct = userPurchases[0].activated_at
        ? DateTime.fromISO(userPurchases[0].activated_at.toISOString(), { zone: TZ }).startOf('day')
        : firstPurchaseDate
      const startDate = firstPurchaseDate > userAct ? firstPurchaseDate : userAct
      const endDate = monthEnd.startOf('day')

      for (let date = startDate; date <= endDate; date = date.plus({ days: 1 })) {
        const cumulativeAmount = userPurchases
          .filter(p => {
            const approvedAt = DateTime.fromISO(p.approved_at.toISOString(), { zone: TZ }).endOf('day')
            if (approvedAt > date.endOf('day')) return false
            const expiry = approvedAt.plus({ months: 10 })
            if (date.endOf('day') > expiry) return false
            if (p.stopped_at) {
              const stoppedAt = DateTime.fromISO(p.stopped_at.toISOString(), { zone: TZ }).endOf('day')
              if (date.endOf('day') > stoppedAt) return false
            }
            return true
          })
          .reduce((sum, p) => sum + Number(p.amount), 0)

        if (cumulativeAmount === 0) continue
        const dailyReward = (cumulativeAmount * (percentage / 100) * 12) / 365
        levelIncome += dailyReward
      }
    }
    levelIncome = roundMoney(levelIncome)
    console.log(`  Level Income: ₹${levelIncome}`)

    // ─── 5. EMI Level Income ──────────────────────────
    const emiLevelIncome = 0
    console.log(`  EMI Level Income: ₹${emiLevelIncome}`)

    // ─── 6. Salary ──────────────────────────────────────
    const salaryRes = await c.query(
      "SELECT power, weaker FROM salaries WHERE user_id = $1 AND status = 'paid' AND paid_at >= $2 AND paid_at <= $3",
      [userId, monthStart.toSQL(), monthEnd.toSQL()]
    )
    const salary = salaryRes.rows.reduce((sum, s) => sum + (Number(s.power) + Number(s.weaker)), 0)
    console.log(`  Salary: ₹${salary}`)

    // ─── Calculate totals ──────────────────────────────
    const grossTotal = roundMoney(activationCashback + activationSponsor + activationLevel + levelIncome + emiLevelIncome + salary)
    const workingShare = roundMoney(grossTotal * INCOME_PERCENT)
    const repurchaseShare = roundMoney(grossTotal * REPURCHASE_PERCENT)

    console.log(`\n  ── TOTALS ──`)
    console.log(`  Gross Total: ₹${grossTotal}`)
    console.log(`  Working Share (70%): ₹${workingShare}`)
    console.log(`  Repurchase Share (20%): ₹${repurchaseShare}`)

    if (grossTotal <= 0) {
      console.log(`  No income to credit.`)
      continue
    }

    // ─── Create snapshot (upsert) ──────────────────────────
    const snapRes = await c.query(`
      INSERT INTO monthly_income_snapshots (user_id, month, gross_amount, income_wallet_amount, repurchase_wallet_amount, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id, month) DO UPDATE SET gross_amount = $3, income_wallet_amount = $4, repurchase_wallet_amount = $5, updated_at = NOW()
      RETURNING id
    `, [userId, monthStart.toSQL(), grossTotal, workingShare, repurchaseShare])
    console.log(`  ✓ Created/updated snapshot #${snapRes.rows[0].id}`)

    // ─── Credit wallets (only if not already done) ──────────
    if (existingTxns.rows.length < 2) {
      await c.query('UPDATE users SET working_wallet = working_wallet + $1, repurchase_wallet = repurchase_wallet + $2 WHERE id = $3',
        [workingShare, repurchaseShare, userId])
      console.log(`  ✓ Credited working_wallet +₹${workingShare}, repurchase_wallet +₹${repurchaseShare}`)

      const now = DateTime.now().setZone(TZ).toSQL()

      await c.query(`
        INSERT INTO transactions (id, user_id, type, amount, approved_at, remark, created_at, updated_at)
        VALUES ($1, $2, 'wallet_credit', $3, $4, $5, $6, $6)
      `, [cuid(), userId, workingShare, now,
        `Working wallet (70%) from working income for August 2026 — retroactive credit (inactivation was erroneous)`,
        now])
      console.log(`  ✓ Created working wallet credit transaction`)

      await c.query(`
        INSERT INTO transactions (id, user_id, type, amount, approved_at, remark, created_at, updated_at)
        VALUES ($1, $2, 'wallet_credit', $3, $4, $5, $6, $6)
      `, [cuid(), userId, repurchaseShare, now,
        `Repurchase wallet (20%) from working income for August 2026 — retroactive credit (inactivation was erroneous)`,
        now])
      console.log(`  ✓ Created repurchase wallet credit transaction`)
    } else {
      console.log(`  ℹ Wallets already credited. Skipping.`)
    }

    console.log(`\n  DONE PJ${userId}`)
  }

  // Verify final state
  console.log(`\n${'='.repeat(60)}`)
  console.log('FINAL VERIFICATION')
  console.log(`${'='.repeat(60)}`)

  for (const userId of [456594, 577611]) {
    const u = await c.query('SELECT id, name, status, income_wallet, repurchase_wallet, working_wallet, reward_wallet FROM users WHERE id = $1', [userId])
    console.log(`\nPJ${userId} (${u.rows[0].name}):`)
    console.log(`  Status: ${u.rows[0].status}`)
    console.log(`  Income Wallet: ₹${u.rows[0].income_wallet}`)
    console.log(`  Working Wallet: ₹${u.rows[0].working_wallet}`)
    console.log(`  Repurchase Wallet: ₹${u.rows[0].repurchase_wallet}`)
    console.log(`  Reward Wallet: ₹${u.rows[0].reward_wallet}`)

    const txns = await c.query("SELECT id, type, amount, remark, created_at FROM transactions WHERE user_id = $1 AND remark LIKE '%August 2026%' ORDER BY created_at", [userId])
    console.log(`  August transactions:`)
    for (const t of txns.rows) {
      console.log(`    ${t.type}: ₹${t.amount} — ${t.remark}`)
    }

    const snap = await c.query('SELECT * FROM monthly_income_snapshots WHERE user_id = $1 AND month >= $2', [userId, '2026-08-01'])
    if (snap.rows.length) {
      const s = snap.rows[0]
      console.log(`  Snapshot: gross=₹${s.gross_amount}, working=₹${s.income_wallet_amount}, repurchase=₹${s.repurchase_wallet_amount}`)
    }
  }

  await c.end()
  console.log('\n✅ ALL DONE')
}

main().catch(e => { console.error(e); process.exit(1) })

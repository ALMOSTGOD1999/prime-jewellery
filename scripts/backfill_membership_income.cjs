const { Client } = require('pg')
const { DateTime } = require('luxon')
const { createId } = require('@paralleldrive/cuid2')
require('dotenv').config()

const APPLY = process.argv.includes('--apply')
const MAX_LEVEL = 15

const LEVELS = [
  { level: 1, percentage: 10 }, { level: 2, percentage: 5 }, { level: 3, percentage: 2 },
  { level: 4, percentage: 1 }, { level: 5, percentage: 0.5 }, { level: 6, percentage: 0.5 },
  { level: 7, percentage: 0.25 }, { level: 8, percentage: 0.25 }, { level: 9, percentage: 0.25 },
  { level: 10, percentage: 0.25 }, { level: 11, percentage: 0.1 }, { level: 12, percentage: 0.1 },
  { level: 13, percentage: 0.1 }, { level: 14, percentage: 0.1 }, { level: 15, percentage: 0.1 },
]

const roundMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100
const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const remarkFor = (d, name, id) => `Membership Level Income (Level ${d}) from ${name} (ID ${id})`

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const nowSql = new Date().toISOString()

  // ---------- 1. SYNC CONFIG (idempotent upsert by level) ----------
  const cfgBefore = await client.query('SELECT level, percentage FROM membership_level_incomes ORDER BY level')
  console.log('=== CONFIG BEFORE ===')
  for (const r of cfgBefore.rows) console.log(`  L${r.level}: ${r.percentage}%`)
  for (const lv of LEVELS) {
    await client.query(
      `INSERT INTO membership_level_incomes (level, percentage, is_active, created_at, updated_at)
       VALUES ($1, $2, true, $3, $3)
       ON CONFLICT (level) DO UPDATE SET percentage = EXCLUDED.percentage, is_active = true, updated_at = EXCLUDED.updated_at`,
      [lv.level, lv.percentage, nowSql]
    )
  }
  // deactivate levels beyond MAX_LEVEL if any exist
  await client.query(
    `UPDATE membership_level_incomes SET is_active = false, updated_at = $2 WHERE level > $1`,
    [MAX_LEVEL, nowSql]
  )
  const cfgAfter = await client.query('SELECT level, percentage FROM membership_level_incomes WHERE is_active ORDER BY level')
  console.log('=== CONFIG AFTER (active) ===')
  for (const r of cfgAfter.rows) console.log(`  L${r.level}: ${r.percentage}%`)

  // ---------- 2. LOAD USERS ----------
  const users = await client.query(
    `SELECT id, name, parent_id, activated_at, activation_amount, income_wallet FROM users`
  )
  const byId = new Map(users.rows.map((u) => [u.id, u]))
  const pctByLevel = new Map(cfgAfter.rows.map((r) => [r.level, Number(r.percentage)]))
  const istDay = (ts) =>
    DateTime.fromJSDate(new Date(ts), { zone: 'utc' }).setZone('Asia/Kolkata').startOf('day').toISODate()

  // ---------- 3. COMPUTE EXPECTED CREDITS (per activated upline) ----------
  // For each ACTIVATED user U (the earner), walk descendants (parent_id chain) at
  // depth 1..15; a descendant M qualifies if M.activated_at NOT NULL and
  // istDay(M.activated_at) >= istDay(U.activated_at) (same-day-or-after rule).
  // amount = roundMoney(M.activation_amount * pct[level] / 100)
  const expected = [] // { uplineId, memberId, memberName, level, amount, approvedAt }
  const uplines = users.rows.filter((u) => u.activated_at)

  for (const upline of uplines) {
    const uDay = istDay(upline.activated_at)
    // BFS descendants
    const queue = [{ id: upline.id, depth: 0 }]
    while (queue.length) {
      const cur = queue.shift()
      const kids = users.rows.filter((u) => u.parent_id === cur.id)
      for (const kid of kids) {
        const depth = cur.depth + 1
        if (depth > MAX_LEVEL) continue
        const pct = pctByLevel.get(depth)
        if (pct) {
          if (kid.activated_at && istDay(kid.activated_at) >= uDay) {
            const amount = roundMoney((Number(kid.activation_amount) || 0) * (pct / 100))
            if (amount > 0) {
              expected.push({
                uplineId: upline.id,
                uplineName: upline.name,
                memberId: kid.id,
                memberName: kid.name,
                level: depth,
                amount,
                approvedAt: kid.activated_at,
              })
            }
          }
        }
        queue.push({ id: kid.id, depth })
      }
    }
  }

  console.log(`\n=== EXPECTED CREDITS (${expected.length}) ===`)
  const byLevel = new Map()
  for (const e of expected) {
    byLevel.set(e.level, (byLevel.get(e.level) || 0) + 1)
  }
  for (const [lv, cnt] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    const sum = expected.filter((e) => e.level === lv).reduce((s, e) => s + e.amount, 0)
    console.log(`  Level ${String(lv).padStart(2)}: ${String(cnt).padStart(4)} credit(s), total ₹${fmt(sum)}`)
  }
  const totalExpected = expected.reduce((s, e) => s + e.amount, 0)
  console.log(`TOTAL EXPECTED: ${expected.length} credits, ₹${fmt(totalExpected)}`)

  // ---------- 4. DEDUP against existing membership-level-income txns ----------
  const existing = await client.query(
    `SELECT user_id, remark FROM transactions WHERE remark LIKE 'Membership Level Income%'`
  )
  const existingKeys = new Set(existing.rows.map((r) => `${r.user_id}|${r.remark}`))
  const todo = expected.filter((e) => !existingKeys.has(`${e.uplineId}|${remarkFor(e.level, e.memberName, e.memberId)}`))
  console.log(`\n=== TO CREDIT (${todo.length} after dedup) ===`)

  // PJ 577611 detail
  const pj = todo.filter((e) => e.uplineId === 577611)
  console.log(`\n-- PJ577611 (Biplab Banerjee): ${pj.length} credit(s), ₹${fmt(pj.reduce((s, e) => s + e.amount, 0))} --`)
  for (const e of pj) {
    console.log(
      `  L${String(e.level).padStart(2)} ₹${fmt(e.amount).padStart(8)}  #${e.memberId} ${e.memberName} (${DateTime.fromJSDate(new Date(e.approvedAt)).setZone('Asia/Kolkata').toFormat('dd-MM-yyyy')})`
    )
  }
  console.log(`\n  (${todo.length - pj.length} credits for other uplines)`)

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write (config sync + credits).')
    await client.end()
    return
  }

  // ---------- 5. APPLY (bulk) ----------
  try {
    await client.query('BEGIN')
    const ids = todo.map(() => createId())
    const userIds = todo.map((e) => e.uplineId)
    const amounts = todo.map((e) => e.amount)
    const remarks = todo.map((e) => remarkFor(e.level, e.memberName, e.memberId))
    const approvedAts = todo.map((e) => new Date(e.approvedAt).toISOString())
    const createdAts = Array(todo.length).fill(nowSql)

    const insertRes = await client.query(
      `INSERT INTO transactions (id, user_id, amount, type, remark, approved_at, created_at, updated_at)
       SELECT id, user_id, amount, 'wallet_credit', remark, approved_at, created_at, created_at
       FROM unnest($1::text[], $2::int[], $3::numeric[], $4::text[], $5::timestamptz[], $6::timestamptz[])
         AS t(id, user_id, amount, remark, approved_at, created_at)`,
      [ids, userIds, amounts, remarks, approvedAts, createdAts]
    )

    const walletRes = await client.query(
      `UPDATE users SET income_wallet = income_wallet + t.total, updated_at = $2
       FROM (
         SELECT user_id, SUM(amount) AS total
         FROM transactions
         WHERE remark LIKE 'Membership Level Income %' AND user_id = ANY($1::int[])
         GROUP BY user_id
       ) t
       WHERE users.id = t.user_id`,
      [userIds, nowSql]
    )
    await client.query('COMMIT')
    console.log(
      `\nAPPLIED: config synced, ${insertRes.rowCount} credit(s) inserted, ${walletRes.rowCount} wallet(s) incremented. Total ₹${fmt(totalExpected)}`
    )
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('ERROR (rolled back):', e.message)
    process.exit(1)
  }

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})

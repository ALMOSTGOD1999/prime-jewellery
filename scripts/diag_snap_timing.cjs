/* Read-only: snapshot timing + salaries + level income config */
const { Client } = require('pg')
require('dotenv').config()
const q = async (c, s, p = []) => (await c.query(s, p)).rows
async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('=== SNAPSHOT CREATED/UPDATED TIMES (July) ===')
  const s = await q(
    c,
    `SELECT min(created_at) mn, max(created_at) mx, min(paid_out_at) pmn, max(paid_out_at) pmx, count(*) n FROM monthly_income_snapshots WHERE month='2026-07-01'`
  )
  console.log(s)
  console.log('=== TOP GROSS SNAPSHOTS ===')
  const t = await q(
    c,
    `SELECT s.user_id, u.name, round(s.gross_amount::numeric,2) gross, s.created_at FROM monthly_income_snapshots s JOIN users u ON u.id=s.user_id WHERE s.month='2026-07-01' ORDER BY gross_amount DESC LIMIT 15`
  )
  for (const r of t) console.log(`  #${r.user_id} ${String(r.name || '').slice(0, 22)} gross=${r.gross} created=${String(r.created_at).slice(0, 19)}`)
  console.log('=== SALARIES (created in July) ===')
  const sal = await q(
    c,
    `SELECT status, count(*) n, min(created_at) mn, max(created_at) mx, min(paid_at) pmn, max(paid_at) pmx FROM salaries WHERE created_at >= '2026-07-01' AND created_at < '2026-08-01' GROUP BY status`
  )
  console.log(sal)
  console.log('=== LEVEL INCOME config percentages (sample) ===')
  const li = await q(c, `SELECT depth, percentage, name FROM level_incomes ORDER BY depth LIMIT 15`)
  console.log(li)
  console.log('=== SALARIES ALL (last 15) ===')
  const sa2 = await q(c, `SELECT user_id, status, power, weaker, qualifying_business, info, created_at, paid_at FROM salaries ORDER BY created_at DESC LIMIT 15`)
  for (const r of sa2) console.log(`  #${r.user_id} ${r.status} qb=${r.qualifying_business} info=${JSON.stringify(r.info)} created=${String(r.created_at).slice(0, 19)} paid=${String(r.paid_at || '').slice(0, 19)}`)
  await c.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

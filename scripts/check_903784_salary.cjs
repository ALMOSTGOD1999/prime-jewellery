const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Check if resolveMonthlySalary was ever called for this user
  const salRes = await c.query('SELECT * FROM salaries WHERE user_id = 903784')
  console.log(`Salary records: ${salRes.rows.length}`)
  for (const r of salRes.rows) {
    console.log(`  ${JSON.stringify(r)}`)
  }

  // Check how the income payout was applied
  // The income payout sets income_wallet_payout_month = '2026-08'
  // But resolveMonthlySalary is called BEFORE snapshotting
  // Let's check the payout flow
  const cfgRes = await c.query("SELECT key, value FROM platform_configs WHERE key LIKE '%payout%' ORDER BY key")
  console.log('\nPayout configs:')
  for (const r of cfgRes.rows) {
    const val = r.value?.substring(0, 100)
    console.log(`  ${r.key} = ${val}${r.value?.length > 100 ? '...' : ''}`)
  }

  // The payout_service calls resolveMonthlySalary for EACH active user
  // It's called at line 246 of payout_service.ts
  // Let's check if the income payout was even run for August
  const incomeMonthRes = await c.query("SELECT value FROM platform_configs WHERE key = 'income_wallet_payout_month'")
  console.log('\nIncome wallet payout month:', incomeMonthRes.rows[0]?.value)

  // Check if there's a salary record that should exist
  // resolveMonthlySalary creates a salary with status='paid' and paid_at in the month
  // Then the snapshot query picks it up via: .where('status', 'paid').whereBetween('paid_at', ...)
  
  // The issue might be: resolveMonthlySalary was called but returned 'not-eligible'
  // because the leg calculation uses a 5-month window (windowStart = targetMonth - 5 months)
  // For August: windowStart = March 1, 2026
  // But child PJ222870 (SOMA KAR) was activated Sept 1, 2026 — AFTER August
  // So in August, only 2 children were active

  console.log('\n=== Re-analyzing with August-only children ===')
  console.log('Child PJ222870 (SOMA KAR) activated Sept 1 — not in August!')
  console.log('In August, PJ903784 had only 2 direct children:')
  console.log('  PJ759438 (Tarak Nath): ₹160,700')
  console.log('  PJ449179 (Ajoy Kansa Banik): ₹714,000')

  // Power/weaker with 2 children
  const power = 714000
  const weaker = 160700
  const total = power + weaker
  const otherLegs = weaker

  console.log(`\nPower: ₹${power}, Weaker: ₹${weaker}, Total: ₹${total}`)
  
  // But wait - getPowerAndWeaker uses a 5-month window and looks at ALL descendants of each child
  // Let's recheck with the correct window
  console.log('\n=== Re-checking with 5-month window (March-August) ===')
  
  const child1 = await c.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 903784 AND id != 222870
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT d.id, u.name FROM descendants d JOIN users u ON d.id = u.id
  `)
  console.log('Active children in August:', child1.rows.map(r => `PJ${r.id} (${r.name})`).join(', '))

  // Actually getPowerAndWeaker queries direct children, then for each child gets their subtree
  // Child PJ222870 existed in August (parent_id=903784) but was activated in September
  // The code at line 1406: const directChildren = await user.related('children').query()
  // This gets ALL children, including PJ222870, regardless of activation status
  // BUT their purchases wouldn't count if not approved yet

  // Wait - PJ222870 was activated Sept 1. Their purchase was approved after that.
  // So in the March-Aug window, PJ222870 has ₹0 purchases.
  // That means in the leg calculation:
  // Child 1 (Tarak): ₹160,700
  // Child 2 (Ajoy): ₹714,000  
  // Child 3 (Soma): ₹0
  // Power: ₹714,000, Weaker: ₹160,700 + ₹0 = ₹160,700
  // Total: ₹874,700

  // Hmm wait, the window is targetMonth - 5 months. For August: March 1 to August 31.
  // But the code at line 1492: const windowStart = targetMonth.minus({ months: 5 }).startOf('month')
  // So for August: March 1
  // For September: April 1

  // The issue: resolveMonthlySalary is called from the income wallet payout
  // Which happens when income_wallet_payout_month is set
  // Let's check if the salary was calculated but with a different result

  // Actually, let me look at the income wallet payout flow more carefully
  // The income wallet payout is at line ~135 of payout_service.ts
  // It calls resolveMonthlySalary at line 246
  // Then snapshots at line ~260

  // The snapshot for PJ903784 shows salary=0
  // This means either resolveMonthlySalary returned 'not-eligible' 
  // or it wasn't called at all

  // Let me check: does the income payout only apply to users who had no previous payout?
  const allSalaries = await c.query(`
    SELECT user_id, COUNT(*) as cnt FROM salaries GROUP BY user_id ORDER BY cnt DESC LIMIT 10
  `)
  console.log('\nTop salary records by user:')
  for (const r of allSalaries.rows) {
    console.log(`  User ${r.user_id}: ${r.cnt} records`)
  }

  // Check total salary records
  const totalSal = await c.query('SELECT COUNT(*) as cnt FROM salaries')
  console.log(`\nTotal salary records: ${totalSal.rows[0].cnt}`)

  // Check how many users got salary in the August snapshot
  const snapRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snap = JSON.parse(snapRes.rows[0].value)
  const usersWithSalary = snap.users.filter(u => u.workingWallet?.salary > 0)
  console.log(`\nUsers with salary > 0 in August snapshot: ${usersWithSalary.length}`)
  for (const u of usersWithSalary.slice(0, 10)) {
    console.log(`  PJ${u.userId} (${u.userName}): salary=₹${u.workingWallet.salary}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

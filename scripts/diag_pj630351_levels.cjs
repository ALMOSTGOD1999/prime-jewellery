const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const q = async (sql, p = []) => (await client.query(sql, p)).rows

  // 1. Team Business Levels config
  console.log('=== TEAM BUSINESS LEVELS ===')
  const tbl = await q('SELECT * FROM team_business_levels WHERE is_active = true ORDER BY level')
  for (const r of tbl) console.log(`  Level ${r.level}: min_business=${r.min_business}`)

  // 2. Level Income config
  console.log('\n=== LEVEL INCOME CONFIG ===')
  const li = await q('SELECT * FROM level_incomes WHERE is_active = true ORDER BY level')
  for (const r of li) console.log(`  Level ${r.level}: percentage=${r.percentage}%, min_directs=${r.min_directs}, min_team_business_level=${r.min_team_business_level}`)

  // 3. Simulate for PJ630351
  console.log('\n=== SIMULATION FOR PJ630351 ===')
  const directCount = 1
  const teamBusiness = 400000

  // TeamBusinessLevel.getLevelForBusiness(400000)
  let matchedTeamLevel = 0
  for (const r of tbl) {
    if (teamBusiness >= r.min_business) matchedTeamLevel = r.level
    else break
  }
  console.log(`Team business level for ₹${teamBusiness}: ${matchedTeamLevel}`)

  // LevelIncome.getMaxUnlockedLevel(1, matchedTeamLevel)
  let maxDepth = 0
  for (const r of li) {
    if (directCount >= r.min_directs && matchedTeamLevel >= r.min_team_business_level) {
      maxDepth = r.level
      break // DESC order, first match is highest
    }
  }
  console.log(`Max unlocked level: ${maxDepth}`)

  // LevelIncome.getPercentageForLevel(depth)
  const p1 = await q('SELECT percentage FROM level_incomes WHERE level = 1 AND is_active = true')
  const p2 = await q('SELECT percentage FROM level_incomes WHERE level = 2 AND is_active = true')
  const p3 = await q('SELECT percentage FROM level_incomes WHERE level = 3 AND is_active = true')
  console.log(`L1%=${p1[0]?.percentage} L2%=${p2[0]?.percentage} L3%=${p3[0]?.percentage}`)

  // 4. What if maxDepth = 0? Then getLevelRewards returns thisMonthRewards=0
  // But snapshot shows ₹4,176.81... so where does the income come from?
  
  // 5. Check if there are OTHER income sources not in the working income calc
  console.log('\n=== CHECK: ALL transactions for user 630351 ===')
  const allTxns = await q('SELECT id, type, amount, remark, approved_at FROM transactions WHERE user_id = 630351 ORDER BY approved_at')
  for (const t of allTxns) console.log(`  ${t.type} ₹${t.amount} | ${t.remark?.substring(0, 80)} | ${t.approved_at}`)

  // 6. Check if snapshot has income_details via raw SQL
  console.log('\n=== SNAPSHOT: all columns ===')
  const snap = await q('SELECT * FROM monthly_income_snapshots WHERE id = 1511')
  console.log(JSON.stringify(snap[0], null, 2))

  // 7. Check if there are other income detail tables
  console.log('\n=== ALL TABLES ===')
  const tables = await q("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  for (const t of tables) console.log(`  ${t.table_name}`)

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })

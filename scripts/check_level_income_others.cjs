const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // Get all users who had level income in August payout
  // Check the payout_preview_2026-08 config
  const config = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  if (config.rows.length === 0) {
    console.log('No August payout preview found')
    await c.end()
    return
  }

  const preview = JSON.parse(config.rows[0].value)
  
  // Find users with level income > 0
  const usersWithLevelIncome = preview.users.filter(u => u.workingWallet && u.workingWallet.levelIncome > 0)
  
  console.log(`=== Users with level income in August payout: ${usersWithLevelIncome.length} ===\n`)
  
  for (const u of usersWithLevelIncome) {
    console.log(`PJ${u.userId} (${u.userName}): levelIncome = ₹${u.workingWallet.levelIncome}`)
    
    // Check their children's purchases to see expected level income
    const directCountRes = await c.query('SELECT COUNT(*) as cnt FROM users WHERE parent_id = $1', [u.userId])
    const directCount = Number(directCountRes.rows[0].cnt)
    
    // Get team business
    const teamBizRes = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT COALESCE(SUM(p.amount), 0)::float as total
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
    `, [u.userId])
    const teamBusiness = Number(teamBizRes.rows[0].total)
    
    // Get descendant purchases
    const maxLvlDepth = directCount >= 2 ? 25 : directCount >= 1 ? 2 : 0
    if (maxLvlDepth === 0) continue
    
    const purchases = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, activated_at, 1 as depth FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id, u.parent_id, u.activated_at, d.depth + 1
        FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < $2
      )
      SELECT d.id as user_id, d.depth, d.activated_at, p.amount, p.approved_at
      FROM descendants d
      JOIN purchases p ON p.user_id = d.id
      WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
      AND p.approved_at >= '2026-08-01' AND p.approved_at < '2026-09-01'
      ORDER BY d.depth, p.approved_at
    `, [u.userId, maxLvlDepth])
    
    if (purchases.rows.length > 0) {
      console.log(`  Descendant purchases in August:`)
      for (const p of purchases.rows) {
        const daysInAug = Math.max(1, 31 - new Date(p.approved_at).getDate() + 1)
        const dailyCalc = (Number(p.amount) * ({ 1: 1.00, 2: 0.50, 3: 0.20, 4: 0.15 }[p.depth] || 0) / 100 * 12 / 365 * daysInAug)
        const flatCalc = Number(p.amount) * ({ 1: 1.00, 2: 0.50, 3: 0.20, 4: 0.15 }[p.depth] || 0) / 100
        console.log(`    Depth ${p.depth}: ₹${p.amount} (approved ${new Date(p.approved_at).toISOString().split('T')[0]}, ${daysInAug} days)`)
        console.log(`      Daily pro-rata: ₹${dailyCalc.toFixed(2)} vs Flat 1%: ₹${flatCalc.toFixed(2)}`)
      }
    }
    console.log('')
  }

  // Also check: are there any OTHER users who were inactivated and might have missed income?
  console.log('\n=== Users inactivated (besides 456594 and 577611) ===')
  const inactive = await c.query(`
    SELECT id, name, status, activated_at, updated_at 
    FROM users 
    WHERE status = 'inactive' 
    AND activated_at IS NOT NULL 
    AND role = 'user'
    AND id NOT IN (456594, 577611)
    ORDER BY updated_at DESC
  `)
  if (inactive.rows.length > 0) {
    for (const u of inactive.rows) {
      console.log(`  PJ${u.id} (${u.name}): inactivated ${u.updated_at}`)
    }
  } else {
    console.log('  None found')
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

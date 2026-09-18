const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()

  // PJ456594 was credited 3 times but should only have 1 credit
  // Correct: working_wallet = 293.60, repurchase_wallet = 83.89
  // Current: working_wallet = 880.80, repurchase_wallet = 251.67
  // Need to remove 2 extra credits

  const userId = 456594
  const correctWorking = 293.60
  const correctRepurchase = 83.89

  // Check current wallets
  const u = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  const currentWorking = Number(u.rows[0].working_wallet)
  const currentRepurchase = Number(u.rows[0].repurchase_wallet)

  console.log(`PJ${userId} current: working=₹${currentWorking}, repurchase=₹${currentRepurchase}`)
  console.log(`Should be: working=₹${correctWorking}, repurchase=₹${correctRepurchase}`)

  const fixWorking = correctWorking - currentWorking
  const fixRepurchase = correctRepurchase - currentRepurchase

  console.log(`Fixing: working ${fixWorking}, repurchase ${fixRepurchase}`)

  // Fix wallets
  await c.query('UPDATE users SET working_wallet = working_wallet + $1, repurchase_wallet = repurchase_wallet + $2 WHERE id = $3',
    [fixWorking, fixRepurchase, userId])

  // Check all retroactive transactions
  const txns = await c.query(
    "SELECT id, amount, remark FROM transactions WHERE user_id = $1 AND remark LIKE '%retroactive%' ORDER BY created_at",
    [userId]
  )
  console.log(`\nRetroactive transactions (${txns.rows.length}):`)
  for (const t of txns.rows) {
    console.log(`  ${t.id}: ₹${t.amount} — ${t.remark}`)
  }

  // Delete all but the first pair
  if (txns.rows.length > 2) {
    const idsToDelete = txns.rows.slice(2).map(t => t.id)
    console.log(`\nDeleting extra transactions: ${idsToDelete.join(', ')}`)
    await c.query('DELETE FROM transactions WHERE id = ANY($1)', [idsToDelete])
  }

  // Verify final state
  const final = await c.query('SELECT working_wallet, repurchase_wallet FROM users WHERE id = $1', [userId])
  console.log(`\nFinal PJ${userId}: working=₹${final.rows[0].working_wallet}, repurchase=₹${final.rows[0].repurchase_wallet}`)

  const finalTxns = await c.query(
    "SELECT id, amount, remark FROM transactions WHERE user_id = $1 AND remark LIKE '%retroactive%' ORDER BY created_at",
    [userId]
  )
  console.log(`Remaining retroactive transactions (${finalTxns.rows.length}):`)
  for (const t of finalTxns.rows) {
    console.log(`  ${t.id}: ₹${t.amount} — ${t.remark}`)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

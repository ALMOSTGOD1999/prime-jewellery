const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const q = async (sql, p = []) => (await client.query(sql, p)).rows

  // 1. Full user record
  console.log('=== PJ630351 full user record ===')
  const u = await q(`SELECT * FROM users WHERE id = 630351`)
  console.log(u[0] || 'NOT FOUND')

  // 2. PJ932914 (child) investments
  console.log('\n=== PJ932914 (SUBIR BOSE 1) investments ===')
  const childInvs = await q('SELECT id, user_id, purchase_id, amount, status, started_at, closed_at FROM investments WHERE user_id = 932914')
  console.log('Investments:', childInvs.length)
  for (const i of childInvs) console.log('  id=' + i.id + ' amount=' + i.amount + ' status=' + i.status + ' started=' + i.started_at)

  const childPurchases = await q('SELECT id, user_id, amount, approved_at, cancelled_at FROM purchases WHERE user_id = 932914')
  console.log('Purchases:', childPurchases.length)
  for (const p of childPurchases) console.log('  id=' + p.id + ' amount=' + p.amount + ' approved=' + p.approved_at)

  // 3. Investment packages
  console.log('\n=== Investment packages ===')
  const pkgs = await q('SELECT id, name, min_amount, max_amount, monthly_return_percent, max_return_percent FROM investment_packages WHERE is_active = true ORDER BY min_amount')
  for (const p of pkgs) console.log('  id=' + p.id + ' name=' + p.name + ' min=' + p.min_amount + ' max=' + p.max_amount + ' return=' + p.monthly_return_percent + '% max_return=' + p.max_return_percent + '%')

  // 4. Any purchase records referencing 630351 at all
  console.log('\n=== Purchases for user_id=630351 ===')
  const anyPurchases = await q('SELECT * FROM purchases WHERE user_id = 630351')
  console.log('Found:', anyPurchases.length)

  // 5. Any investment records for 630351
  console.log('\n=== Investments for user_id=630351 ===')
  const anyInvs = await q('SELECT * FROM investments WHERE user_id = 630351')
  console.log('Found:', anyInvs.length)

  // 6. Check what gold_package_id=1 maps to
  console.log('\n=== gold_package_id=1 lookup ===')
  const gp = await q('SELECT * FROM investment_packages WHERE id = 1')
  console.log(gp[0] || 'NOT FOUND')

  // 7. Check if PJ630351's total_purchase_value in CSV was from a purchase that got lost
  console.log('\n=== All purchases > 300000 ===')
  const bigPurchases = await q('SELECT id, user_id, amount, approved_at, cancelled_at, stopped_at FROM purchases WHERE amount > 300000 ORDER BY amount DESC LIMIT 20')
  for (const p of bigPurchases) console.log('  user=' + p.user_id + ' id=' + p.id + ' amount=' + p.amount + ' approved=' + p.approved_at + ' cancelled=' + p.cancelled_at)

  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })

const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()
  const cfgRes = await c.query("SELECT value FROM platform_configs WHERE key = 'payout_preview_2026-08'")
  const snapshot = JSON.parse(cfgRes.rows[0].value)

  // Check the structure of a user with level income
  const u = snapshot.users.find(u => u.userId === 408872)
  console.log('User keys:', Object.keys(u))
  console.log('Working wallet:', JSON.stringify(u.workingWallet, null, 2))
  console.log('Repurchase wallet:', JSON.stringify(u.repurchaseWallet, null, 2))

  // Check another user
  const u2 = snapshot.users.find(u => u.userId === 444473)
  if (u2) {
    console.log('\nPJ444473 working wallet:', JSON.stringify(u2.workingWallet, null, 2))
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })

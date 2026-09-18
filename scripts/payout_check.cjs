const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  await client.connect();

  const cfg = await client.query(`SELECT key, value FROM platform_configs WHERE key IN ('income_wallet_payout_month','working_wallet_payout_month')`);
  console.log('=== Payout Month Status ===');
  for (const r of cfg.rows) console.log(`  ${r.key}: ${r.value || '(empty)'}`);

  // Check unpaid distributions for August
  const unpaidIncome = await client.query(`
    SELECT count(*) as c FROM investment_return_distributions
    WHERE period_month = '2026-08-01' AND paid_out_at IS NULL
  `);
  console.log('\n=== August Income (Cashback) ===');
  console.log(`  Unpaid distributions: ${unpaidIncome.rows[0].c}`);

  const paidIncome = await client.query(`
    SELECT count(*) as c FROM investment_return_distributions
    WHERE period_month = '2026-08-01' AND paid_out_at IS NOT NULL
  `);
  console.log(`  Paid distributions: ${paidIncome.rows[0].c}`);

  // Check unpaid snapshots for August
  const unpaidWorking = await client.query(`
    SELECT count(*) as c FROM monthly_income_snapshots
    WHERE month = '2026-08-01' AND paid_out_at IS NULL
  `);
  console.log('\n=== August Working Wallet ===');
  console.log(`  Unpaid snapshots: ${unpaidWorking.rows[0].c}`);

  const paidWorking = await client.query(`
    SELECT count(*) as c FROM monthly_income_snapshots
    WHERE month = '2026-08-01' AND paid_out_at IS NOT NULL
  `);
  console.log(`  Paid snapshots: ${paidWorking.rows[0].c}`);

  const totalSnapshots = await client.query(`
    SELECT count(*) as c FROM monthly_income_snapshots WHERE month = '2026-08-01'
  `);
  console.log(`  Total snapshots: ${totalSnapshots.rows[0].c}`);

  // Wallet balances
  const wallets = await client.query(`
    SELECT
      coalesce(sum(income_wallet), 0)::float as total_income,
      coalesce(sum(working_wallet), 0)::float as total_working,
      coalesce(sum(repurchase_wallet), 0)::float as total_repurchase
    FROM users WHERE role = 'user'
  `);
  console.log('\n=== Current Wallet Balances ===');
  console.log(`  Income: ₹${wallets.rows[0].total_income}`);
  console.log(`  Working: ₹${wallets.rows[0].total_working}`);
  console.log(`  Repurchase: ₹${wallets.rows[0].total_repurchase}`);

  // Locks
  const locks = await client.query(`SELECT key, value FROM platform_configs WHERE key LIKE '%in_progress%'`);
  console.log('\n=== Locks ===');
  for (const r of locks.rows) console.log(`  ${r.key}: ${r.value || '(free)'}`);

  await client.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

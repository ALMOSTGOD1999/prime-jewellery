const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  await client.connect();

  console.log('=== Step 1: Reset August income payout state ===');

  // Reset income wallet payout month so re-processing is allowed
  await client.query(`UPDATE platform_configs SET value = '' WHERE key = 'income_wallet_payout_month'`);
  console.log('  Cleared income_wallet_payout_month');

  // Reset paid_out_at on August distributions so they can be re-credited
  const resetDists = await client.query(`
    UPDATE investment_return_distributions
    SET paid_out_at = NULL,
        gold_transaction_id = NULL,
        income_wallet_transaction_id = NULL
    WHERE period_month = '2026-08-01' AND paid_out_at IS NOT NULL
  `);
  console.log(`  Reset ${resetDists.rowCount} income distributions for August`);

  // Delete the wallet credit transactions from the previous income payout
  const deletedTxns = await client.query(`
    DELETE FROM transactions
    WHERE remark ILIKE '%August 2026%'
      AND (remark ILIKE '%Cashback wallet%' OR remark ILIKE '%Repurchase wallet%')
      AND remark ILIKE '%investment return%'
      AND type = 'wallet_credit'
  `);
  console.log(`  Deleted ${deletedTxns.rowCount} old income payout transactions`);

  // Verify reset
  const unpaid = await client.query(`
    SELECT count(*) as c FROM investment_return_distributions
    WHERE period_month = '2026-08-01' AND paid_out_at IS NULL
  `);
  console.log(`  Unpaid distributions now: ${unpaid.rows[0].c}`);

  console.log('\n=== Step 2: Reset August working payout state ===');
  await client.query(`UPDATE platform_configs SET value = '' WHERE key = 'working_wallet_payout_month'`);
  console.log('  Cleared working_wallet_payout_month');

  // Delete old working payout transactions
  const deletedWorking = await client.query(`
    DELETE FROM transactions
    WHERE remark ILIKE '%August 2026%'
      AND (remark ILIKE '%Working wallet%' OR remark ILIKE '%Repurchase wallet%')
      AND remark ILIKE '%working income%'
      AND type = 'wallet_credit'
  `);
  console.log(`  Deleted ${deletedWorking.rowCount} old working payout transactions`);

  // Delete old snapshots
  const deletedSnaps = await client.query(`
    DELETE FROM monthly_income_snapshots WHERE month = '2026-08-01'
  `);
  console.log(`  Deleted ${deletedSnaps.rowCount} old snapshots`);

  // Release any stuck locks
  await client.query(`UPDATE platform_configs SET value = '' WHERE key LIKE '%in_progress%'`);
  console.log('  Released all locks');

  // Verify wallets are still zero
  const wallets = await client.query(`
    SELECT
      coalesce(sum(income_wallet), 0)::float as ti,
      coalesce(sum(working_wallet), 0)::float as tw,
      coalesce(sum(repurchase_wallet), 0)::float as tr
    FROM users WHERE role = 'user'
  `);
  console.log(`\n  Wallets: Income=₹${wallets.rows[0].ti} Working=₹${wallets.rows[0].tw} Repurchase=₹${wallets.rows[0].tr}`);

  console.log('\n✅ Reset complete. Ready for re-payout.');

  await client.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

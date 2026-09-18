const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
c.connect().then(async () => {
  // Check purchases - now should be 0
  const p = await c.query("SELECT count(*) as c FROM purchases WHERE approved_at >= '2026-09-01' AND cancelled_at IS NULL");
  console.log('Purchases approved Sep 1+:', p.rows[0].c);

  // Check investments
  const i = await c.query("SELECT count(*) as c FROM investments WHERE started_at >= '2026-09-01'");
  console.log('Investments Sep 1+:', i.rows[0].c);

  // Check wallet transactions in Sep
  const t = await c.query("SELECT count(*) as c FROM transactions WHERE created_at >= '2026-09-01'");
  console.log('Transactions in Sep:', t.rows[0].c);

  // Check monthly_income_snapshots
  const s = await c.query("SELECT count(*) as c FROM monthly_income_snapshots WHERE month = '2026-08-01' AND paid_out_at IS NOT NULL");
  console.log('Aug snapshots paid:', s.rows[0].c);

  // Check distributions
  const d = await c.query("SELECT count(*) as c FROM investment_return_distributions WHERE period_month = '2026-08-01' AND paid_out_at IS NOT NULL");
  console.log('Aug distributions paid:', d.rows[0].c);

  // Check platform config
  const cfg = await c.query("SELECT key, value FROM platform_configs WHERE key IN ('income_wallet_payout_month', 'working_wallet_payout_month', 'visible_cutoff')");
  console.log('Config:', cfg.rows);

  await c.end();
});

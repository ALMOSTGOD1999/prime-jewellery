const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
c.connect().then(async () => {
  const ids = [449179, 198730, 456594];
  for (const id of ids) {
    console.log(`\n═══ PJ${id} ═══`);

    // Basic user info
    const u = await c.query("SELECT id, name, status, activated_at FROM users WHERE id = $1", [id]);
    console.log('User:', u.rows[0]);

    // Direct children
    const kids = await c.query("SELECT count(*) as c FROM users WHERE parent_id = $1", [id]);
    console.log('Direct children:', kids.rows[0].c);

    // Snapshot
    const snap = await c.query("SELECT gross_amount, income_wallet_amount, repurchase_wallet_amount, paid_out_at FROM monthly_income_snapshots WHERE user_id = $1 AND month = '2026-08-01'", [id]);
    console.log('Snapshot:', snap.rows[0] || 'NONE');

    // Wallet balances
    const wallet = await c.query("SELECT working_wallet, repurchase_wallet, income_wallet FROM users WHERE id = $1", [id]);
    console.log('Wallet:', wallet.rows[0]);

    // Salary
    const sal = await c.query("SELECT power, weaker, qualifying_business, status FROM salaries WHERE user_id = $1 AND created_at >= '2026-08-01' AND created_at < '2026-09-01'", [id]);
    console.log('Salary:', sal.rows[0] || 'NONE');

    // Descendant purchases (all time)
    const descAll = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT count(*) as c, coalesce(sum(p.amount),0)::float as total
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
    `, [id]);
    console.log('All descendant purchases:', descAll.rows[0]);

    // August descendant purchases
    const descAug = await c.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT count(*) as c, coalesce(sum(p.amount),0)::float as total
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at >= '2026-08-01' AND p.approved_at < '2026-09-01' AND p.cancelled_at IS NULL
    `, [id]);
    console.log('Aug descendant purchases:', descAug.rows[0]);

    // Wallet transactions for this user (recent)
    const txns = await c.query("SELECT type, amount, remark, created_at FROM transactions WHERE user_id = $1 AND created_at >= '2026-08-01' ORDER BY created_at DESC LIMIT 5", [id]);
    console.log('Recent transactions:', txns.rows);
  }
  await c.end();
});

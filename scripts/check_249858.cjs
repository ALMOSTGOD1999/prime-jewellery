const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // 1. User info
  const user = await client.query('SELECT id, name, email, phone, status, activated_at, parent_id, leg FROM users WHERE id = 249858');
  console.log('=== USER ===');
  console.log(JSON.stringify(user.rows[0], null, 2));
  if (!user.rows[0]) { console.log('User not found'); await client.end(); return; }

  // 2. Direct children
  const dc = await client.query('SELECT COUNT(*)::int as total FROM users WHERE parent_id = 249858');
  console.log('\nDirect children: ' + dc.rows[0].total);

  // 3. Descendants with depth
  const desc = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, name, parent_id, leg, 1 as depth FROM users WHERE parent_id = 249858
      UNION ALL
      SELECT u.id, u.name, u.parent_id, u.leg, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 24
    )
    SELECT * FROM descendants ORDER BY depth, id
  `);
  console.log('\n=== DESCENDANTS (' + desc.rows.length + ' total) ===');
  desc.rows.forEach(d => console.log('  L' + d.depth + ' PJ' + String(d.id).padStart(6,'0') + ' ' + d.name + ' leg=' + d.leg));

  // 4. Team business
  const tb = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 249858
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT COALESCE(SUM(p.amount), 0)::float as total
    FROM descendants d
    LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
  `);
  console.log('\nTeam business: Rs ' + Number(tb.rows[0].total).toLocaleString('en-IN'));

  // 5. Purchases by descendants
  const purchases = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 249858
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT p.id, p.user_id, p.amount, p.approved_at, p.cancelled_at, p.stopped_at, u2.name as user_name
    FROM purchases p
    JOIN descendants d ON p.user_id = d.id
    JOIN users u2 ON u2.id = p.user_id
    WHERE p.approved_at IS NOT NULL
    ORDER BY p.approved_at ASC
  `);
  console.log('\n=== PURCHASES (' + purchases.rows.length + ' total) ===');
  purchases.rows.forEach(p => console.log('  PJ' + String(p.user_id).padStart(6,'0') + ' ' + p.user_name + ' Rs ' + Number(p.amount).toLocaleString('en-IN') + ' approved=' + new Date(p.approved_at).toLocaleDateString('en-IN')));

  // 6. Wallet credit summary
  const allTx = await client.query(`
    SELECT type, remark, SUM(amount) as total, COUNT(*) as cnt
    FROM transactions
    WHERE user_id = 249858 AND type = 'wallet_credit'
    GROUP BY type, remark
    ORDER BY total DESC
  `);
  console.log('\n=== WALLET CREDIT SUMMARY ===');
  allTx.rows.forEach(t => console.log('  ' + t.remark + ' | Rs ' + Number(t.total).toLocaleString('en-IN') + ' (' + t.cnt + ' txns)'));

  // 7. Monthly income snapshots
  const snapshots = await client.query(
    "SELECT * FROM monthly_income_snapshots WHERE user_id = 249858 ORDER BY id DESC"
  );
  console.log('\n=== MONTHLY INCOME SNAPSHOTS (' + snapshots.rows.length + ') ===');
  snapshots.rows.forEach(s => {
    console.log('  month=' + s.month + ' gross=' + s.gross_amount + ' working=' + s.income_wallet_amount + ' repurchase=' + s.repurchase_wallet_amount + ' paid=' + s.paid_out_at);
  });

  // 8. Salaries
  const salaries = await client.query('SELECT * FROM salaries WHERE user_id = 249858 ORDER BY created_at DESC');
  console.log('\n=== SALARIES (' + salaries.rows.length + ') ===');
  salaries.rows.forEach(s => console.log('  power=Rs ' + Number(s.power).toLocaleString('en-IN') + ' weaker=Rs ' + Number(s.weaker).toLocaleString('en-IN') + ' qualifying=Rs ' + Number(s.qualifying_business).toLocaleString('en-IN') + ' status=' + s.status));

  // 9. Membership level income
  const membershipLevel = await client.query(`
    SELECT remark, SUM(amount) as total, COUNT(*) as cnt
    FROM transactions
    WHERE user_id = 249858 AND remark LIKE '%Membership Level%'
    GROUP BY remark
    ORDER BY total DESC
  `);
  console.log('\n=== MEMBERSHIP LEVEL INCOME SUMMARY ===');
  membershipLevel.rows.forEach(t => console.log('  ' + t.remark + ' | Rs ' + Number(t.total).toLocaleString('en-IN') + ' (' + t.cnt + ')'));

  // 10. Activation level income
  const activationLevel = await client.query(`
    SELECT * FROM transactions
    WHERE user_id = 249858
    AND remark LIKE '%activation%level%'
    ORDER BY created_at DESC
  `);
  console.log('\n=== ACTIVATION LEVEL INCOME (' + activationLevel.rows.length + ') ===');
  activationLevel.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + t.remark + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 11. Current wallets
  const wallets = await client.query(`
    SELECT income_wallet, working_wallet, repurchase_wallet, reward_wallet, total_invested FROM users WHERE id = 249858
  `);
  console.log('\n=== CURRENT WALLETS ===');
  const w = wallets.rows[0];
  console.log('  income_wallet: Rs ' + Number(w.income_wallet).toLocaleString('en-IN'));
  console.log('  working_wallet: Rs ' + Number(w.working_wallet).toLocaleString('en-IN'));
  console.log('  repurchase_wallet: Rs ' + Number(w.repurchase_wallet).toLocaleString('en-IN'));
  console.log('  reward_wallet: Rs ' + Number(w.reward_wallet).toLocaleString('en-IN'));
  console.log('  total_invested: Rs ' + Number(w.total_invested).toLocaleString('en-IN'));

  // 12. Withdrawals
  const withdrawals = await client.query(`
    SELECT type, amount, status, created_at FROM withdrawls WHERE user_id = 249858 ORDER BY created_at DESC
  `);
  console.log('\n=== WITHDRAWALS (' + withdrawals.rows.length + ') ===');
  withdrawals.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | type=' + t.type + ' status=' + t.status + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 13. Also check all transactions grouped by type+remark for full picture
  const allTxFull = await client.query(`
    SELECT type, remark, SUM(amount) as total, COUNT(*) as cnt
    FROM transactions
    WHERE user_id = 249858
    GROUP BY type, remark
    ORDER BY type, total DESC
  `);
  console.log('\n=== ALL TRANSACTIONS SUMMARY ===');
  allTxFull.rows.forEach(t => console.log('  [' + t.type + '] ' + (t.remark || '-') + ' | Rs ' + Number(t.total).toLocaleString('en-IN') + ' (' + t.cnt + ' txns)'));

  await client.end();
})();

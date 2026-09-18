const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();
  const userIds = [759438, 449179, 908602, 769784, 367309];

  for (const uid of userIds) {
    // 1. User info
    const user = await client.query('SELECT id, name, email, status, activated_at, parent_id, leg, activation_amount FROM users WHERE id = $1', [uid]);
    if (!user.rows[0]) { console.log('PJ' + String(uid).padStart(6, '0') + ' NOT FOUND\n'); continue; }
    const u = user.rows[0];
    console.log('================================================================');
    console.log('PJ' + String(uid).padStart(6, '0') + ' — ' + u.name);
    console.log('================================================================');
    console.log('Status: ' + u.status + ' | Activated: ' + (u.activated_at ? new Date(u.activated_at).toLocaleDateString('en-IN') : 'N/A') + ' | Parent: PJ' + String(u.parent_id).padStart(6, '0') + ' | Leg: ' + u.leg + ' | Activation Amt: Rs ' + (u.activation_amount || 1000));

    // 2. Descendants
    const desc = await client.query(`
      WITH RECURSIVE descendants AS (
        SELECT id, name, 1 as depth FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id, u.name, d.depth + 1 FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 24
      )
      SELECT COUNT(*)::int as total FROM descendants
    `, [uid]);
    const dc = await client.query('SELECT COUNT(*)::int as total FROM users WHERE parent_id = $1', [uid]);
    console.log('Direct children: ' + dc.rows[0].total + ' | Total descendants: ' + desc.rows[0].total);

    // 3. Team business
    const tb = await client.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT COALESCE(SUM(p.amount), 0)::float as total
      FROM descendants d LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
    `, [uid]);
    console.log('Team business: Rs ' + Number(tb.rows[0].total).toLocaleString('en-IN'));

    // 4. Wallets
    const w = await client.query('SELECT income_wallet, working_wallet, repurchase_wallet, reward_wallet FROM users WHERE id = $1', [uid]);
    console.log('Wallets: income=Rs ' + Number(w.rows[0].income_wallet).toLocaleString('en-IN') + ' working=Rs ' + Number(w.rows[0].working_wallet).toLocaleString('en-IN') + ' repurchase=Rs ' + Number(w.rows[0].repurchase_wallet).toLocaleString('en-IN'));

    // 5. Snapshots
    const snaps = await client.query('SELECT month, gross_amount, income_wallet_amount, repurchase_wallet_amount, paid_out_at FROM monthly_income_snapshots WHERE user_id = $1 ORDER BY id DESC', [uid]);
    console.log('Snapshots: ' + snaps.rows.length);
    snaps.rows.forEach(s => console.log('  ' + s.month + ' gross=Rs ' + Number(s.gross_amount).toLocaleString('en-IN') + (s.paid_out_at ? ' ✅ paid' : ' ⏳ pending')));

    // 6. Salaries
    const sal = await client.query('SELECT power, weaker, qualifying_business, status, paid_at FROM salaries WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    console.log('Salaries: ' + sal.rows.length);
    sal.rows.forEach(s => console.log('  power=Rs ' + Number(s.power).toLocaleString('en-IN') + ' weaker=Rs ' + Number(s.weaker).toLocaleString('en-IN') + ' qualifying=Rs ' + Number(s.qualifying_business).toLocaleString('en-IN') + ' status=' + s.status));

    // 7. Membership level income
    const mli = await client.query(`
      SELECT SUM(amount) as total, COUNT(*)::int as cnt
      FROM transactions WHERE user_id = $1 AND type = 'wallet_credit' AND remark LIKE '%Membership Level Income%'
    `, [uid]);
    console.log('Membership level income: Rs ' + Number(mli.rows[0].total || 0).toLocaleString('en-IN') + ' (' + mli.rows[0].cnt + ' txns)');

    // 8. Activation level income (computed on-the-fly, but check if there are any transactions)
    const ali = await client.query(`
      SELECT SUM(amount) as total, COUNT(*)::int as cnt
      FROM transactions WHERE user_id = $1 AND type = 'wallet_credit' AND remark LIKE '%activation%level%'
    `, [uid]);
    console.log('Activation level income (transactions): Rs ' + Number(ali.rows[0].total || 0).toLocaleString('en-IN') + ' (' + ali.rows[0].cnt + ' txns)');

    // 9. Check if this user has missing MLI for their descendants
    const missingMLI = await client.query(`
      SELECT u.id, u.name, u.activated_at
      FROM users u
      WHERE u.parent_id = $1 AND u.activated_at IS NOT NULL AND u.role != 'admin'
      AND NOT EXISTS (
        SELECT 1 FROM transactions t WHERE t.type = 'wallet_credit'
        AND t.remark LIKE '%Membership Level Income%' AND t.remark LIKE '%(ID ' || u.id || ')'
      )
    `, [uid]);
    if (missingMLI.rows.length > 0) {
      console.log('⚠️  MISSING MLI for direct children:');
      missingMLI.rows.forEach(r => console.log('  PJ' + String(r.id).padStart(6, '0') + ' ' + r.name));
    }

    // 10. Withdrawals
    const wd = await client.query('SELECT type, amount, status FROM withdrawls WHERE user_id = $1', [uid]);
    console.log('Withdrawals: ' + wd.rows.length);
    wd.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' type=' + t.type + ' status=' + t.status));

    console.log('');
  }

  await client.end();
})();

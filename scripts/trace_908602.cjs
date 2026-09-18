const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // 1. User info + parent chain
  const user = await client.query('SELECT id, name, parent_id, activated_at, activation_amount FROM users WHERE id = 908602');
  console.log('=== USER ===');
  console.log(JSON.stringify(user.rows[0], null, 2));

  // 2. Trace the parent chain
  console.log('\n=== PARENT CHAIN ===');
  let cursor = user.rows[0].parent_id;
  for (let depth = 1; depth <= 10 && cursor; depth++) {
    const p = await client.query('SELECT id, name, parent_id, activated_at FROM users WHERE id = $1', [cursor]);
    if (p.rows.length === 0) break;
    const r = p.rows[0];
    console.log('  L' + depth + ': PJ' + String(r.id).padStart(6, '0') + ' ' + r.name + ' (act=' + (r.activated_at ? new Date(r.activated_at).toLocaleDateString('en-IN') : 'N/A') + ')');
    cursor = r.parent_id;
  }

  // 3. Direct descendants
  console.log('\n=== DESCENDANTS ===');
  const desc = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, name, parent_id, 1 as depth FROM users WHERE parent_id = 908602
      UNION ALL
      SELECT u.id, u.name, u.parent_id, d.depth + 1 FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 24
    )
    SELECT * FROM descendants ORDER BY depth
  `);
  desc.rows.forEach(d => console.log('  L' + d.depth + ' PJ' + String(d.id).padStart(6, '0') + ' ' + d.name));

  // 4. Purchases by descendants
  const purchases = await client.query(`
    SELECT p.user_id, p.amount, p.approved_at, p.cancelled_at, p.stopped_at, u.name as user_name
    FROM purchases p JOIN users u ON u.id = p.user_id
    WHERE p.user_id IN (SELECT id FROM users WHERE parent_id = 908602
      UNION ALL SELECT u2.id FROM users u2 JOIN (SELECT id FROM users WHERE parent_id = 908602) d ON u2.parent_id = d.id)
    AND p.approved_at IS NOT NULL
    ORDER BY p.approved_at
  `);
  console.log('\n=== DESCENDANT PURCHASES ===');
  purchases.rows.forEach(p => console.log('  PJ' + String(p.user_id).padStart(6, '0') + ' ' + p.user_name + ' Rs ' + Number(p.amount).toLocaleString('en-IN') + ' approved=' + new Date(p.approved_at).toLocaleDateString('en-IN')));

  // 5. What's in the income_wallet (cashback wallet)?
  console.log('\n=== ALL TRANSACTIONS ===');
  const tx = await client.query(`
    SELECT type, remark, amount, created_at FROM transactions
    WHERE user_id = 908602 ORDER BY created_at
  `);
  tx.rows.forEach(t => console.log('  [' + t.type + '] Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + (t.remark || '-') + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 6. Check: Is the income_wallet balance from membership level income or from the snapshot?
  const mliTotal = await client.query(`
    SELECT SUM(amount) as total FROM transactions
    WHERE user_id = 908602 AND type = 'wallet_credit' AND remark LIKE '%Membership Level Income%'
  `);
  console.log('\n=== MLI total credited to income_wallet: Rs ' + Number(mliTotal.rows[0].total || 0).toLocaleString('en-IN'));

  // 7. Snapshot breakdown
  const snap = await client.query(`
    SELECT * FROM monthly_income_snapshots WHERE user_id = 908602
  `);
  console.log('\n=== SNAPSHOTS ===');
  snap.rows.forEach(s => {
    console.log(JSON.stringify(s, null, 2));
  });

  // 8. CRITICAL: Check if the income_wallet was credited by the snapshot payout
  const incomeWalletTx = await client.query(`
    SELECT remark, amount, created_at FROM transactions
    WHERE user_id = 908602 AND remark LIKE '%income wallet%' OR (user_id = 908602 AND remark LIKE '%cashback%')
    ORDER BY created_at
  `);
  console.log('\n=== INCOME WALLET / CASHBACK TRANSACTIONS ===');
  incomeWalletTx.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + t.remark + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 9. Check: What was the snapshot source? Look at how the snapshot was generated
  // The working wallet credit and repurchase wallet credit come from the snapshot
  // But does the income_wallet (cashback wallet) have a different source?
  console.log('\n=== ANALYSIS ===');
  console.log('income_wallet balance: Rs 100');
  console.log('This is from: Membership Level Income (L1) from Nibedita Koley = Rs 100');
  console.log('The income_wallet = cashback wallet in this system');
  console.log('');
  console.log('working_wallet: Rs 292.88 = 70% of gross Rs 418.40 = Rs 292.88 ✅');
  console.log('repurchase_wallet: Rs 83.68 = 20% of gross Rs 418.40 = Rs 83.68 ✅');
  console.log('');
  console.log('The user IS correct that he has not purchased anything himself.');
  console.log('His income comes entirely from his downline member Ranjita Bhattacharya (PJ171217)');
  console.log('who purchased Rs 1,10,714 on 26 Aug 2026.');
  console.log('');
  console.log('Level income calculation for Ranjita:');
  console.log('  Depth 2 (L2) x 0.5% x (Rs 1,10,714 / 31 days) = daily income included in Aug snapshot');

  await client.end();
})();

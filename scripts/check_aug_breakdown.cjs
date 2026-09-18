const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // Find the correct payout snapshot table name
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name LIKE '%payout%' OR table_name LIKE '%preview%' OR table_name LIKE '%snapshot%'
    ORDER BY table_name
  `);
  console.log('=== RELATED TABLES ===');
  tables.rows.forEach(t => console.log('  ' + t.table_name));

  // Monthly income snapshots for all 3
  const snapshots = await client.query(`
    SELECT * FROM monthly_income_snapshots
    WHERE user_id IN (878601, 534707, 249858)
    ORDER BY user_id, month
  `);
  console.log('\n=== MONTHLY INCOME SNAPSHOTS ===');
  snapshots.rows.forEach(r => {
    console.log('\n--- PJ' + String(r.user_id).padStart(6, '0') + ' month=' + r.month + ' ---');
    console.log(JSON.stringify(r, null, 2));
  });

  // ALL transactions for each user
  const users = [878601, 534707, 249858];
  for (const uid of users) {
    const tx = await client.query(`
      SELECT type, remark, SUM(amount) as total, COUNT(*) as cnt
      FROM transactions
      WHERE user_id = $1
      GROUP BY type, remark
      ORDER BY type, total DESC
    `, [uid]);
    console.log('\n=== ALL TRANSACTIONS PJ' + String(uid).padStart(6, '0') + ' ===');
    tx.rows.forEach(t => console.log('  [' + t.type + '] ' + (t.remark || '-') + ' | Rs ' + Number(t.total).toLocaleString('en-IN') + ' (' + t.cnt + ')'));
  }

  // Check activations AFTER Aug 13 that might be missing membership income
  const lateActivations = await client.query(`
    SELECT u.id, u.name, u.parent_id, u.activated_at,
      (SELECT COUNT(*)::int FROM transactions t
       WHERE t.type = 'wallet_credit'
       AND t.remark LIKE '%Membership Level Income%'
       AND t.remark LIKE '%(ID ' || u.id || ')') as has_income
    FROM users u
    WHERE u.activated_at IS NOT NULL
    AND u.activated_at > '2026-08-13'
    AND u.role != 'admin'
    ORDER BY u.activated_at ASC
  `);
  console.log('\n=== ACTIVATIONS AFTER AUG 13 (checking membership income) ===');
  lateActivations.rows.forEach(r => {
    const status = r.has_income > 0 ? 'GRANTED' : 'MISSING';
    console.log('  [' + status + '] PJ' + String(r.id).padStart(6, '0') + ' ' + r.name + ' activated=' + new Date(r.activated_at).toLocaleDateString('en-IN') + ' parent=PJ' + String(r.parent_id).padStart(6, '0'));
  });

  // Count missing
  const missingCount = lateActivations.rows.filter(r => r.has_income === 0).length;
  console.log('\nTotal missing membership income: ' + missingCount);

  // Check: total membership level income credited overall
  const totalMLI = await client.query(`
    SELECT COUNT(*) as cnt, SUM(amount) as total
    FROM transactions
    WHERE type = 'wallet_credit'
    AND remark LIKE '%Membership Level Income%'
  `);
  console.log('\n=== TOTAL MEMBERSHIP LEVEL INCOME IN SYSTEM ===');
  console.log('  Count: ' + totalMLI.rows[0].cnt + ', Total: Rs ' + Number(totalMLI.rows[0].total || 0).toLocaleString('en-IN'));

  await client.end();
})();

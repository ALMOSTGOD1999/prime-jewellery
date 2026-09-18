const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // 1. User info
  const user = await client.query('SELECT id, name, email, phone, status, activated_at, parent_id FROM users WHERE id = 878601');
  console.log('=== USER ===');
  console.log(JSON.stringify(user.rows[0], null, 2));
  if (!user.rows[0]) { console.log('User not found'); await client.end(); return; }

  // 2. Direct children count
  const dc = await client.query('SELECT COUNT(*)::int as total FROM users WHERE parent_id = 878601');
  console.log('\nDirect children: ' + dc.rows[0].total);

  // 3. Descendants with depth
  const desc = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id, name, parent_id, 1 as depth FROM users WHERE parent_id = 878601
      UNION ALL
      SELECT u.id, u.name, u.parent_id, d.depth + 1
      FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 24
    )
    SELECT * FROM descendants ORDER BY depth, id
  `);
  console.log('\n=== DESCENDANTS (' + desc.rows.length + ' total) ===');
  desc.rows.forEach(d => console.log('  L' + d.depth + ' PJ' + String(d.id).padStart(6,'0') + ' ' + d.name));

  // 4. Team business
  const tb = await client.query(`
    WITH RECURSIVE descendants AS (
      SELECT id FROM users WHERE parent_id = 878601
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
      SELECT id FROM users WHERE parent_id = 878601
      UNION ALL
      SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
    )
    SELECT p.id, p.user_id, p.amount, p.approved_at, p.cancelled_at, p.stopped_at, p.amount as pamount, u2.name as user_name
    FROM purchases p
    JOIN descendants d ON p.user_id = d.id
    JOIN users u2 ON u2.id = p.user_id
    WHERE p.approved_at IS NOT NULL
    ORDER BY p.approved_at ASC
  `);
  console.log('\n=== PURCHASES (' + purchases.rows.length + ' total) ===');
  purchases.rows.forEach(p => console.log('  PJ' + String(p.user_id).padStart(6,'0') + ' ' + p.user_name + ' Rs ' + Number(p.amount).toLocaleString('en-IN') + ' approved=' + new Date(p.approved_at).toLocaleDateString('en-IN')));

  // 6. Wallet credit transactions
  const tx = await client.query(`
    SELECT * FROM transactions WHERE user_id = 878601 AND type = 'wallet_credit' ORDER BY created_at DESC LIMIT 30
  `);
  console.log('\n=== WALLET CREDIT TRANSACTIONS (' + tx.rows.length + ' most recent) ===');
  tx.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + t.remark + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 7. Salaries
  const salaries = await client.query('SELECT * FROM salaries WHERE user_id = 878601 ORDER BY created_at DESC');
  console.log('\n=== SALARIES (' + salaries.rows.length + ') ===');
  salaries.rows.forEach(s => console.log('  power=Rs ' + Number(s.power).toLocaleString('en-IN') + ' weaker=Rs ' + Number(s.weaker).toLocaleString('en-IN') + ' qualifying=Rs ' + Number(s.qualifying_business).toLocaleString('en-IN') + ' status=' + s.status));

  // 8. Level income config
  const levelConfig = await client.query('SELECT * FROM level_incomes WHERE is_active = true ORDER BY level ASC');
  console.log('\n=== LEVEL INCOME CONFIG ===');
  levelConfig.rows.forEach(l => console.log('  L' + l.level + ': ' + l.percentage + '% (min_directs=' + l.min_directs + ', min_team=' + l.min_team_business_level + ')'));

  // 9. Team business levels
  const teamBizLevels = await client.query('SELECT * FROM team_business_levels ORDER BY min_business ASC');
  console.log('\n=== TEAM BUSINESS LEVELS ===');
  teamBizLevels.rows.forEach(t => console.log('  ' + t.level + ': Rs ' + Number(t.min_business).toLocaleString('en-IN')));

  // 10. Performance incentive config
  const piConfig = await client.query('SELECT * FROM performance_incentives WHERE is_active = true ORDER BY business_target ASC');
  console.log('\n=== PERFORMANCE INCENTIVE CONFIG ===');
  piConfig.rows.forEach(p => console.log('  ' + p.title + ': Rs ' + Number(p.business_target).toLocaleString('en-IN') + ' -> Rs ' + Number(p.reward_amount).toLocaleString('en-IN')));

  await client.end();
})();

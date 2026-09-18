const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // 1. Verify no more missing membership level income
  const stillMissing = await client.query(`
    SELECT u.id, u.name, u.activated_at, u.parent_id
    FROM users u
    WHERE u.activated_at IS NOT NULL
    AND u.activated_at > '2026-08-13'
    AND u.role != 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.type = 'wallet_credit'
      AND t.remark LIKE '%Membership Level Income%'
      AND t.remark LIKE '%(ID ' || u.id || ')'
    )
    ORDER BY u.activated_at ASC
  `);
  console.log('=== STILL MISSING MEMBERSHIP LEVEL INCOME ===');
  console.log('Count: ' + stillMissing.rows.length);
  if (stillMissing.rows.length > 0) {
    stillMissing.rows.forEach(r => console.log('  PJ' + String(r.id).padStart(6, '0') + ' ' + r.name + ' activated=' + new Date(r.activated_at).toLocaleDateString('en-IN')));
  }

  // 2. Verify recent credits for PJ878601, PJ534707, PJ249858
  const verifyUsers = [878601, 534707, 249858];
  for (const uid of verifyUsers) {
    const recent = await client.query(`
      SELECT remark, amount, created_at FROM transactions
      WHERE user_id = $1 AND type = 'wallet_credit'
      AND remark LIKE '%Membership Level Income%'
      ORDER BY created_at DESC LIMIT 10
    `, [uid]);
    console.log('\n=== RECENT MLI FOR PJ' + String(uid).padStart(6, '0') + ' (last 10) ===');
    recent.rows.forEach(r => console.log('  Rs ' + Number(r.amount).toLocaleString('en-IN') + ' | ' + r.remark));
  }

  // 3. Check current wallets for all three after credits
  const wallets = await client.query(`
    SELECT id, name, income_wallet, working_wallet, repurchase_wallet
    FROM users WHERE id IN (878601, 534707, 249858)
  `);
  console.log('\n=== CURRENT WALLETS (after fix) ===');
  wallets.rows.forEach(w => {
    console.log('PJ' + String(w.id).padStart(6, '0') + ' ' + w.name + ':');
    console.log('  income_wallet: Rs ' + Number(w.income_wallet).toLocaleString('en-IN'));
    console.log('  working_wallet: Rs ' + Number(w.working_wallet).toLocaleString('en-IN'));
    console.log('  repurchase_wallet: Rs ' + Number(w.repurchase_wallet).toLocaleString('en-IN'));
  });

  // 4. Leg assignment check
  const noLegUsers = await client.query(`
    SELECT COUNT(*)::int as total FROM users WHERE leg IS NULL AND role != 'admin'
  `);
  console.log('\n=== LEG ASSIGNMENT ===');
  console.log('Users with leg=NULL: ' + noLegUsers.rows[0].total);

  const totalUsers = await client.query(`SELECT COUNT(*)::int as total FROM users WHERE role != 'admin'`);
  console.log('Total non-admin users: ' + totalUsers.rows[0].total);

  // 5. Check how legs are assigned - what is the leg column for
  const sampleLegs = await client.query(`SELECT id, name, leg, parent_id FROM users WHERE leg IS NOT NULL LIMIT 10`);
  console.log('\n=== SAMPLE USERS WITH LEGS ===');
  sampleLegs.rows.forEach(r => console.log('  PJ' + String(r.id).padStart(6, '0') + ' ' + r.name + ' leg=' + r.leg + ' parent=PJ' + String(r.parent_id).padStart(6, '0')));

  await client.end();
})();

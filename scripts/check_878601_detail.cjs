const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

(async () => {
  await client.connect();

  // 1. Monthly income snapshots for PJ878601
  const snapshots = await client.query(
    "SELECT * FROM monthly_income_snapshots WHERE user_id = 878601 ORDER BY id DESC"
  );
  console.log('=== MONTHLY INCOME SNAPSHOTS (' + snapshots.rows.length + ') ===');
  snapshots.rows.forEach(s => {
    console.log(JSON.stringify(s, null, 2));
  });

  // 2. Check ALL wallet credit transactions (not just top 30)
  const allTx = await client.query(`
    SELECT type, remark, SUM(amount) as total, COUNT(*) as cnt
    FROM transactions
    WHERE user_id = 878601 AND type = 'wallet_credit'
    GROUP BY type, remark
    ORDER BY total DESC
  `);
  console.log('\n=== WALLET CREDIT SUMMARY ===');
  allTx.rows.forEach(t => console.log('  ' + t.remark + ' | Rs ' + Number(t.total).toLocaleString('en-IN') + ' (' + t.cnt + ' txns)'));

  // 3. Check activation level income transactions
  const activationLevel = await client.query(`
    SELECT * FROM transactions
    WHERE user_id = 878601
    AND remark LIKE '%activation%level%'
    ORDER BY created_at DESC
  `);
  console.log('\n=== ACTIVATION LEVEL INCOME TRANSACTIONS (' + activationLevel.rows.length + ') ===');
  activationLevel.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + t.remark + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 4. Check membership level income transactions
  const membershipLevel = await client.query(`
    SELECT * FROM transactions
    WHERE user_id = 878601
    AND remark LIKE '%Membership Level%'
    ORDER BY created_at DESC
  `);
  console.log('\n=== MEMBERSHIP LEVEL INCOME TRANSACTIONS (' + membershipLevel.rows.length + ') ===');
  membershipLevel.rows.forEach(t => console.log('  Rs ' + Number(t.amount).toLocaleString('en-IN') + ' | ' + t.remark + ' | ' + new Date(t.created_at).toLocaleDateString('en-IN')));

  // 5. Check the legs (left/right) for salary calculation
  const parent = await client.query(`SELECT id, name, leg FROM users WHERE id = 878601`);
  console.log('\n=== USER LEG ===');
  console.log('  PJ878601 leg=' + parent.rows[0].leg);

  // 6. Check direct children's legs
  const directChildrenLegs = await client.query(`
    SELECT id, name, leg, activated_at FROM users WHERE parent_id = 878601 ORDER BY id
  `);
  console.log('\n=== DIRECT CHILDREN LEGS ===');
  directChildrenLegs.rows.forEach(d => console.log('  PJ' + String(d.id).padStart(6,'0') + ' ' + d.name + ' leg=' + d.leg + ' activated=' + d.activated_at));

  // 7. Current wallets
  const wallets = await client.query(`
    SELECT income_wallet, working_wallet, repurchase_wallet, reward_wallet, total_invested FROM users WHERE id = 878601
  `);
  console.log('\n=== CURRENT WALLETS ===');
  const w = wallets.rows[0];
  console.log('  income_wallet: Rs ' + Number(w.income_wallet).toLocaleString('en-IN'));
  console.log('  working_wallet: Rs ' + Number(w.working_wallet).toLocaleString('en-IN'));
  console.log('  repurchase_wallet: Rs ' + Number(w.repurchase_wallet).toLocaleString('en-IN'));
  console.log('  reward_wallet: Rs ' + Number(w.reward_wallet).toLocaleString('en-IN'));
  console.log('  total_invested: Rs ' + Number(w.total_invested).toLocaleString('en-IN'));

  await client.end();
})();

const { DateTime } = require('luxon');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DB_CONNECTION || 'postgres://primejewellery:primejewellery@localhost:5432/primejewellery'
});

(async () => {
  await client.connect();
  const period = DateTime.fromISO('2026-08-01');
  const monthEnd = period.endOf('month');
  const monthStart = period.startOf('month');

  console.log('=== AUGUST 2026 PAYOUT ELIGIBILITY ===');
  console.log('Period:', monthStart.toFormat('yyyy-MM-dd'), 'to', monthEnd.toFormat('yyyy-MM-dd'));
  console.log();

  // 1. INCOME WALLET - Active investments started by Aug 31
  const invResult = await client.query(
    `SELECT i.id, i.user_id, i.amount, i.monthly_return_rate, i.started_at, u.name, u.status
     FROM investments i
     JOIN users u ON u.id = i.user_id
     WHERE i.status = 'active'
       AND i.started_at <= $1
       AND u.status = 'active'
     ORDER BY i.user_id`,
    [monthEnd.toSQL()]
  );

  console.log('=== INCOME WALLET (Investment Returns) ===');
  console.log('Total active investments:', invResult.rows.length);
  console.log();

  let totalIncomeWallet = 0;
  let totalRepurchase = 0;
  const byUser = new Map();

  for (const inv of invResult.rows) {
    const startedAt = DateTime.fromJSDate(inv.started_at).setZone('Asia/Kolkata').startOf('day');
    const mEnd = monthEnd.setZone('Asia/Kolkata').startOf('day');
    const activeDays = Math.min(mEnd.diff(startedAt, 'days').days + 1, 30);
    const prorateFactor = Math.max(activeDays, 1) / 30;
    const rate = Number(inv.monthly_return_rate) || 3;
    const returnAmount = Math.round((Number(inv.amount) * rate * prorateFactor) / 100 * 100) / 100;
    const incomeShare = Math.round((returnAmount * 70) / 100 * 100) / 100;
    const repurchaseShare = Math.round((returnAmount * 20) / 100 * 100) / 100;

    totalIncomeWallet += incomeShare;
    totalRepurchase += repurchaseShare;

    if (!byUser.has(inv.user_id)) {
      byUser.set(inv.user_id, { name: inv.name, count: 0, totalReturn: 0, totalIncome: 0, totalRepurchase: 0 });
    }
    const u = byUser.get(inv.user_id);
    u.count++;
    u.totalReturn += returnAmount;
    u.totalIncome += incomeShare;
    u.totalRepurchase += repurchaseShare;
  }

  console.log('User Code  | Name                     | #Inv | Total Return  | Income (70%)   | Repurchase (20%)');
  console.log('-----------|--------------------------|------|---------------|----------------|------------------');
  for (const [userId, data] of [...byUser.entries()].sort((a, b) => b[1].totalIncome - a[1].totalIncome)) {
    console.log(
      'PJ' + String(userId).padStart(6, '0') + ' |',
      (data.name || '—').substring(0, 24).padEnd(24) + ' |',
      String(data.count).padStart(4) + ' |',
      ('₹' + data.totalReturn.toLocaleString('en-IN')).padStart(13) + ' |',
      ('₹' + data.totalIncome.toLocaleString('en-IN')).padStart(14) + ' |',
      ('₹' + data.totalRepurchase.toLocaleString('en-IN')).padStart(16)
    );
  }

  console.log();
  console.log('Total Income Wallet:  ₹' + totalIncomeWallet.toLocaleString('en-IN'));
  console.log('Total Repurchase:     ₹' + totalRepurchase.toLocaleString('en-IN'));
  console.log('Users on income payout:', byUser.size);
  console.log();

  // 2. WORKING WALLET
  const activeUsers = await client.query(
    `SELECT id, name, activated_at, activation_amount, parent_id
     FROM users
     WHERE role = 'user' AND status = 'active' AND activated_at IS NOT NULL
     ORDER BY id`
  );

  console.log('=== WORKING WALLET (6 Income Sources) ===');
  console.log('Total active users:', activeUsers.rows.length);
  console.log();

  let totalWorkingGross = 0;
  let totalWorkingWallet = 0;
  const workingData = [];

  for (const u of activeUsers.rows) {
    const activatedAt = DateTime.fromJSDate(u.activated_at);
    const actAmt = Number(u.activation_amount) || 1000;

    // 1. Activation Cashback (5% per month for 2 months)
    let activationCashback = 0;
    const month1Date = activatedAt.plus({ months: 1 });
    const month2Date = activatedAt.plus({ months: 2 });
    if (monthEnd >= month1Date && month1Date.toFormat('yyyy-MM') === '2026-08') activationCashback += (actAmt * 0.1) / 2;
    if (monthEnd >= month2Date && month2Date.toFormat('yyyy-MM') === '2026-08') activationCashback += (actAmt * 0.1) / 2;

    // 2. Activation Sponsor
    const sponsorRes = await client.query(
      `SELECT COUNT(*)::int as count FROM users
       WHERE parent_id = $1 AND activated_at IS NOT NULL
         AND activated_at >= $2 AND activated_at <= $3`,
      [u.id, monthStart.toSQL(), monthEnd.toSQL()]
    );
    const activationSponsor = sponsorRes.rows[0].count * (actAmt * 0.1);

    // 3. Activation Level (simplified)
    let activationLevel = 0;

    // 4. Level Income (simplified - check daily)
    let levelIncome = 0;
    const directCount = await client.query(
      `SELECT COUNT(*)::int as count FROM users WHERE parent_id = $1`,
      [u.id]
    );
    const numDirects = directCount.rows[0].count;
    if (numDirects > 0) {
      // Simplified: check if any descendant purchases exist this month
      const levelRes = await client.query(
        `WITH RECURSIVE descendants AS (
          SELECT id, 1 as depth FROM users WHERE parent_id = $1
          UNION ALL
          SELECT u.id, d.depth + 1 FROM users u INNER JOIN descendants d ON u.parent_id = d.id WHERE d.depth < 5
        )
        SELECT COUNT(*)::int as has_purchases
        FROM purchases p
        WHERE p.user_id IN (SELECT id FROM descendants)
          AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
          AND p.approved_at >= $2 AND p.approved_at <= $3`,
        [u.id, monthStart.toSQL(), monthEnd.toSQL()]
      );
      // If there are team purchases, estimate level income
      if (levelRes.rows[0].has_purchases > 0) {
        // Rough estimate - actual calculation needs daily iteration
        levelIncome = 0; // Will be computed by actual payout service
      }
    }

    // 5. EMI Level (skip for now)
    let emiLevelIncome = 0;

    // 6. Salary
    const salaryRes = await client.query(
      `SELECT COALESCE(SUM(power + weaker), 0) as total
       FROM salaries WHERE user_id = $1 AND status = 'paid'
         AND paid_at >= $2 AND paid_at <= $3`,
      [u.id, monthStart.toSQL(), monthEnd.toSQL()]
    );
    const salary = Number(salaryRes.rows[0].total) || 0;

    const gross = activationCashback + activationSponsor + activationLevel + levelIncome + emiLevelIncome + salary;
    if (gross > 0) {
      const workingShare = Math.round(gross * 0.7 * 100) / 100;
      totalWorkingGross += gross;
      totalWorkingWallet += workingShare;
      workingData.push({
        userId: u.id,
        name: u.name,
        activationCashback: Math.round(activationCashback * 100) / 100,
        activationSponsor: Math.round(activationSponsor * 100) / 100,
        levelIncome: Math.round(levelIncome * 100) / 100,
        salary: Math.round(salary * 100) / 100,
        gross: Math.round(gross * 100) / 100,
        workingShare,
      });
    }
  }

  if (workingData.length > 0) {
    console.log('User Code  | Name                     | Cashback | Sponsor | Salary  | Gross   | Working(70%)');
    console.log('-----------|--------------------------|----------|---------|---------|---------|-------------');
    for (const d of [...workingData].sort((a, b) => b.workingShare - a.workingShare)) {
      console.log(
        'PJ' + String(d.userId).padStart(6, '0') + ' |',
        (d.name || '—').substring(0, 24).padEnd(24) + ' |',
        ('₹' + d.activationCashback.toFixed(0)).padStart(8) + ' |',
        ('₹' + d.activationSponsor.toFixed(0)).padStart(7) + ' |',
        ('₹' + d.salary.toFixed(0)).padStart(7) + ' |',
        ('₹' + d.gross.toFixed(0)).padStart(7) + ' |',
        ('₹' + d.workingShare.toFixed(0)).padStart(11)
      );
    }
  } else {
    console.log('No users with working income this month (expected for early-stage platform).');
  }

  console.log();
  console.log('========================================');
  console.log('   AUGUST 2026 PAYOUT SUMMARY');
  console.log('========================================');
  console.log('Income Wallet (70%):    ₹' + totalIncomeWallet.toLocaleString('en-IN'));
  console.log('Repurchase (20%):       ₹' + totalRepurchase.toLocaleString('en-IN'));
  console.log('Working Wallet (70%):   ₹' + totalWorkingWallet.toLocaleString('en-IN'));
  console.log('----------------------------------------');
  console.log('GRAND TOTAL (to users): ₹' + (totalIncomeWallet + totalWorkingWallet).toLocaleString('en-IN'));
  console.log('Users on income payout:  ' + byUser.size);
  console.log('Users on working payout: ' + workingData.length);
  console.log('========================================');

  await client.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

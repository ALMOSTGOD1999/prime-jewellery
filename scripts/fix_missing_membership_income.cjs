const { Client } = require('pg');
const { createId } = require('@paralleldrive/cuid2');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

const MAX_LEVELS = 15;
const DEFAULT_ACTIVATION_AMOUNT = 1000;

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatPgDate(d) {
  if (!d) return null;
  return new Date(d).toISOString();
}

(async () => {
  await client.connect();

  // 1. Get all activations AFTER Aug 13 that are missing membership level income
  const missing = await client.query(`
    SELECT u.id, u.name, u.parent_id, u.activated_at, u.activation_amount
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

  console.log('Found ' + missing.rows.length + ' activations missing membership level income\n');

  // 2. Get active membership level income percentages
  const levels = await client.query(`
    SELECT level, percentage FROM membership_level_incomes WHERE is_active = true ORDER BY level ASC
  `);
  const pctByLevel = new Map(levels.rows.map(l => [l.level, Number(l.percentage)]));
  console.log('Membership level income config:');
  levels.rows.forEach(l => console.log('  L' + l.level + ': ' + l.percentage + '%'));

  let totalGranted = 0;
  let totalAmount = 0;
  const allGrants = [];

  // 3. For each missing activation, walk up the parent chain
  for (const member of missing.rows) {
    const memberActivatedAt = new Date(member.activated_at);
    const memberDay = new Date(memberActivatedAt);
    memberDay.setHours(0, 0, 0, 0);

    let cursor = member.parent_id;
    for (let depth = 1; depth <= MAX_LEVELS && cursor; depth++) {
      // Get upline
      const uplineRes = await client.query('SELECT id, name, activated_at FROM users WHERE id = $1', [cursor]);
      if (uplineRes.rows.length === 0) break;
      const upline = uplineRes.rows[0];

      // Check upline activated before or same day as member
      if (upline.activated_at) {
        const uplineDay = new Date(upline.activated_at);
        uplineDay.setHours(0, 0, 0, 0);

        if (uplineDay <= memberDay) {
          const pct = pctByLevel.get(depth) || 0;
          const activationAmt = Number(member.activation_amount) || DEFAULT_ACTIVATION_AMOUNT;
          const amount = roundMoney((activationAmt * pct) / 100);

          if (amount > 0) {
            allGrants.push({
              uplineId: upline.id,
              uplineName: upline.name,
              memberId: member.id,
              memberName: member.name,
              depth,
              amount,
              activatedAt: member.activated_at,
            });
          }
        }
      }

      cursor = upline.parent_id;
    }
  }

  console.log('\n=== PLANNED GRANTS (' + allGrants.length + ' transactions) ===');
  console.log('Total amount: Rs ' + allGrants.reduce((s, g) => s + g.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }));

  // Group by upline for summary
  const byUpline = new Map();
  for (const g of allGrants) {
    const key = g.uplineId;
    if (!byUpline.has(key)) byUpline.set(key, { name: g.uplineName, total: 0, count: 0, grants: [] });
    const entry = byUpline.get(key);
    entry.total += g.amount;
    entry.count++;
    entry.grants.push(g);
  }

  console.log('\n=== BY UPLINE ===');
  for (const [uplineId, data] of byUpline) {
    console.log('PJ' + String(uplineId).padStart(6, '0') + ' ' + data.name + ': ' + data.count + ' grants, Rs ' + data.total.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  }

  // 4. Apply all grants in a transaction
  console.log('\n=== APPLYING GRANTS ===');
  let applied = 0;
  let appliedAmount = 0;
  let skipped = 0;

  for (const grant of allGrants) {
    try {
      await client.query('BEGIN');

      // Create transaction
      const id = createId();
      const remark = `Membership Level Income (Level ${grant.depth}) from ${grant.memberName} (ID ${grant.memberId})`;
      const activatedAt = formatPgDate(grant.activatedAt);

      await client.query(`
        INSERT INTO transactions (id, user_id, type, amount, remark, approved_at, created_at, updated_at)
        VALUES ($1, $2, 'wallet_credit', $3, $4, $5, NOW(), NOW())
      `, [id, grant.uplineId, grant.amount, remark, activatedAt]);

      // Increment income wallet
      await client.query(`
        UPDATE users SET income_wallet = income_wallet + $1 WHERE id = $2
      `, [grant.amount, grant.uplineId]);

      await client.query('COMMIT');
      applied++;
      appliedAmount += grant.amount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.log('ERROR for PJ' + String(grant.uplineId).padStart(6, '0') + ': ' + err.message);
      skipped++;
    }
  }

  console.log('\n=== RESULTS ===');
  console.log('Applied: ' + applied + ' transactions');
  console.log('Total amount credited: Rs ' + appliedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  console.log('Skipped (errors): ' + skipped);

  await client.end();
})();

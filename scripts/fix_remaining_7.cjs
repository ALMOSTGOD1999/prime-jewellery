const { Client } = require('pg');
const { createId } = require('@paralleldrive/cuid2');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

const MAX_LEVELS = 15;
const DEFAULT_ACTIVATION_AMOUNT = 1000;
function roundMoney(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function formatPgDate(d) { return d ? new Date(d).toISOString() : null; }

(async () => {
  await client.connect();

  const stillMissing = await client.query(`
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
  `);

  const levels = await client.query(`
    SELECT level, percentage FROM membership_level_incomes WHERE is_active = true ORDER BY level ASC
  `);
  const pctByLevel = new Map(levels.rows.map(l => [l.level, Number(l.percentage)]));

  console.log('Investigating ' + stillMissing.rows.length + ' still-missing users:\n');

  const allGrants = [];

  for (const member of stillMissing.rows) {
    console.log('--- PJ' + String(member.id).padStart(6, '0') + ' ' + member.name + ' ---');
    console.log('  parent_id: ' + member.parent_id);

    if (!member.parent_id) {
      console.log('  REASON: No parent_id (root user)');
      continue;
    }

    const memberActivatedAt = new Date(member.activated_at);
    const memberDay = new Date(memberActivatedAt);
    memberDay.setHours(0, 0, 0, 0);

    let cursor = member.parent_id;
    let chainLength = 0;
    for (let depth = 1; depth <= MAX_LEVELS && cursor; depth++) {
      const uplineRes = await client.query('SELECT id, name, parent_id, activated_at FROM users WHERE id = $1', [cursor]);
      if (uplineRes.rows.length === 0) {
        console.log('  REASON: Upline PJ' + String(cursor).padStart(6, '0') + ' not found at depth ' + depth);
        break;
      }
      const upline = uplineRes.rows[0];
      chainLength++;

      if (upline.activated_at) {
        const uplineDay = new Date(upline.activated_at);
        uplineDay.setHours(0, 0, 0, 0);

        if (uplineDay <= memberDay) {
          const pct = pctByLevel.get(depth) || 0;
          const activationAmt = Number(member.activation_amount) || DEFAULT_ACTIVATION_AMOUNT;
          const amount = roundMoney((activationAmt * pct) / 100);
          console.log('  Depth ' + depth + ': PJ' + String(upline.id).padStart(6, '0') + ' ' + upline.name + ' (act=' + new Date(upline.activated_at).toLocaleDateString('en-IN') + ') -> Rs ' + amount + (amount > 0 ? ' ✓' : ' (0%)'));
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
        } else {
          console.log('  Depth ' + depth + ': PJ' + String(upline.id).padStart(6, '0') + ' ' + upline.name + ' activated AFTER member (skip)');
        }
      } else {
        console.log('  Depth ' + depth + ': PJ' + String(upline.id).padStart(6, '0') + ' ' + upline.name + ' NOT activated (skip)');
      }

      cursor = upline.parent_id;
    }
    if (chainLength === 0) {
      console.log('  REASON: No parent chain found');
    }
    console.log('');
  }

  console.log('\n=== REMAINING GRANTS TO APPLY: ' + allGrants.length + ' ===');
  let totalAmount = 0;
  for (const g of allGrants) {
    console.log('  PJ' + String(g.uplineId).padStart(6, '0') + ' ' + g.uplineName + ' <- PJ' + String(g.memberId).padStart(6, '0') + ' L' + g.depth + ' Rs ' + g.amount);
    totalAmount += g.amount;
  }
  console.log('  Total: Rs ' + totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }));

  // Apply grants
  let applied = 0;
  for (const grant of allGrants) {
    try {
      await client.query('BEGIN');
      const id = createId();
      const remark = `Membership Level Income (Level ${grant.depth}) from ${grant.memberName} (ID ${grant.memberId})`;
      const activatedAt = formatPgDate(grant.activatedAt);
      await client.query(`
        INSERT INTO transactions (id, user_id, type, amount, remark, approved_at, created_at, updated_at)
        VALUES ($1, $2, 'wallet_credit', $3, $4, $5, NOW(), NOW())
      `, [id, grant.uplineId, grant.amount, remark, activatedAt]);
      await client.query(`UPDATE users SET income_wallet = income_wallet + $1 WHERE id = $2`, [grant.amount, grant.uplineId]);
      await client.query('COMMIT');
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.log('ERROR: ' + err.message);
    }
  }
  console.log('\nApplied: ' + applied + ' additional grants');

  await client.end();
})();

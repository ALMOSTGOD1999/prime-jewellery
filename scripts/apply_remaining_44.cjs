const { Client } = require('pg');
const { createId } = require('@paralleldrive/cuid2');
const client = new Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

function roundMoney(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

const grants = [
  { uplineId: 273781, memberId: 312683, depth: 3, amount: 20, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 509930, memberId: 312683, depth: 4, amount: 10, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 630348, memberId: 312683, depth: 5, amount: 5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 741392, memberId: 312683, depth: 6, amount: 5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 216409, memberId: 312683, depth: 7, amount: 2.5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 552582, memberId: 312683, depth: 8, amount: 2.5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 631425, memberId: 312683, depth: 9, amount: 2.5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 696697, memberId: 312683, depth: 10, amount: 2.5, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 427332, memberId: 312683, depth: 11, amount: 1, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 372611, memberId: 312683, depth: 12, amount: 1, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 340676, memberId: 312683, depth: 13, amount: 1, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 202924, memberId: 312683, depth: 14, amount: 1, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 484739, memberId: 312683, depth: 15, amount: 1, memberName: 'BIJAN KUMAR MANDAL' },
  { uplineId: 100414, memberId: 978564, depth: 3, amount: 20, memberName: 'Ajit Chandra Das' },
  { uplineId: 241022, memberId: 978564, depth: 4, amount: 10, memberName: 'Ajit Chandra Das' },
  { uplineId: 902724, memberId: 978564, depth: 7, amount: 2.5, memberName: 'Ajit Chandra Das' },
  { uplineId: 884562, memberId: 978564, depth: 9, amount: 2.5, memberName: 'Ajit Chandra Das' },
  { uplineId: 464396, memberId: 978564, depth: 12, amount: 1, memberName: 'Ajit Chandra Das' },
  { uplineId: 8217172, memberId: 978564, depth: 13, amount: 1, memberName: 'Ajit Chandra Das' },
  { uplineId: 2113292, memberId: 978564, depth: 14, amount: 1, memberName: 'Ajit Chandra Das' },
  { uplineId: 4869509, memberId: 978564, depth: 15, amount: 1, memberName: 'Ajit Chandra Das' },
  { uplineId: 989034, memberId: 344001, depth: 6, amount: 5, memberName: 'ATAUR RAHAMAN ANSARI' },
  { uplineId: 878601, memberId: 344001, depth: 7, amount: 2.5, memberName: 'ATAUR RAHAMAN ANSARI' },
  { uplineId: 256742, memberId: 344001, depth: 8, amount: 2.5, memberName: 'ATAUR RAHAMAN ANSARI' },
  { uplineId: 190183, memberId: 344001, depth: 15, amount: 1, memberName: 'ATAUR RAHAMAN ANSARI' },
  { uplineId: 424410, memberId: 728266, depth: 7, amount: 2.5, memberName: 'Manoj Shaw' },
  { uplineId: 956922, memberId: 728266, depth: 8, amount: 2.5, memberName: 'Manoj Shaw' },
  { uplineId: 344001, memberId: 728266, depth: 10, amount: 2.5, memberName: 'Manoj Shaw' },
  { uplineId: 281417, memberId: 484794, depth: 10, amount: 2.5, memberName: 'Mohinur 10' },
  { uplineId: 908897, memberId: 484794, depth: 11, amount: 1, memberName: 'Mohinur 10' },
  { uplineId: 107120, memberId: 484794, depth: 12, amount: 1, memberName: 'Mohinur 10' },
  { uplineId: 281417, memberId: 120053, depth: 9, amount: 2.5, memberName: 'Prahlad 33' },
  { uplineId: 908897, memberId: 120053, depth: 10, amount: 2.5, memberName: 'Prahlad 33' },
  { uplineId: 107120, memberId: 120053, depth: 11, amount: 1, memberName: 'Prahlad 33' },
  { uplineId: 9124277, memberId: 2035264, depth: 6, amount: 5, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 333383, memberId: 2035264, depth: 7, amount: 2.5, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 901624, memberId: 2035264, depth: 8, amount: 2.5, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 830666, memberId: 2035264, depth: 9, amount: 2.5, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 170335, memberId: 2035264, depth: 10, amount: 2.5, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 509930, memberId: 2035264, depth: 11, amount: 1, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 630348, memberId: 2035264, depth: 12, amount: 1, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 741392, memberId: 2035264, depth: 13, amount: 1, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 216409, memberId: 2035264, depth: 14, amount: 1, memberName: 'Shyamal Kumar Biswas' },
  { uplineId: 552582, memberId: 2035264, depth: 15, amount: 1, memberName: 'Shyamal Kumar Biswas' },
];

// Get activation dates for members
const memberIds = [...new Set(grants.map(g => g.memberId))];
const memberDates = new Map();

(async () => {
  await client.connect();

  for (const mid of memberIds) {
    const r = await client.query('SELECT activated_at FROM users WHERE id = $1', [mid]);
    if (r.rows[0]) memberDates.set(mid, r.rows[0].activated_at);
  }

  let applied = 0;
  let totalAmount = 0;
  for (const g of grants) {
    try {
      await client.query('BEGIN');
      const id = createId();
      const remark = `Membership Level Income (Level ${g.depth}) from ${g.memberName} (ID ${g.memberId})`;
      const actDate = memberDates.get(g.memberId);
      await client.query(`
        INSERT INTO transactions (id, user_id, type, amount, remark, approved_at, created_at, updated_at)
        VALUES ($1, $2, 'wallet_credit', $3, $4, $5, NOW(), NOW())
      `, [id, g.uplineId, g.amount, remark, actDate]);
      await client.query('UPDATE users SET income_wallet = income_wallet + $1 WHERE id = $2', [g.amount, g.uplineId]);
      await client.query('COMMIT');
      applied++;
      totalAmount += g.amount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.log('ERROR PJ' + String(g.uplineId).padStart(6, '0') + ': ' + err.message);
    }
  }

  console.log('Applied: ' + applied + '/' + grants.length + ' grants, Rs ' + totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }));

  // Final verification
  const stillMissing = await client.query(`
    SELECT u.id, u.name FROM users u
    WHERE u.activated_at IS NOT NULL AND u.activated_at > '2026-08-13' AND u.role != 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.type = 'wallet_credit'
      AND t.remark LIKE '%Membership Level Income%' AND t.remark LIKE '%(ID ' || u.id || ')'
    )
  `);
  console.log('Still missing: ' + stillMissing.rows.length);
  if (stillMissing.rows.length > 0) {
    stillMissing.rows.forEach(r => console.log('  PJ' + String(r.id).padStart(6, '0') + ' ' + r.name));
  }

  await client.end();
})();

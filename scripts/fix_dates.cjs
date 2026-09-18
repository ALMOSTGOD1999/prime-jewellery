const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
c.connect().then(async () => {
  // Move Sep 1 approved_at purchases back to Aug 31
  const r = await c.query("UPDATE purchases SET approved_at = '2026-08-31T23:59:00.000Z' WHERE approved_at >= '2026-09-01' AND cancelled_at IS NULL RETURNING id, approved_at, created_at, amount");
  console.log('Updated purchases:', r.rows);
  
  // Verify no Sep 1 purchases remain
  const v = await c.query("SELECT count(*) as c FROM purchases WHERE approved_at >= '2026-09-01' AND cancelled_at IS NULL");
  console.log('Remaining Sep 1+ purchases:', v.rows[0].c);
  
  await c.end();
});

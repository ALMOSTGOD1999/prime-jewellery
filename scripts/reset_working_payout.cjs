const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  await client.connect();

  // Zero out working and repurchase wallets (they were zeroed before first payout)
  const r = await client.query(`
    UPDATE users SET working_wallet = 0, repurchase_wallet = 0
    WHERE role = 'user' AND (working_wallet != 0 OR repurchase_wallet != 0)
    RETURNING id, name
  `);
  console.log(`Zeroed ${r.rowCount} users' working/repurchase wallets`);

  // Verify
  const wallets = await client.query(`
    SELECT coalesce(sum(income_wallet),0)::float as ti,
           coalesce(sum(working_wallet),0)::float as tw,
           coalesce(sum(repurchase_wallet),0)::float as tr
    FROM users WHERE role = 'user'
  `);
  console.log(`Wallets: Income=₹${wallets.rows[0].ti} Working=₹${wallets.rows[0].tw} Repurchase=₹${wallets.rows[0].tr}`);

  await client.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

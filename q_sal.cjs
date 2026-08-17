const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const { parse } = require('pg-connection-string');

const config = parse(process.env.DATABASE_URL);
const client = new Client({
  host: config.host, port: config.port || 5432, database: config.database,
  user: config.user, password: config.password,
  ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  for (let attempt = 1; ; attempt++) {
    try { await client.connect(); break; } catch (e) {
      if (attempt >= 4) throw e;
      console.error('retry connect', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  const total = await client.query(`SELECT count(*)::int as n FROM salaries`);
  console.log('total salary rows:', total.rows[0].n);

  const byStatus = await client.query(
    `SELECT status, count(*)::int as n, COALESCE(SUM(power + weaker),0)::float as amt
     FROM salaries GROUP BY status ORDER BY status`);
  console.log('--- by status ---');
  for (const r of byStatus.rows) console.log([r.status, r.n, r.amt].join(' | '));

  const byMonth = await client.query(
    `SELECT to_char(created_at, 'YYYY-MM') as m, status, count(*)::int as n
     FROM salaries GROUP BY 1,2 ORDER BY 1,2`);
  console.log('--- by created month/status ---');
  for (const r of byMonth.rows) console.log([r.m, r.status, r.n].join(' | '));

  const paid = await client.query(
    `SELECT id, user_id, power, weaker, status, qualifying_business, paid_at, created_at
     FROM salaries WHERE status = 'paid' ORDER BY created_at LIMIT 20`);
  console.log('--- paid salaries (up to 20) ---');
  for (const r of paid.rows) {
    console.log([r.id, r.user_id, r.power, r.weaker, r.qualifying_business,
      r.paid_at ? r.paid_at.toISOString() : null, r.created_at.toISOString()].join(' | '));
  }

  const uniq = await client.query(
    `SELECT count(distinct user_id)::int as users FROM salaries`);
  console.log('distinct users with salaries:', uniq.rows[0].users);
  await client.end();
}
run().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
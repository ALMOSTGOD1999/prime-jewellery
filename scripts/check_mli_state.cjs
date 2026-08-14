require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const counts = await client.query(`
    SELECT type, count(*)::int AS count, COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE remark LIKE 'Membership Level Income %'
    GROUP BY type
  `)
  console.log('membership income txns:', counts.rows)

  const dist = await client.query(`
    SELECT left(remark, 50) AS sample, count(*)::int AS c
    FROM transactions
    WHERE remark LIKE 'Membership Level Income %'
    GROUP BY left(remark, 50)
    ORDER BY c DESC
    LIMIT 5
  `)
  console.log('sample remarks:', dist.rows)

  const biplab = await client.query(`
    SELECT u.id, u.name, u.income_wallet, u.repurchase_wallet,
      (SELECT count(*)::int FROM transactions t WHERE t.user_id = u.id AND t.remark LIKE 'Membership Level Income %') AS mli_credits,
      (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.user_id = u.id AND t.remark LIKE 'Membership Level Income %') AS mli_total
    FROM users u WHERE u.id = 577611
  `)
  console.log('PJ577611:', biplab.rows[0])

  const walletCheck = await client.query(`
    SELECT count(*)::int AS mismatch
    FROM users u
    JOIN (
      SELECT user_id, SUM(amount) AS credited
      FROM transactions
      WHERE remark LIKE 'Membership Level Income %'
      GROUP BY user_id
    ) t ON t.user_id = u.id
    WHERE ABS((u.income_wallet - 0) - t.credited) > 0.01
  `)
  // income_wallet baseline is 0 for all users who only ever got MLI credits from this backfill;
  // a mismatch here flags wallet/transaction desync.
  console.log('wallet/txn desync rows (baseline 0):', walletCheck.rows[0].mismatch)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

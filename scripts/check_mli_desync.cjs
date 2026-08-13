require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const flagged = await client.query(`
    SELECT u.id, u.name, u.income_wallet,
      COALESCE(t.credited, 0) AS mli_credited,
      ROUND((u.income_wallet - COALESCE(t.credited, 0))::numeric, 2) AS residual
    FROM users u
    LEFT JOIN (
      SELECT user_id, SUM(amount) AS credited
      FROM transactions
      WHERE remark LIKE 'Membership Level Income %'
      GROUP BY user_id
    ) t ON t.user_id = u.id
    WHERE t.user_id IS NOT NULL
      AND ABS((u.income_wallet - COALESCE(t.credited, 0))) > 0.01
    ORDER BY u.id
  `)
  console.log('flagged users:', flagged.rows)

  // Explain residual via other wallet_credit txns (pre-existing balance source)
  for (const f of flagged.rows) {
    const other = await client.query(
      `SELECT type, count(*)::int AS n, COALESCE(SUM(amount),0) AS sum
       FROM transactions
       WHERE user_id = $1 AND type = 'wallet_credit'
         AND remark NOT LIKE 'Membership Level Income %'
       GROUP BY type`,
      [f.id]
    )
    const debits = await client.query(
      `SELECT count(*)::int AS n, COALESCE(SUM(amount),0) AS sum
       FROM transactions
       WHERE user_id = $1 AND type = 'wallet_debit'`,
      [f.id]
    )
    console.log(`user ${f.id} ${f.name}: non-MLI credits=${JSON.stringify(other.rows)}, debits=${JSON.stringify(debits.rows)}`)
  }

  // Also confirm a random sample: income_wallet delta matches membership credits for clean users
  const clean = await client.query(`
    SELECT count(*)::int AS clean
    FROM (
      SELECT u.id
      FROM users u
      JOIN (
        SELECT user_id, SUM(amount) AS credited
        FROM transactions
        WHERE remark LIKE 'Membership Level Income %'
        GROUP BY user_id
      ) t ON t.user_id = u.id
      WHERE ABS((u.income_wallet - COALESCE(t.credited, 0))) <= 0.01
    ) x
  `)
  console.log('clean users (wallet == mli credits):', clean.rows[0].clean)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

const { Client } = require('pg')
require('dotenv').config()

const USERS = [63896, 617173, 571385, 139063, 150228, 713886]

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  for (const uid of USERS) {
    const u = await client.query(`SELECT id, name, income_wallet FROM users WHERE id = $1`, [uid])
    const user = u.rows[0]
    console.log(`\n================ #${uid} ${user.name} | income_wallet = ${Number(user.income_wallet).toFixed(2)} ================`)

    const txns = await client.query(
      `SELECT type, amount, remark, approved_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY approved_at NULLS LAST, created_at`,
      [uid]
    )
    let bal = 0
    for (const t of txns.rows) {
      const amt = Number(t.amount)
      const delta = t.type === 'wallet_credit' ? amt : -amt
      bal += delta
      console.log(
        `${t.approved_at ? t.approved_at.toISOString() : 'NULL'.padEnd(24)} ${t.type === 'wallet_credit' ? 'CREDIT' : 'DEBIT '} ${amt.toFixed(2).padStart(12)}  (bal ${bal.toFixed(2).padStart(12)})  ${t.remark}`
      )
    }
    console.log(`  -> recomputed balance ${bal.toFixed(2)} vs stored ${Number(user.income_wallet).toFixed(2)}`)
  }

  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})

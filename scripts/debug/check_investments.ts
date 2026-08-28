import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

interface DistRow {
  user_id: number
  income_amount: number
  gold_amount: number
  return_amount: number
}

interface ExpectedRow {
  id: number
  expected: number
  name: string
}

export default class CheckInvestments extends BaseCommand {
  static commandName = 'check-investments'
  static description = 'Check PJ617173 investment state + verify proration formula against expected payouts'
  static options: CommandOptions = { startApp: true }

  async run() {
    // ─── 1. PJ617173 full state ───
    console.log('\n═══════════ PJ617173 STATE ═══════════')
    const user = await db.rawQuery(
      `SELECT id, name, total_invested, wallet_balance, activated_at FROM users WHERE id = 617173`
    )
    console.log(user.rows)

    const purchases = await db.rawQuery(
      `SELECT id, amount, approved_at, created_at, rejected_at, stopped_at, cancelled_at
       FROM purchases WHERE user_id = 617173 ORDER BY created_at`
    )
    console.log('\n--- purchases ---')
    for (const p of purchases.rows) console.log(p)

    const investments = await db.rawQuery(
      `SELECT id, amount, monthly_return_rate, status, purchase_id, started_at, closed_at, remark
       FROM investments WHERE user_id = 617173 ORDER BY started_at`
    )
    console.log('\n--- investments ---')
    for (const i of investments.rows) console.log(i)

    const dists = await db.rawQuery(
      `SELECT period_month, investment_amount, return_amount, income_amount, gold_amount, paid_out_at
       FROM investment_return_distributions WHERE user_id = 617173 ORDER BY period_month`
    )
    console.log('\n--- distributions ---')
    for (const d of dists.rows) console.log(d)

    // ─── 2. Verify formula against expected list ───
    console.log('\n═══════════ FORMULA VERIFICATION (July 2026) ═══════════')
    const expected: ExpectedRow[] = [
      { id: 63896, expected: 16828, name: 'Manashi Mallick' },
      { id: 67819, expected: 4924.5, name: 'Prahlad Halder' },
      { id: 139063, expected: 1159.07, name: 'MALA SARKAR' },
      { id: 150228, expected: 4924.5, name: 'RUNA PARVEEN' },
      { id: 245303, expected: 28028, name: 'Prahlad Halder' },
      { id: 278356, expected: 3171, name: 'Taslima Bibi' },
      { id: 331062, expected: 4924, name: 'Prahlad Halder' },
      { id: 499862, expected: 1071, name: 'Manisha Basnet' },
      { id: 533697, expected: 7374.5, name: 'Prahlad Halder' },
      { id: 617173, expected: 16828, name: 'Pranati Baidya' },
      { id: 644117, expected: 1470, name: 'MADHUMITA BAIDYA' },
      { id: 698847, expected: 14028, name: 'Manashi Mallick' },
      { id: 698875, expected: 16828, name: 'Pk Das' },
      { id: 722361, expected: 7374.5, name: 'Prahlad Halder' },
      { id: 776339, expected: 8599.5, name: 'Marufa Molla' },
      { id: 780949, expected: 7374.5, name: 'Sumita Das Banerjee' },
      { id: 932914, expected: 9824.5, name: 'SUBIR BOSE' },
      { id: 5937652, expected: 1540, name: 'DIPANKAR NAG' },
      { id: 7943738, expected: 420, name: 'SHEFALI SHAW' },
      { id: 884535, expected: 15866.66, name: 'KUDDUS' },
      { id: 236641, expected: 15866.66, name: 'PRIYA BALA' },
      { id: 18168, expected: 19600, name: 'SOMA BHAUMIK' },
      { id: 426687, expected: 13066.66, name: 'SK NASIM ISLAM' },
      { id: 165958, expected: 700, name: 'SAJAHAN LASKAR' },
      { id: 295975, expected: 2800, name: 'HUMAYUN KABIR MONDAL' },
    ]

    const distsJuly = await db.rawQuery(
      `SELECT d.user_id, d.return_amount, d.income_amount, d.gold_amount,
              i.monthly_return_rate, i.started_at, i.amount as investment_amount
       FROM investment_return_distributions d
       JOIN investments i ON i.id = d.investment_id
       WHERE d.period_month = '2026-07-01'`
    )
    const distMap = new Map<number, DistRow>()
    for (const d of distsJuly.rows) {
      if (!distMap.has(d.user_id)) {
        distMap.set(d.user_id, {
          user_id: d.user_id,
          income_amount: Number(d.income_amount),
          gold_amount: Number(d.gold_amount),
          return_amount: Number(d.return_amount),
        })
      }
    }

    let allMatch = true

    for (const e of expected) {
      const paid = distMap.get(e.id)
      const paidIncome = paid ? paid.income_amount : 0
      const diff = Math.abs(paidIncome - e.expected)
      const status = diff < 0.02 ? '✅' : diff < 1.5 ? '≈' : '❌'
      if (status !== '✅') allMatch = false
      console.log(
        `  ${String(e.id).padEnd(8)} ${String(e.name).padEnd(20)} expected ₹${String(e.expected).padStart(10)} | paid ₹${String(paidIncome).padStart(10)} ${status}`
      )
    }
    console.log(`\n  All match: ${allMatch}`)

    await db.manager.close('read')
  }
}

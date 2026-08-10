import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

const USER_IDS = [
  63896, 67819, 139063, 150228, 245303, 278356, 331062, 499862, 533697, 617173, 644117, 698847,
  698875, 722361, 776339, 780949, 932914, 5937652, 7943738, 884535, 236641, 18168, 426687,
  165958, 295975,
]

const EXPECTED: Record<number, string> = {
  63896: '16828',
  67819: '4924.5',
  139063: '1159.07',
  150228: '4924.5',
  245303: '28028',
  278356: '3171',
  331062: '4924',
  499862: '1071',
  533697: '7374.5',
  617173: '16828',
  644117: '1470',
  698847: '14028',
  698875: '16828',
  722361: '7374.5',
  776339: '8599.5',
  780949: '7374.5',
  932914: '9824.5',
  5937652: '1540',
  7943738: '420',
  884535: '15866.66',
  236641: '15866.66',
  18168: '19600',
  426687: '13066.66',
  165958: '700',
  295975: '2800',
}

export default class InspectInvestments extends BaseCommand {
  static commandName = 'inspect-investments'
  static description = 'Inspect investments/distributions vs expected amounts'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Investments per user
    const investments = await db.rawQuery(
      `SELECT i.id, i.user_id, i.amount, i.monthly_return_rate, i.status, i.started_at, i.purchase_id, i.remark
       FROM investments i WHERE i.user_id IN (${USER_IDS.join(',')}) ORDER BY i.user_id, i.started_at`
    )

    // Purchases per user
    const purchases = await db.rawQuery(
      `SELECT p.user_id, p.amount, p.approved_at, p.created_at, p.cancelled_at, p.stopped_at
       FROM purchases p WHERE p.user_id IN (${USER_IDS.join(',')}) ORDER BY p.user_id, p.created_at`
    )

    // July distributions per user
    const dists = await db.rawQuery(
      `SELECT d.user_id, d.investment_id, d.return_amount, d.income_amount, d.gold_amount, d.paid_out_at, d.period_month
       FROM investment_return_distributions d WHERE d.user_id IN (${USER_IDS.join(',')})
       ORDER BY d.user_id, d.period_month`
    )

    // Group by user
    const byUser = new Map<number, { inv: any[]; pur: any[]; dist: any[] }>()
    for (const id of USER_IDS) byUser.set(id, { inv: [], pur: [], dist: [] })

    for (const r of investments.rows) byUser.get(r.user_id)?.inv.push(r)
    for (const r of purchases.rows) byUser.get(r.user_id)?.pur.push(r)
    for (const r of dists.rows) byUser.get(r.user_id)?.dist.push(r)

    const users = await db.rawQuery(
      `SELECT id, name, total_invested, status FROM users WHERE id IN (${USER_IDS.join(',')})`
    )
    const nameById = new Map(users.rows.map((u: any) => [u.id, u.name]))
    const statusById = new Map(users.rows.map((u: any) => [u.id, u.status]))
    const totalInvById = new Map(users.rows.map((u: any) => [u.id, u.total_invested]))

    console.log('=== PER-USER INVESTMENT/PURCHASE/DISTRIBUTION ===')
    for (const id of USER_IDS) {
      const d = byUser.get(id)!
      const name = nameById.get(id) ?? '???'
      const status = statusById.get(id) ?? '?'
      console.log(`\n── PJ${String(id).padStart(8, '0')} ${name} (status=${status}, total_invested=${totalInvById.get(id)})  EXPECTED=${EXPECTED[id]}`)

      if (d.inv.length === 0) {
        console.log('   INVESTMENTS: NONE')
      } else {
        for (const i of d.inv) {
          const st = i.started_at instanceof Date ? i.started_at.toISOString() : String(i.started_at)
          console.log(
            `   INV #${i.id} amt=${i.amount} rate=${i.monthly_return_rate} status=${i.status} started=${st} purchase_id=${i.purchase_id} remark="${i.remark}"`
          )
        }
      }

      const totalPurchases = d.pur.reduce((s, p) => s + Number(p.amount), 0)
      if (d.pur.length === 0) {
        console.log('   PURCHASES: NONE')
      } else {
        for (const p of d.pur) {
          const app = p.approved_at ? String(p.approved_at) : 'null'
          const cre = p.created_at ? String(p.created_at) : 'null'
          console.log(
            `   PUR amt=${p.amount} created=${cre} approved=${app} cancelled=${p.cancelled_at ? 'Y' : 'N'} stopped=${p.stopped_at ? 'Y' : 'N'}`
          )
        }
      }

      const july = d.dist.filter((x) => String(x.period_month).startsWith('2026-07'))
      const allDist = d.dist.reduce((s, x) => s + Number(x.return_amount), 0)
      const julyDist = july.reduce((s, x) => s + Number(x.return_amount), 0)
      if (d.dist.length === 0) {
        console.log('   DISTRIBUTIONS: NONE')
      } else {
        for (const x of d.dist) {
          console.log(
            `   DIST ${String(x.period_month).slice(0, 7)} inv#${x.investment_id} return=${x.return_amount} income70=${x.income_amount} gold20=${x.gold_amount} paid=${x.paid_out_at ? 'Y' : 'N'}`
          )
        }
      }
      console.log(
        `   TOTAL purchases=₹${totalPurchases} | ALL dist return=₹${allDist.toFixed(2)} | JULY dist return=₹${julyDist.toFixed(2)}`
      )

      // Hypothetical: 3.5% full month on purchases (July), 3.5% on investments
      const julyInvActive = d.inv.filter(
        (i) => i.status === 'active' && i.started_at && String(i.started_at) <= '2026-08-01'
      )
      const hypo = julyInvActive.reduce((s, i) => s + (Number(i.amount) * Number(i.monthly_return_rate)) / 100, 0)
      console.log(`   HYPOTHETICAL full-month (active inv × rate): ₹${hypo.toFixed(2)}`)
    }

    await db.manager.close('read')
  }
}

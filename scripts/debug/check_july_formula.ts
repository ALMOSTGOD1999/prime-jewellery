import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

interface ExpectedRow {
  id: number
  expected: number
  name: string
}

export default class CheckJulyFormula extends BaseCommand {
  static commandName = 'check:july-formula'
  static description = 'Compare old vs new proration formula against user expected values (July 2026)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const period = DateTime.fromISO('2026-07-01').startOf('month')
    const daysInMonth = period.daysInMonth!

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

    const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

    const dists = await db.rawQuery(
      `SELECT d.id as dist_id, d.user_id, d.return_amount, d.income_amount, d.gold_amount,
              i.id as inv_id, i.amount, i.monthly_return_rate, i.started_at
       FROM investment_return_distributions d
       JOIN investments i ON i.id = d.investment_id
       WHERE d.period_month = '2026-07-01'
       ORDER BY d.user_id`
    )

    console.log('\n═══ per-investment: old(UTC/31d) vs new(IST/30d) vs paid vs expected ═══')
    for (const d of dists.rows) {
      const started = DateTime.fromJSDate(d.started_at, { zone: 'utc' })
      const startedIst = started.setZone('Asia/Kolkata')
      const amount = Number(d.amount)
      const rate = Number(d.monthly_return_rate) || 3

      // OLD formula
      const sOld = started.startOf('day')
      const startDayOld = sOld.month === period.month ? sOld.day : 1
      const activeOld = daysInMonth - startDayOld + 1
      const oldRet = round((amount * rate * activeOld / daysInMonth) / 100)

      // NEW formula
      const sNew = startedIst.startOf('day')
      const monthEnd = period.endOf('month').setZone('Asia/Kolkata').startOf('day')
      const activeNew = Math.min(monthEnd.diff(sNew, 'days').days + 1, 30)
      const newRet = round((amount * rate * Math.max(activeNew, 1) / 30) / 100)

      const exp = expected.find((e) => e.id === d.user_id)
      const expVal = exp ? exp.expected : null
      const matchesNew = expVal !== null && Math.abs(expVal - round(newRet * 0.7)) < 0.02
      const matchesOld = expVal !== null && Math.abs(expVal - round(oldRet * 0.7)) < 0.02
      const matchTag = matchesNew ? 'NEW✓' : matchesOld ? 'OLD✓' : '   ✗'

      console.log(
        `PJ${String(d.user_id).padStart(7, '0')} inv#${String(d.inv_id).padStart(3)} ` +
          `start=${started.toFormat('MM-dd')}UTC/${startedIst.toFormat('MM-dd')}IST ` +
          `amt=${amount} rate=${rate}% ` +
          `old=${activeOld}/${daysInMonth}→₹${oldRet} new=${activeNew}/30→₹${newRet} ` +
          `paidIncome=${d.income_amount} exp=${expVal ?? '-'} ${matchTag}`
      )
    }

    await db.manager.close('read')
  }
}

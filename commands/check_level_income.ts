import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import RewardService from '#services/reward_service'

export default class CheckLevelIncome extends BaseCommand {
  static commandName = 'check:level-income'
  static description = 'Check level income for a user in a specific month'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'User ID (numeric, e.g. 630351)', required: false })
  declare userIdArg: string

  @args.string({ description: 'Month in yyyy-MM format (default: 2026-06)', required: false })
  declare monthArg: string

  async run() {
    const userIdArg = this.userIdArg || '630351'
    const monthStr = this.monthArg || '2026-06'

    const userId = Number(userIdArg)
    if (!userId) {
      this.logger.error('Invalid user ID')
      return
    }

    const user = await User.find(userId)
    if (!user) {
      this.logger.error(`User ${userId} not found`)
      return
    }

    const month = DateTime.fromISO(monthStr + '-01').startOf('month')
    const asOf = month.endOf('month')
    const monthLabel = month.toFormat('yyyy-MM')

    this.logger.info('')
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  Level Income Report — ${monthLabel}`)
    this.logger.info(`──────────────────────────────────────────────────`)
    this.logger.info(`  User  : PJ${String(user.id).padStart(6, '0')} — ${user.name}`)
    this.logger.info(`  Role  : ${user.role}`)
    this.logger.info(`  Month : ${monthLabel}`)
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info('')

    // ─── 1. Direct Children ───
    const directChildren = await user.related('children').query().count('* as total')
    const directCount = Number(directChildren[0].$extras.total)
    this.logger.info(`[Direct Children] ${directCount}`)

    // Max depth based on direct count
    let maxDepth = 0
    if (directCount >= 5) maxDepth = 20
    else if (directCount >= 4) maxDepth = 12
    else if (directCount >= 3) maxDepth = 8
    else if (directCount >= 2) maxDepth = 4
    else if (directCount >= 1) maxDepth = 2

    this.logger.info(`[Max Depth] ${maxDepth}`)

    // ─── 2. Level Income (purchase-based) ───
    this.logger.info('')
    this.logger.info('─── Level Income (Purchase Based) ───')

    const levelRewards = await RewardService.getLevelRewards(user, {
      limit: 1000,
      asOf,
      sortOrder: 'asc',
    })

    const juneLevelRewards = levelRewards.data.filter((r: any) => r.date.startsWith(monthLabel))
    const juneLevelTotal = juneLevelRewards.reduce((s: number, r: any) => s + r.amount, 0)

    this.logger.info(`  Total rewards up to ${monthLabel}: ${levelRewards.stats.totalRewards}`)
    this.logger.info(`  This month (${monthLabel}): ${juneLevelTotal}`)
    this.logger.info(`  Total withdrawn: ${levelRewards.stats.totalWithdrawn}`)

    if (juneLevelRewards.length > 0) {
      this.logger.info('  Daily breakdown:')
      for (const r of juneLevelRewards) {
        this.logger.info(`    ${r.date} — ₹${r.amount.toFixed(2)}`)
      }
    } else {
      this.logger.info('  No level income this month.')
    }

    // ─── 3. EMI Level Income ───
    this.logger.info('')
    this.logger.info('─── EMI Level Income ───')

    const emiRewards = await RewardService.getEmiLevelRewards(user, {
      limit: 1000,
      asOf,
      sortOrder: 'asc',
    })

    const juneEmiRewards = emiRewards.data.filter((r: any) => r.date.startsWith(monthLabel))
    const juneEmiTotal = juneEmiRewards.reduce((s: number, r: any) => s + r.amount, 0)

    this.logger.info(`  Total EMI rewards up to ${monthLabel}: ${emiRewards.stats.totalRewards}`)
    this.logger.info(`  This month (${monthLabel}): ${juneEmiTotal}`)
    this.logger.info(`  Total EMI withdrawn: ${emiRewards.stats.totalWithdrawn}`)

    if (juneEmiRewards.length > 0) {
      this.logger.info('  Daily breakdown:')
      for (const r of juneEmiRewards) {
        this.logger.info(`    ${r.date} — ₹${r.amount.toFixed(2)}`)
      }
    } else {
      this.logger.info('  No EMI level income this month.')
    }

    // ─── 4. Total Working Income for June ───
    this.logger.info('')
    this.logger.info('─── Total Working Income (June) ───')

    const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, month)
    const incomeWallet = grossAmount * 0.7
    const repurchaseWallet = grossAmount * 0.2

    this.logger.info(`  Gross Working Income: ₹${grossAmount.toFixed(2)}`)
    this.logger.info(`  Income Wallet (70%):  ₹${incomeWallet.toFixed(2)}`)
    this.logger.info(`  Repurchase (20%):     ₹${repurchaseWallet.toFixed(2)}`)
    this.logger.info('')

    // ─── 5. Descendant purchase summary ───
    this.logger.info('─── Descendant Purchase Summary ───')

    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default

    const descendants = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT d.id, d.name, d.depth,
        COALESCE(SUM(p.amount) FILTER (WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL), 0)::float as total_purchases
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id
      GROUP BY d.id, d.name, d.depth
      ORDER BY d.depth, d.id`,
      [user.id]
    )

    if (descendants.rows.length === 0) {
      this.logger.info('  No descendants found.')
    } else {
      this.logger.info(`  ${descendants.rows.length} descendants:`)
      for (const d of descendants.rows) {
        const paddedId = String(d.id).padStart(6, '0')
        this.logger.info(`    L${d.depth} PJ${paddedId} — ${d.name} — ₹${d.total_purchases}`)
      }
    }

    // ─── 6. Grand Total ───
    const combined = juneLevelTotal + juneEmiTotal
    this.logger.info('')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info(`  June Level Income:        ₹${juneLevelTotal.toFixed(2)}`)
    this.logger.info(`  June EMI Level Income:    ₹${juneEmiTotal.toFixed(2)}`)
    this.logger.info(`  ──────────────────────────────────────────────`)
    this.logger.info(`  Combined Level Income:    ₹${combined.toFixed(2)}`)
    this.logger.info(`  Total Working Income:     ₹${grossAmount.toFixed(2)}`)
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('')
  }
}

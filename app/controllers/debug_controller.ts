import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import Transaction from '#models/transaction'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import InvestmentReturnDistribution from '#models/investment_return_distribution'

export default class DebugController {
  /**
   * GET /admin/debug/user-income/:id?month=2026-08
   * Full income breakdown for a single user in a specific month.
   * Covers all 7 income sources: activation cashback, activation sponsor,
   * activation level, level income, EMI level income, salary, and cashback return.
   */
  async userIncome({ params, request, response }: HttpContext) {
    const userId = Number(params.id)
    const monthParam = request.qs().month as string | undefined
    const month = monthParam
      ? DateTime.fromISO(monthParam + '-01').startOf('month')
      : DateTime.now().minus({ months: 1 }).startOf('month')

    const monthStr = month.toFormat('yyyy-MM')
    const monthStart = month.startOf('month')
    const monthEnd = month.endOf('month')

    const user = await User.find(userId)
    if (!user) {
      return response.json({ error: `User ${userId} not found` })
    }

    const result: any = {
      user: { id: user.id, name: user.name, code: `PJ${String(user.id).padStart(6, '0')}` },
      month: monthStr,
      activation: {
        activatedAt: user.activatedAt,
        activationAmount: Number(user.activationAmount) || 1000,
      },
      sources: {},
      total: 0,
    }

    // ─── 1. Activation Cashback ───
    const actAmt = Number(user.activationAmount) || 1000
    const monthlyCashback = (actAmt * 0.1) / 2
    let activationCashback = 0
    if (user.activatedAt) {
      const activatedAt = DateTime.fromJSDate(new Date(user.activatedAt.toString()))
      const month1Date = activatedAt.plus({ months: 1 })
      const month2Date = activatedAt.plus({ months: 2 })
      if (monthEnd >= month1Date && month1Date.toFormat('yyyy-MM') === monthStr)
        activationCashback += monthlyCashback
      if (monthEnd >= month2Date && month2Date.toFormat('yyyy-MM') === monthStr)
        activationCashback += monthlyCashback
    }
    result.sources.activationCashback = {
      amount: Math.round(activationCashback * 100) / 100,
      detail: activationCashback > 0
        ? `${monthlyCashback}/mo × ${activationCashback >= monthlyCashback * 2 ? 2 : 1} month(s)`
        : 'Not eligible this month',
      wallet: 'working',
    }
    result.total += activationCashback

    // ─── 2. Activation Sponsor ───
    let activationSponsor = 0
    const directChildren = await user.related('children').query()
    const directCount = directChildren.length
    const sponsorChildren: any[] = []

    if (directCount > 0) {
      const newActivated = await user
        .related('children')
        .query()
        .whereNotNull('activated_at')
        .whereBetween('activated_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
      activationSponsor = newActivated.length * actAmt * 0.1
      for (const c of newActivated) {
        sponsorChildren.push({ id: c.id, name: c.name, activatedAt: c.activatedAt })
      }
    }
    result.sources.activationSponsor = {
      amount: Math.round(activationSponsor * 100) / 100,
      detail: `${sponsorChildren.length} direct(s) activated this month × ₹${actAmt * 0.1}`,
      children: sponsorChildren,
      wallet: 'working',
    }
    result.total += activationSponsor

    // ─── 3. Activation Level Rewards (incremental this month) ───
    let activationLevel = 0
    if (directCount > 0) {
      const levelEnd = await RewardService.getActivationLevelRewards(user, { limit: 1, asOf: monthEnd })
      const levelStart = await RewardService.getActivationLevelRewards(user, { limit: 1, asOf: monthStart.minus({ days: 1 }) })
      activationLevel = Math.max(0, (levelEnd.stats.totalEligible || 0) - (levelStart.stats.totalEligible || 0))
    }
    result.sources.activationLevel = {
      amount: Math.round(activationLevel * 100) / 100,
      detail: directCount > 0 ? `Incremental activation level rewards for ${monthStr}` : 'No directs',
      wallet: 'working',
    }
    result.total += activationLevel

    // ─── 4. Level Income (purchase-based) ───
    let levelIncome = 0
    let levelIncomeDetail: any = { members: 0, teamBusiness: 0, maxLevel: 0 }
    if (directCount > 0) {
      const levelRewards = await RewardService.getLevelRewards(user, { limit: 100, asOf: monthEnd })
      levelIncome = levelRewards.stats.thisMonthRewards || 0

      // Get unlock info
      const tbd = await db.rawQuery(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM users WHERE parent_id = ?
           UNION ALL
           SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
         )
         SELECT COALESCE(SUM(p.amount), 0)::float as total_team_business
         FROM descendants d
         LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL`,
        [user.id]
      )
      const teamBusiness = Number(tbd.rows[0]?.total_team_business) || 0

      const TeamBusinessLevel = (await import('#models/team_business_level')).default
      const LevelIncomeModel = (await import('#models/level_income')).default
      const teamBusinessLevel = await TeamBusinessLevel.getLevelForBusiness(teamBusiness)
      const maxDepth = await LevelIncomeModel.getMaxUnlockedLevel(directCount, teamBusinessLevel)

      // Get breakdown per level
      const breakdownData = await RewardService.getLevelRewardBreakdown(user, monthEnd.toISODate()!)
      levelIncomeDetail = {
        members: breakdownData.breakdown?.length || 0,
        teamBusiness,
        teamBusinessLevel,
        maxUnlockedLevel: maxDepth,
        breakdown: breakdownData.breakdown?.map((b: any) => ({
          level: b.level,
          amount: b.amount,
          memberCount: b.memberCount,
        })) || [],
      }
    }
    result.sources.levelIncome = {
      amount: Math.round(levelIncome * 100) / 100,
      detail: directCount > 0 ? `Daily level income accumulated over ${monthStr}` : 'No directs',
      ...levelIncomeDetail,
      wallet: 'working',
    }
    result.total += levelIncome

    // ─── 5. EMI Level Income ───
    let emiLevelIncome = 0
    if (directCount > 0) {
      const emiRewards = await RewardService.getEmiLevelRewards(user, { limit: 1, asOf: monthEnd })
      emiLevelIncome = emiRewards.stats.thisMonthRewards || 0
    }
    result.sources.emiLevelIncome = {
      amount: Math.round(emiLevelIncome * 100) / 100,
      detail: emiLevelIncome > 0 ? `EMI-based level income for ${monthStr}` : 'No EMI transactions from descendants',
      wallet: 'working',
    }
    result.total += emiLevelIncome

    // ─── 6. Salary / Performance Incentive ───
    const { legAmounts } = await RewardService.getPowerAndWeaker(user, monthEnd, monthStart.minus({ months: 5 }))
    const salaryInfo = RewardService.getSalaryInfo(legAmounts || [])
    let salary = 0

    // Check if already paid for this month
    const monthSalaries = await user.related('salaries').query()
      .where('created_at', '>=', monthStart.toSQL()!)
      .where('created_at', '<=', monthEnd.toSQL()!)
      .orderBy('created_at', 'asc')
    const monthSalary = monthSalaries[0]

    if (monthSalary && monthSalary.status === 'paid') {
      salary = monthSalary.info?.reward || 0
    } else if (salaryInfo) {
      salary = salaryInfo.reward
    }

    result.sources.salary = {
      amount: Math.round(salary * 100) / 100,
      detail: salaryInfo
        ? `${salaryInfo.designation} — Total ₹${salaryInfo.totalBusiness.toLocaleString('en-IN')} (Power ₹${salaryInfo.topLeg.toLocaleString('en-IN')} / Others ₹${salaryInfo.otherLegs.toLocaleString('en-IN')})`
        : 'Not eligible (no 60:40 match or no team)',
      designation: salaryInfo?.designation || null,
      totalBusiness: salaryInfo?.totalBusiness || 0,
      powerLeg: salaryInfo?.topLeg || 0,
      otherLegs: salaryInfo?.otherLegs || 0,
      allLegs: legAmounts || [],
      paid: monthSalary?.status === 'paid',
      wallet: 'working',
    }
    result.total += salary

    // ─── 7. Cashback / Investment Return (Income Wallet) ───
    let cashbackReturn = 0
    const distributions = await db.rawQuery(
      `SELECT return_amount, income_amount, gold_amount, investment_id, period_month
       FROM investment_return_distributions
       WHERE user_id = ? AND period_month = ?`,
      [userId, month.toISODate()!]
    )
    const cashbackDetails: any[] = []
    for (const d of distributions.rows) {
      cashbackReturn += Number(d.return_amount)
      cashbackDetails.push({
        investmentId: d.investment_id,
        returnAmount: Number(d.return_amount),
        incomeShare: Number(d.income_amount),
        repurchaseShare: Number(d.gold_amount),
      })
    }
    result.sources.cashbackReturn = {
      amount: Math.round(cashbackReturn * 100) / 100,
      detail: cashbackDetails.length > 0
        ? `${cashbackDetails.length} investment(s) — 70% income + 20% repurchase`
        : 'No investments or no distribution this month',
      distributions: cashbackDetails,
      wallet: 'income (70%) + repurchase (20%)',
    }
    result.total += cashbackReturn

    // ─── Summary ───
    result.total = Math.round(result.total * 100) / 100
    result.summary = {
      totalWorkingWallet:
        Math.round((activationCashback + activationSponsor + activationLevel + levelIncome + emiLevelIncome + salary) * 100) / 100,
      totalIncomeWallet: Math.round(cashbackReturn * 0.7 * 100) / 100,
      totalRepurchaseWallet: Math.round(cashbackReturn * 0.2 * 100) / 100,
      totalAllSources: result.total,
    }

    return response.json(result)
  }

  async payout({ response, request }: HttpContext) {
    const period = DateTime.now().minus({ months: 1 }).startOf('month')
    const periodEnd = period.endOf('month')
    const page = Math.max(1, Number(request.qs().page || 1))
    const limit = 100
    const offset = (page - 1) * limit

    const [
      purchaseStats,
      snapshotStats,
      snapshotPaid,
      distStats,
      invStats,
      sampleUser,
      allTxns,
      reversalTxns,
      txnCount,
    ] = await Promise.all([
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(amount),0)::float as total FROM purchases WHERE approved_at IS NOT NULL AND cancelled_at IS NULL AND approved_at >= ? AND approved_at <= ?`,
        [period.toSQL()!, periodEnd.toSQL()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(gross_amount),0)::float as total FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as total, count(*) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid, count(*) FILTER (WHERE paid_out_at IS NULL)::int as unpaid FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count FROM investment_return_distributions WHERE period_month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(`SELECT count(*)::int as count FROM investments WHERE status = 'active'`),
      db.rawQuery(
        `SELECT id, name, income_wallet FROM users WHERE role = 'user' AND activated_at IS NOT NULL ORDER BY id LIMIT 5`
      ),
      // ALL June payout transactions (paginated)
      db.rawQuery(
        `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.type, t.remark, t.created_at
         FROM transactions t LEFT JOIN users u ON t.user_id = u.id
         WHERE t.remark ILIKE '%working income for June 2026%'
         ORDER BY t.created_at ASC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      // Reversal transactions for June
      db.rawQuery(
        `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.remark, t.created_at
         FROM transactions t LEFT JOIN users u ON t.user_id = u.id
         WHERE t.remark ILIKE '%REVERSAL%June 2026%'
         ORDER BY t.created_at ASC`
      ),
      // Total count
      db.rawQuery(
        `SELECT count(*)::int as total FROM transactions WHERE remark ILIKE '%working income for June 2026%'`
      ),
    ])

    const totalTxns = txnCount.rows[0].total
    const totalPages = Math.ceil(totalTxns / limit)

    // Count unique users who received payout (only non-reversal)
    const paidUserIds = new Set()
    allTxns.rows.forEach((t: any) => {
      if (!t.remark?.includes('REVERSAL')) paidUserIds.add(t.user_id)
    })

    return response.json({
      period: period.toISODate(),
      summary: {
        purchases: purchaseStats.rows[0],
        snapshots: snapshotStats.rows[0],
        snapshotPaid: snapshotPaid.rows[0],
        distributions: distStats.rows[0],
        investments: invStats.rows[0],
        uniquePaidUsers: paidUserIds.size,
      },
      transactions: {
        page,
        totalPages,
        total: totalTxns,
        perPage: limit,
        data: allTxns.rows,
      },
      reversals: {
        count: reversalTxns.rows.length,
        data: reversalTxns.rows,
      },
      sampleUsers: sampleUser.rows,
    })
  }

  async cleanupPayout({ response }: HttpContext) {
    const remark = '%monthly working income for June 2026%'
    const allTxns = await Transaction.query()
      .where('remark', 'ILIKE', remark)
      .orderBy('created_at', 'asc')

    const seen = new Map<string, string>()
    const toReverse: typeof allTxns = []

    for (const txn of allTxns) {
      const isIncome =
        txn.remark?.toLowerCase().includes('cashback wallet (70%)') ||
        txn.remark?.toLowerCase().includes('income wallet (70%)')
      const walletType = isIncome ? 'income' : 'repurchase'
      const key = `${txn.userId}-${walletType}`
      if (seen.has(key)) {
        toReverse.push(txn)
      } else {
        seen.set(key, txn.id)
      }
    }

    let reversed = 0
    let totalReversed = 0

    for (const txn of toReverse) {
      const user = await User.find(txn.userId)
      if (!user) continue
      const isIncome =
        txn.remark?.toLowerCase().includes('cashback wallet (70%)') ||
        txn.remark?.toLowerCase().includes('income wallet (70%)')
      const amount = Number(txn.amount)

      await db.transaction(async (trx) => {
        if (isIncome) {
          user.incomeWallet = Math.max(0, Number(user.incomeWallet ?? 0) - amount)
        } else {
          user.repurchaseWallet = Math.max(0, Number(user.repurchaseWallet ?? 0) - amount)
        }
        await user.useTransaction(trx).save()
        await Transaction.create(
          {
            userId: txn.userId,
            amount,
            type: 'wallet_debit' as any,
            remark: `REVERSAL: Duplicate ${isIncome ? 'income' : 'repurchase'} June 2026 (orig: ${txn.id})`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
      })

      reversed++
      totalReversed += amount
    }

    return response.json({
      message: `Reversed ${reversed} duplicate transactions, total ₹${totalReversed.toLocaleString('en-IN')}.`,
      duplicatesFound: toReverse.length,
      duplicates: toReverse.map((t) => ({
        id: t.id,
        userId: t.userId,
        amount: t.amount,
        remark: t.remark,
      })),
    })
  }

  /**
   * POST /admin/debug/find-orphans?dry_run=1
   * Find and optionally close investments with no matching approved purchase,
   * delete their distributions, and reverse wallet credits.
   */
  async findOrphans({ request, response }: HttpContext) {
    const dryRun = request.qs().dry_run === '1' || request.qs().dry_run === 'true'

    // 1. Find orphaned investments
    const orphanResult = await db.rawQuery(`
      SELECT
        i.id AS investment_id,
        i.user_id,
        i.amount AS investment_amount,
        i.status AS investment_status,
        i.started_at,
        i.purchase_id,
        p.id AS purchase_id_check,
        p.amount AS purchase_amount,
        p.approved_at AS purchase_approved_at,
        p.cancelled_at AS purchase_cancelled_at,
        u.name AS user_name,
        u.code AS user_code,
        u.income_wallet,
        u.working_wallet
      FROM investments i
      LEFT JOIN purchases p ON p.id = i.purchase_id
      LEFT JOIN users u ON u.id = i.user_id
      WHERE i.status = 'active'
        AND (
          i.purchase_id IS NULL
          OR p.id IS NULL
          OR p.approved_at IS NULL
          OR p.cancelled_at IS NOT NULL
        )
      ORDER BY i.user_id
    `)

    if (orphanResult.rows.length === 0) {
      return response.json({ message: 'No orphaned investments found.', orphans: [], distributions: [] })
    }

    // 2. Find distributions from these orphaned investments
    const orphanIds = orphanResult.rows.map((r: any) => r.investment_id)
    const distResult = await db.rawQuery(`
      SELECT
        ird.id AS distribution_id,
        ird.user_id,
        ird.investment_id,
        ird.period_month,
        ird.return_amount,
        ird.income_amount,
        ird.gold_amount,
        u.name AS user_name,
        u.code AS user_code
      FROM investment_return_distributions ird
      LEFT JOIN users u ON u.id = ird.user_id
      WHERE ird.investment_id IN (${orphanIds.join(',')})
      ORDER BY ird.user_id, ird.period_month
    `)

    // Group by user for reversal amounts
    const byUser = new Map<number, { name: string; code: string; total: number }>()
    for (const d of distResult.rows) {
      const uid = d.user_id
      if (!byUser.has(uid)) {
        byUser.set(uid, { name: d.user_name, code: d.user_code, total: 0 })
      }
      byUser.get(uid)!.total += Number(d.income_amount)
    }

    if (dryRun) {
      return response.json({
        mode: 'DRY_RUN',
        message: `Found ${orphanResult.rows.length} orphaned investments and ${distResult.rows.length} distributions`,
        orphans: orphanResult.rows,
        distributions: distResult.rows,
        reversals: Array.from(byUser.entries()).map(([userId, data]) => ({
          userId,
          name: data.name,
          code: data.code,
          incomeWalletDebit: data.total,
        })),
      })
    }

    // 3. Apply fixes in a transaction
    let reversedUsers = 0
    let totalReversed = 0

    await db.transaction(async (trx) => {
      // Close orphaned investments
      for (const row of orphanResult.rows) {
        await trx.rawQuery(
          `UPDATE investments SET status = 'closed', closed_at = NOW(), remark = 'Closed by debug/find-orphans: no valid purchase' WHERE id = ?`,
          [row.investment_id]
        )
      }

      // Delete distributions from orphaned investments
      for (const id of orphanIds) {
        await trx.rawQuery(
          `DELETE FROM investment_return_distributions WHERE investment_id = ?`,
          [id]
        )
      }

      // Reverse wallet credits for each affected user
      for (const [userId, data] of byUser) {
        if (data.total > 0) {
          await trx.rawQuery(
            `UPDATE users SET income_wallet = GREATEST(0, income_wallet - ?) WHERE id = ?`,
            [data.total, userId]
          )
          await trx.rawQuery(
            `INSERT INTO transactions (user_id, type, amount, remark, approved_at, created_at)
             VALUES (?, 'wallet_debit', ?, 'REVERSAL: Cashback from orphaned investments (no valid purchase) — closed by debug/find-orphans', NOW(), NOW())`,
            [userId, data.total]
          )
          reversedUsers++
          totalReversed += data.total
        }
      }
    })

    return response.json({
      mode: 'APPLIED',
      message: `Closed ${orphanResult.rows.length} orphaned investments, deleted ${distResult.rows.length} distributions, reversed ₹${totalReversed.toLocaleString('en-IN')} from ${reversedUsers} users.`,
      orphansClosed: orphanResult.rows.length,
      distributionsDeleted: distResult.rows.length,
      usersReversed: reversedUsers,
      totalReversed,
    })
  }

  /**
   * POST /admin/debug/reverse-illegible-income?dry_run=1
   * Reverse illegitimate level income for users who received income from
   * downline purchases made BEFORE the downline member was activated.
   * Targets: PJ170335, PJ741392, PJ216409
   */
  async reverseIllegibleIncome({ request, response }: HttpContext) {
    const dryRun = request.qs().dry_run === '1' || request.qs().dry_run === 'true'
    const targetIds = [170335, 741392, 216409]

    const targets = await User.query().whereIn('id', targetIds)
    if (targets.length === 0) {
      return response.json({ message: 'Could not find any target users.', results: [] })
    }

    const results: any[] = []
    let totalReversed = 0
    let totalTransactions = 0

    for (const target of targets) {
      const levelIncomeTxns = await Transaction.query()
        .where('user_id', target.id)
        .where('type', 'wallet_credit')
        .where('remark', 'like', 'Membership Level Income %')
        .whereNotNull('approved_at')
        .orderBy('approved_at', 'asc')

      const illegitimate: Array<{
        txn: Transaction
        memberId: number
        memberName: string
        level: number
        amount: number
        reason: string
      }> = []

      for (const txn of levelIncomeTxns) {
        const match = txn.remark?.match(
          /Membership Level Income \(Level (\d+)\) from (.+) \(ID (\d+)\)/
        )
        if (!match) continue

        const level = Number(match[1])
        const memberName = match[2]
        const memberId = Number(match[3])

        const member = await User.find(memberId)
        if (!member) continue

        if (!member.activatedAt) {
          illegitimate.push({
            txn, memberId, memberName, level,
            amount: Number(txn.amount),
            reason: `Member ${memberName} (ID ${memberId}) was NEVER activated`,
          })
          continue
        }

        const earliestPurchase = await db
          .from('purchases')
          .where('user_id', memberId)
          .whereNotNull('approved_at')
          .whereNull('cancelled_at')
          .orderBy('approved_at', 'asc')
          .first()

        if (earliestPurchase) {
          const purchaseDate = DateTime.fromJSDate(
            new Date(earliestPurchase.approved_at)
          ).startOf('day')
          const memberActivatedAt = DateTime.fromJSDate(
            new Date(member.activatedAt.toString())
          ).startOf('day')

          if (purchaseDate < memberActivatedAt) {
            illegitimate.push({
              txn, memberId, memberName, level,
              amount: Number(txn.amount),
              reason: `Earliest purchase (${purchaseDate.toFormat('yyyy-MM-dd')}) BEFORE activation (${memberActivatedAt.toFormat('yyyy-MM-dd')})`,
            })
          }
        }
      }

      let userTotal = 0
      for (const item of illegitimate) userTotal += item.amount

      if (illegitimate.length > 0 && !dryRun) {
        await db.transaction(async (trx) => {
          for (const item of illegitimate) {
            await User.query({ client: trx })
              .where('id', target.id)
              .decrement('working_wallet', item.amount)

            await Transaction.create(
              {
                userId: target.id,
                type: 'wallet_debit' as any,
                amount: item.amount,
                remark: `REVERSAL: Level ${item.level} income from ${item.memberName} (ID ${item.memberId}) — purchase before activation (Original Txn #${item.txn.id})`,
                approvedAt: DateTime.now(),
              },
              { client: trx }
            )
          }
        })
      }

      totalReversed += userTotal
      totalTransactions += illegitimate.length

      results.push({
        userId: target.id,
        name: target.name,
        levelIncomeTxnsFound: levelIncomeTxns.length,
        illegitimateCount: illegitimate.length,
        subtotal: userTotal,
        illegitimate: illegitimate.map((i) => ({
          txnId: i.txn.id,
          level: i.level,
          amount: i.amount,
          memberId: i.memberId,
          memberName: i.memberName,
          reason: i.reason,
        })),
      })
    }

    return response.json({
      mode: dryRun ? 'DRY_RUN' : 'APPLIED',
      message: dryRun
        ? `Would reverse ${totalTransactions} transactions totaling ₹${totalReversed.toLocaleString('en-IN')}`
        : `Reversed ${totalTransactions} transactions totaling ₹${totalReversed.toLocaleString('en-IN')}`,
      totalTransactions,
      totalReversed,
      results,
    })
  }

  async dryRunPayout({ request, response }: HttpContext) {
    const monthParam = request.qs().month as string | undefined
    const month = monthParam
      ? DateTime.fromISO(monthParam + '-01').startOf('month')
      : DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    // 1. Cashback Wallet Payout preview
    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', month.toISODate()!)
      .whereNull('paid_out_at')

    const incomePreview = distributions.map((d) => {
      const gross = Number(d.returnAmount)
      return {
        userId: d.userId,
        investmentId: d.investmentId,
        investmentAmount: Number(d.investmentAmount),
        returnPercent: (Number(d.returnAmount) / Number(d.investmentAmount)) * 100,
        grossReturn: gross,
        incomeWallet70: Math.round(gross * PayoutService.INCOME_PERCENT * 100) / 100,
        repurchaseWallet20: Math.round(gross * PayoutService.REPURCHASE_PERCENT * 100) / 100,
      }
    })

    const incomeSummary = {
      count: incomePreview.length,
      totalGross: incomePreview.reduce((s, d) => s + d.grossReturn, 0),
      totalIncome70: incomePreview.reduce((s, d) => s + d.incomeWallet70, 0),
      totalRepurchase20: incomePreview.reduce((s, d) => s + d.repurchaseWallet20, 0),
    }

    // 2. Working Wallet Payout preview (uses corrected logic)
    const users = await User.query().where('role', 'user').whereNotNull('activated_at')
    const workingPreview: any[] = []

    for (const user of users) {
      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', user.id)
        .where('month', month.toISODate()!)
        .first()

      if (existing && existing.paidOutAt) continue // already paid

      const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, month)
      if (grossAmount <= 0) continue

      const incomeWalletAmount = Math.round(grossAmount * PayoutService.INCOME_PERCENT * 100) / 100
      const repurchaseWalletAmount =
        Math.round(grossAmount * PayoutService.REPURCHASE_PERCENT * 100) / 100

      // Fetch breakdown sources separately to avoid lint errors on inline await chains
      const cbRes = await RewardService.getActivationCashbackRewards(user, {
        limit: 100,
        asOf: month.endOf('month'),
      })
      const spRes = await RewardService.getActivationSponsorRewards(user, {
        limit: 100,
        asOf: month.endOf('month'),
      })
      const lvRes = await RewardService.getLevelRewards(user, {
        limit: 1,
        asOf: month.endOf('month'),
      })
      const emRes = await RewardService.getEmiLevelRewards(user, {
        limit: 1,
        asOf: month.endOf('month'),
      })

      const breakdown = {
        activationCashback: cbRes.data
          .filter((r: any) => r.date?.startsWith(monthStr))
          .reduce((s: number, r: any) => s + r.amount, 0),
        activationSponsor: spRes.data
          .filter((r: any) => r.date?.startsWith(monthStr))
          .reduce((s: number, r: any) => s + r.amount, 0),
        levelIncome: lvRes.data
          .filter((r: any) => r.date?.startsWith(monthStr))
          .reduce((s: number, r: any) => s + r.amount, 0),
        emiLevel: emRes.data
          .filter((r: any) => r.date?.startsWith(monthStr))
          .reduce((s: number, r: any) => s + r.amount, 0),
      }

      workingPreview.push({
        userId: user.id,
        name: user.name,
        grossAmount,
        incomeWallet70: incomeWalletAmount,
        repurchaseWallet20: repurchaseWalletAmount,
        breakdown,
      })
    }

    const workingSummary = {
      count: workingPreview.length,
      totalGross: workingPreview.reduce((s, d) => s + d.grossAmount, 0),
      totalIncome70: workingPreview.reduce((s, d) => s + d.incomeWallet70, 0),
      totalRepurchase20: workingPreview.reduce((s, d) => s + d.repurchaseWallet20, 0),
    }

    return response.json({
      month: monthStr,
      incomeWalletPayout: {
        summary: incomeSummary,
        preview: incomePreview.slice(0, 20), // limit output
      },
      workingWalletPayout: {
        summary: workingSummary,
        preview: workingPreview.slice(0, 20),
      },
      note: 'This is a dry run. No wallets were credited.',
    })
  }

  /**
   * POST /admin/debug/recalculate-snapshot
   * Body: { userIds: [588695, 135320, 204393], month: "2026-08" }
   * Recalculates monthly_income_snapshots for the given users and month.
   */
  async recalculateSnapshots({ request, response }: HttpContext) {
    const { userIds, month: monthParam } = request.only(['userIds', 'month'])
    if (!userIds || !Array.isArray(userIds) || !monthParam) {
      return response.badRequest({ error: 'userIds (array) and month (yyyy-MM) required' })
    }

    const month = DateTime.fromISO(monthParam + '-01').startOf('month')
    const results: any[] = []

    for (const uid of userIds) {
      const user = await User.find(uid)
      if (!user) {
        results.push({ userId: uid, error: 'User not found' })
        continue
      }

      // Calculate the 6 working income components using the new monthly logic
      const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, month)

      // Wallet split: 70% income, 20% repurchase, 10% admin
      const incomeWalletAmount = Math.round(grossAmount * 0.7 * 100) / 100
      const repurchaseWalletAmount = Math.round(grossAmount * 0.2 * 100) / 100

      // Upsert snapshot
      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', uid)
        .where('month', month.toFormat('yyyy-MM'))
        .first()

      if (existing) {
        existing.grossAmount = grossAmount
        existing.incomeWalletAmount = incomeWalletAmount
        existing.repurchaseWalletAmount = repurchaseWalletAmount
        await existing.save()
        results.push({ userId: uid, name: user.name, grossAmount, incomeWalletAmount, repurchaseWalletAmount, action: 'updated' })
      } else {
        await MonthlyIncomeSnapshot.create({
          userId: uid,
          month: month,
          grossAmount,
          incomeWalletAmount,
          repurchaseWalletAmount,
        })
        results.push({ userId: uid, name: user.name, grossAmount, incomeWalletAmount, repurchaseWalletAmount, action: 'created' })
      }
    }

    return response.json({ month: monthParam, results })
  }
}

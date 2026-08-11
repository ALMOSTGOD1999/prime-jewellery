import { DateTime } from 'luxon'

import User from '#models/user'
import Purchase from '#models/purchase'
import Investment from '#models/investment'
import InvestmentPackage from '#models/investment_package'
import PlatformConfig from '#models/platform_config'
import CalculateAchievement from '#jobs/calculate_achievement'
import { TransactionTypeEnum } from '#enums/transaction'

export default class GoldService {
  /**
   * Gold purchases and investments are the same thing — every approved
   * purchase is a self-investment. This creates the linked investment record
   * (idempotent) so monthly returns and the cashback-wallet payout pick it up
   * automatically, prorated from the purchase date.
   */
  static async ensureInvestmentForPurchase(purchase: Purchase): Promise<Investment | null> {
    if (!purchase.approvedAt) return null

    const existing = await Investment.query().where('purchase_id', purchase.id).first()
    if (existing) return existing

    const pkg = await InvestmentPackage.findPackageForAmount(Number(purchase.amount))
    const rate = pkg?.monthlyReturnPercent ?? 3

    const investment = await Investment.create({
      userId: purchase.userId,
      amount: purchase.amount,
      monthlyReturnRate: rate,
      status: 'active',
      startedAt: purchase.approvedAt ?? purchase.createdAt,
      remark: 'Auto-created from gold purchase',
      purchaseId: purchase.id,
    })

    // A purchase is a self-investment, so it counts towards total invested.
    const user = await User.find(purchase.userId)
    if (user) {
      user.totalInvested = Number(user.totalInvested ?? 0) + Number(purchase.amount)
      await user.save()
    }

    return investment
  }

  /** Close the investment linked to a purchase that was rejected/stopped/cancelled. */
  static async closeInvestmentForPurchase(purchase: Purchase, reason: string) {
    const investment = await Investment.query().where('purchase_id', purchase.id).first()
    if (investment && investment.status === 'active') {
      investment.status = 'closed'
      investment.closedAt = DateTime.now()
      investment.remark = `${reason} — investment closed (purchase ${purchase.id})`
      await investment.save()
    }
  }

  static async getPurchaseData(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      status?: string
    }
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all',
    } = filters

    const query = user.related('purchases').query()
    const dbSortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query.orderBy(dbSortColumn, sortOrder)

    if (status === 'pending') {
      query.whereNull('approvedAt').whereNull('rejectedAt')
    } else if (status === 'approved') {
      query.whereNotNull('approvedAt')
    } else if (status === 'rejected') {
      query.whereNotNull('rejectedAt')
    }

    const purchases = await query.paginate(page, limit)

    // Get counts
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      user
        .related('purchases')
        .query()
        .whereNull('approvedAt')
        .whereNull('rejectedAt')
        .count('* as total')
        .first(),
      user.related('purchases').query().whereNotNull('approvedAt').count('* as total').first(),
      user.related('purchases').query().whereNotNull('rejectedAt').count('* as total').first(),
    ])

    return {
      purchases,
      counts: {
        total:
          Number(pendingCount?.$extras.total || 0) +
          Number(approvedCount?.$extras.total || 0) +
          Number(rejectedCount?.$extras.total || 0),
        pending: Number(pendingCount?.$extras.total || 0),
        approved: Number(approvedCount?.$extras.total || 0),
        rejected: Number(rejectedCount?.$extras.total || 0),
      },
    }
  }

<<<<<<< HEAD
  static async purchaseGold(
    user: User,
    data: {
      amount: number
      goldWeight?: number
      goldCarat?: string
      goldRate?: number
      goldPrice?: number
      makingCharges?: number
      gstAmount?: number
      additionalCharges?: number
      hallmarkAdditional?: number
      totalItems?: number
      remark?: string
    }
  ) {
    const walletBalance = Number(user.walletBalance ?? 0)

    if (walletBalance < data.amount) {
      throw new Error('Insufficient wallet balance')
    }

    if (data.amount < 10000) {
      throw new Error('Minimum purchase amount is ₹10,000')
    }

    // Deduct amount from wallet balance
    await WalletService.debitWallet(user.id, data.amount, 'Gold purchase')

    // Create purchase record with auto-approval
    const purchase = await user.related('purchases').create({
      amount: data.amount,
      approvedAt: DateTime.now(),
      goldWeight: data.goldWeight ?? null,
      goldCarat: data.goldCarat ?? null,
      goldRate: data.goldRate ?? null,
      goldPrice: data.goldPrice ?? null,
      makingCharges: data.makingCharges ?? null,
      gstAmount: data.gstAmount ?? null,
      hallmarkCharges: data.hallmarkAdditional ?? null,
      additionalCharges: data.additionalCharges ?? null,
      totalItems: data.totalItems ?? null,
      remark: data.remark ?? null,
    })

    // Every approved purchase is an investment — register it for monthly returns.
    await this.ensureInvestmentForPurchase(purchase)

    return purchase
  }

=======
>>>>>>> 6762461a558949d70f9cb400d66b6cb40d61f877
  /**
   * Admin makes a gold purchase on behalf of a user.
   * Bypasses wallet balance check and records the transaction for audit.
   */
  static async adminPurchaseGold(
    user: User,
    data: {
      amount: number
      goldWeight?: number
      goldCarat?: string
      goldRate?: number
      goldPrice?: number
      makingCharges?: number
      gstAmount?: number
      additionalCharges?: number
      hallmarkAdditional?: number
      totalItems?: number
      remark?: string
    },
    adminId: number
  ) {
    if (data.amount < 10000) {
      throw new Error('Minimum purchase amount is ₹10,000')
    }

    // Create purchase record with auto-approval (no wallet deduction)
    const purchase = await user.related('purchases').create({
      amount: data.amount,
      approvedAt: DateTime.now(),
      goldWeight: data.goldWeight ?? null,
      goldCarat: data.goldCarat ?? null,
      goldRate: data.goldRate ?? null,
      goldPrice: data.goldPrice ?? null,
      makingCharges: data.makingCharges ?? null,
      gstAmount: data.gstAmount ?? null,
      hallmarkCharges: data.hallmarkAdditional ?? null,
      additionalCharges: data.additionalCharges ?? null,
      totalItems: data.totalItems ?? null,
      remark: data.remark ?? `Admin purchase by #${adminId}`,
    })

    // Record audit transaction for history
    await user.related('transactions').create({
      utr: `ADMIN-GOLD-${DateTime.now().toFormat('yyyyMMddHHmmss')}-${user.id}`,
      amount: data.amount,
      type: TransactionTypeEnum.INVESTMENT,
      approvedAt: DateTime.now(),
      remark: `Purchase made by admin #${adminId} of ₹${data.amount.toLocaleString('en-IN')}`,
    })

    // Every approved purchase is an investment — register it for monthly returns.
    await this.ensureInvestmentForPurchase(purchase)

    return purchase
  }

  static async getAdminPurchases(filters: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
    status?: string
  }) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      status = 'all',
    } = filters

    const query = Purchase.query().preload('user')

    // Search by user details
    if (search) {
      query.whereHas('user', (userQuery) => {
        userQuery
          .where('name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`)
      })
    }

    // Filter by status
    if (status === 'pending') {
      query.whereNull('approvedAt').whereNull('rejectedAt').whereNull('cancelledAt')
    } else if (status === 'approved') {
      query.whereNotNull('approvedAt').whereNull('stoppedAt').whereNull('cancelledAt')
    } else if (status === 'rejected') {
      query.whereNotNull('rejectedAt')
    } else if (status === 'stopped') {
      query.whereNotNull('stoppedAt')
    } else if (status === 'cancelled') {
      query.whereNotNull('cancelledAt')
    }

    // Sorting
    const dbSortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query.orderBy(dbSortColumn, sortOrder === 'asc' ? 'asc' : 'desc')

    return query.paginate(page, limit)
  }

  static async processPurchase(
    purchaseId: number,
    status: 'approved' | 'rejected' | 'stopped' | 'cancelled',
    remark?: string
  ) {
    const purchase = await Purchase.findOrFail(purchaseId)

    if (purchase.rejectedAt || purchase.cancelledAt) {
      throw new Error('Purchase is already rejected or cancelled')
    }

    if (status === 'approved') {
      if (purchase.approvedAt) throw new Error('Purchase already approved')
      purchase.approvedAt = DateTime.now()

      // Dispatch job to calculate achievements for user and ancestors
      await CalculateAchievement.enqueue(purchase.userId)
    } else if (status === 'rejected') {
      if (purchase.approvedAt) throw new Error('Cannot reject an approved purchase')
      purchase.rejectedAt = DateTime.now()
    } else if (status === 'stopped') {
      if (!purchase.approvedAt) throw new Error('Cannot stop a pending purchase')
      purchase.stoppedAt = DateTime.now()
    } else if (status === 'cancelled') {
      purchase.cancelledAt = DateTime.now()
    }

    if (remark) {
      purchase.remark = remark
    }

    await purchase.save()

    // Every approved purchase is an investment: approve → create the linked
    // investment; reject/stop/cancel → close it so it stops earning returns.
    if (status === 'approved') {
      await this.ensureInvestmentForPurchase(purchase)
    } else {
      await this.closeInvestmentForPurchase(purchase, `Purchase ${status}`)
    }
  }

  static async updatePurchaseDetails(
    id: number,
    data: {
      amount?: number
      buyerName?: string
      quantity?: number
      createdAt?: string
      approvedAt?: string | null
      rejectedAt?: string | null
      stoppedAt?: string | null
      cancelledAt?: string | null
    }
  ) {
    const purchase = await Purchase.findOrFail(id)

    if (data.amount) purchase.amount = data.amount
    if (data.buyerName !== undefined) purchase.buyerName = data.buyerName
    if (data.quantity !== undefined) purchase.quantity = data.quantity
    if (data.createdAt) purchase.createdAt = DateTime.fromISO(data.createdAt)

    // Apply updates first
    if (data.approvedAt !== undefined)
      purchase.approvedAt = data.approvedAt ? DateTime.fromISO(data.approvedAt) : null
    if (data.rejectedAt !== undefined)
      purchase.rejectedAt = data.rejectedAt ? DateTime.fromISO(data.rejectedAt) : null
    if (data.stoppedAt !== undefined)
      purchase.stoppedAt = data.stoppedAt ? DateTime.fromISO(data.stoppedAt) : null
    if (data.cancelledAt !== undefined)
      purchase.cancelledAt = data.cancelledAt ? DateTime.fromISO(data.cancelledAt) : null

    // --- Business Logic & State Enforcement ---

    // 1. Mutual Exclusion: Approval vs Rejection
    // If we just set rejectedAt (and it's not null), clear approval and stop
    if (data.rejectedAt && purchase.rejectedAt) {
      purchase.approvedAt = null
      purchase.stoppedAt = null
    }
    // If we just set approvedAt (and it's not null), clear rejection
    if (data.approvedAt && purchase.approvedAt) {
      purchase.rejectedAt = null
    }

    // 2. Validate "Stopped" State
    if (purchase.stoppedAt) {
      if (purchase.rejectedAt) {
        throw new Error('Cannot set "Stopped At" on a rejected purchase')
      }
      if (!purchase.approvedAt) {
        throw new Error('Cannot set "Stopped At" on a pending purchase (must be approved first)')
      }
      if (purchase.stoppedAt < purchase.approvedAt) {
        throw new Error('"Stopped At" date cannot be before "Approved At" date')
      }
    }

    // 3. Validate "Cancelled" State
    if (purchase.cancelledAt) {
      // Logic: Cancelled date must be >= the latest status date
      let referenceDate: DateTime | null = null

      if (purchase.stoppedAt) {
        referenceDate = purchase.stoppedAt
      } else if (purchase.approvedAt) {
        referenceDate = purchase.approvedAt
      } else if (purchase.rejectedAt) {
        referenceDate = purchase.rejectedAt
      }

      if (referenceDate && purchase.cancelledAt < referenceDate) {
        throw new Error('"Cancelled At" date cannot be before the previous status date')
      }
    }

    // 4. Validate Approval vs Rejection (Final Sanity Check)
    if (purchase.approvedAt && purchase.rejectedAt) {
      // This should be handled by mutual exclusion above, but good as a safeguard
      throw new Error('Purchase cannot be both Approved and Rejected')
    }

    await purchase.save()

    // Keep the linked investment (purchase == investment) in sync with edits.
    await this.syncInvestmentForPurchase(purchase)
  }

  /**
   * Align the linked investment with the purchase record after an edit:
   * approved purchases get an active investment matching the new amount/date,
   * anything else gets its investment closed.
   */
  static async syncInvestmentForPurchase(purchase: Purchase) {
    const approved =
      Boolean(purchase.approvedAt) &&
      !purchase.rejectedAt &&
      !purchase.stoppedAt &&
      !purchase.cancelledAt

    const investment = await Investment.query().where('purchase_id', purchase.id).first()

    if (!approved) {
      await this.closeInvestmentForPurchase(purchase, 'Purchase no longer approved')
      return
    }

    if (!investment) {
      await this.ensureInvestmentForPurchase(purchase)
      return
    }

    const pkg = await InvestmentPackage.findPackageForAmount(Number(purchase.amount))
    const oldAmount = Number(investment.amount)

    investment.amount = purchase.amount
    investment.monthlyReturnRate = pkg?.monthlyReturnPercent ?? investment.monthlyReturnRate
    investment.startedAt = purchase.approvedAt ?? purchase.createdAt
    if (investment.status === 'closed') {
      investment.status = 'active'
      investment.closedAt = null
    }
    await investment.save()

    // Keep total invested in step with the amount change.
    const delta = Number(purchase.amount) - oldAmount
    if (delta !== 0) {
      const user = await User.find(purchase.userId)
      if (user) {
        user.totalInvested = Math.max(0, Number(user.totalInvested ?? 0) + delta)
        await user.save()
      }
    }
  }

  static async getUserPurchases(
    userId: number,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      status?: string
    }
  ) {
    const user = await User.findOrFail(userId)
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all',
    } = filters

    const query = user.related('purchases').query()

    // Filter by status
    if (status === 'pending') {
      query.whereNull('approvedAt').whereNull('rejectedAt').whereNull('cancelledAt')
    } else if (status === 'approved') {
      query.whereNotNull('approvedAt').whereNull('stoppedAt').whereNull('cancelledAt')
    } else if (status === 'rejected') {
      query.whereNotNull('rejectedAt')
    } else if (status === 'stopped') {
      query.whereNotNull('stoppedAt')
    } else if (status === 'cancelled') {
      query.whereNotNull('cancelledAt')
    }

    // Sorting
    const dbSortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query.orderBy(dbSortColumn, sortOrder)

    const purchases = await query.paginate(page, limit)
    return { user, purchases }
  }

  static async getLiveGoldPrice() {
    // Admin-declared Gold Billing config (set at /admin/config/gold-billing)
    const billingRate = await PlatformConfig.get('gold_rate_22ct')
    if (billingRate && billingRate.trim() !== '') {
      return billingRate.trim()
    }

    return ''
  }
}

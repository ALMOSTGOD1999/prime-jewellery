import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import WalletService from '#services/wallet_service'
import UserService from '#services/user_service'
import PayoutService from '#services/payout_service'
import db from '@adonisjs/lucid/services/db'

const addBalanceValidator = vine.compile(
  vine.object({
    userId: vine.number().min(1),
    amount: vine.number().min(1),
    remark: vine.string().optional(),
  })
)

export default class WalletController {
  /**
   * Render unified wallet page.
   * - Admin: shows all users with wallet balances + total balance + admin actions
   * - Regular user: shows own wallet balance + transaction history + user actions
   */
  public async page({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt']
    const { sortBy = 'createdAt', sortOrder = 'desc' } = await filterValidator(
      allowedSortColumns
    ).validate(request.qs())

    if (user.role === 'admin') {
      // Admin view: all users with wallet balances
      const adminAllowedSortColumns = ['id', 'name', 'email', 'wallet_balance', 'createdAt']
      const filters = await filterValidator(adminAllowedSortColumns).validate(request.qs())
      const { users, totalWalletBalance } = await WalletService.getAdminWallets({
        page,
        limit,
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: (filters.sortOrder as 'asc' | 'desc') || 'desc',
        search: filters.search || '',
      })

      return inertia.render('wallet/index', {
        isAdmin: true,
        wallets: users,
        totalWalletBalance,
        user: {
          id: user.id,
          name: user.name,
          walletBalance: Number(user.walletBalance ?? 0),
          incomeWallet: Number(user.incomeWallet ?? 0),
          repurchaseWallet: Number(user.repurchaseWallet ?? 0),
        },
      })
    }

    // Regular user view: own wallet balance + transaction history
    const { user: userData, transactions } = await WalletService.getWalletHistory(user.id, {
      page,
      limit,
      sortBy,
      sortOrder,
    })

    // Cashback Wallet = ONLY 70% portion from INVESTMENT RETURN
    const investmentReturnRes = await db.rawQuery(
      `SELECT coalesce(sum(
         CASE
           WHEN type = 'wallet_credit' THEN amount
           WHEN type = 'wallet_debit' THEN -amount
           ELSE 0
         END
       ), 0)::float as total
       FROM transactions WHERE user_id = ? AND remark ILIKE '%investment return%' AND (remark ILIKE '%cashback wallet%' OR remark ILIKE '%income wallet%')`,
      [user.id]
    )

    // Working Wallet = ONLY 70% portion from WORKING INCOME
    const workingRes = await db.rawQuery(
      `SELECT coalesce(sum(
         CASE
           WHEN type = 'wallet_credit' THEN amount
           WHEN type = 'wallet_debit' THEN -amount
           ELSE 0
         END
       ), 0)::float as total
       FROM transactions WHERE user_id = ? AND remark ILIKE '%working income%' AND (remark ILIKE '%cashback wallet%' OR remark ILIKE '%income wallet%' OR remark ILIKE '%working wallet%')`,
      [user.id]
    )

    const isPayoutReleased = await PayoutService.isPayoutReleased()
    const visibleCutoffEnd = await PayoutService.getVisibleCutoffEndOfMonth()

    let visibleTransactions = transactions
    if (!isPayoutReleased && visibleCutoffEnd) {
      // Hide transactions after the visible cutoff
      visibleTransactions = {
        meta: transactions.meta,
        data: transactions.data.filter((t: any) => {
          const txDate = new Date(t.createdAt)
          return txDate <= visibleCutoffEnd.toJSDate()
        }),
      }
    } else if (!isPayoutReleased) {
      visibleTransactions = {
        meta: transactions.meta,
        data: [],
      }
    }

    // Repurchase = all repurchase transactions (20% from both investment + working)
    const repurchaseRes = await db.rawQuery(
      `SELECT coalesce(sum(
         CASE
           WHEN type = 'wallet_credit' THEN amount
           WHEN type = 'wallet_debit' THEN -amount
           ELSE 0
         END
       ), 0)::float as total
       FROM transactions WHERE user_id = ? AND remark ILIKE '%repurchase wallet%'`,
      [user.id]
    )

    return inertia.render('wallet/index', {
      isAdmin: false,
      user: {
        ...userData,
        incomeWallet: Number(investmentReturnRes.rows[0]?.total ?? 0),
        repurchaseWallet: Number(repurchaseRes.rows[0]?.total ?? 0),
        workingWallet: Number(workingRes.rows[0]?.total ?? 0),
      },
      transactions: visibleTransactions,
      activationAmount: 1000,
      isActivated: !!user.activatedAt,
      isPayoutReleased,
    })
  }

  /**
   * Render the wallet send money page.
   */
  public async sendPage({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    return inertia.render('wallet/send', {
      walletBalance: Number(user.walletBalance ?? 0),
    })
  }

  /**
   * Transfer funds from authenticated user's wallet to another user's wallet.
   */
  public async transfer({ request, auth, response }: HttpContext) {
    const user = auth.user!
    const { receiverId, amount, remark } = request.only(['receiverId', 'amount', 'remark'])

    if (!receiverId || !amount) {
      return response.badRequest({
        error: 'Receiver ID and amount are required',
      })
    }

    // Handle formatted IDs (PJR/PJL prefix) by stripping the prefix
    const cleanReceiverId =
      typeof receiverId === 'string' ? receiverId.replace(/^[a-zA-Z]+/i, '') : String(receiverId)
    const parsedReceiverId = Number(cleanReceiverId)

    if (!parsedReceiverId) {
      return response.badRequest({
        error: 'Invalid receiver ID',
      })
    }

    try {
      const result = await WalletService.transferWallet(
        user.id,
        parsedReceiverId,
        Number(amount),
        remark
      )

      return response.ok({
        message: 'Transfer successful',
        data: result,
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }

  /**
   * Search for users by ID, name, email, or phone for wallet transfers.
   * Supports PJR/PJL prefixed IDs by stripping the prefix before searching.
   */
  public async search({ request, auth, response }: HttpContext) {
    const user = auth.user!
    const { q } = request.qs()

    if (!q) {
      return response.badRequest({
        error: 'Search query is required',
      })
    }

    try {
      const users = await WalletService.searchUsersForTransfer(q, user.id)
      return response.ok({
        message: 'Search completed successfully',
        data: users,
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }

  /**
   * Admin: Add wallet balance to any user.
   */
  public async addBalance({ request, response, auth }: HttpContext) {
    const { userId, amount, remark } = await request.validateUsing(addBalanceValidator)
    const admin = auth.getUserOrFail()

    try {
      await WalletService.creditWallet(userId, amount, admin.id, remark)
      return response.ok({
        message: `₹${amount.toLocaleString('en-IN')} credited to user #${userId}'s wallet`,
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }

  /**
   * Admin: View wallet transaction history for a specific user.
   */
  public async userHistory({ inertia, params, request }: HttpContext) {
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt']
    const { sortBy = 'createdAt', sortOrder = 'desc' } = await filterValidator(
      allowedSortColumns
    ).validate(request.qs())

    const { user, transactions } = await WalletService.getWalletHistory(params.userId, {
      page,
      limit,
      sortBy,
      sortOrder,
    })

    return inertia.render('wallet/history', {
      targetUser: user,
      transactions,
    })
  }

  /**
   * Self-activate account using wallet balance.
   * User can choose between ₹500 or ₹1000 activation.
   */
  public async activateAccount({ request, auth, response }: HttpContext) {
    const user = auth.user!

    // Admin never needs activation
    if (user.role === 'admin') {
      return response.badRequest({
        error: 'Admin accounts do not require activation.',
      })
    }

    const { amount } = request.only(['amount'])

    try {
      await UserService.selfActivateUser(user.id, amount ? Number(amount) : undefined)
      return response.ok({
        message: 'Account activated successfully',
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import WalletService from '#services/wallet_service'

const addBalanceValidator = vine.compile(
  vine.object({
    userId: vine.number().min(1),
    amount: vine.number().min(1),
    remark: vine.string().optional(),
  })
)

const addOwnBalanceValidator = vine.compile(
  vine.object({
    amount: vine.number().min(1),
    remark: vine.string().optional(),
  })
)

export default class AdminWalletController {
  /**
   * List all non-admin users with their wallet balances.
   */
  async index({ inertia, request }: HttpContext) {
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'name', 'email', 'wallet_balance', 'createdAt']
    const { search = '', sortBy = 'createdAt', sortOrder = 'desc' } =
      await filterValidator(allowedSortColumns).validate(request.qs())

    const { users, totalWalletBalance } = await WalletService.getAdminWallets({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
    })

    return inertia.render('admin/wallet/index', {
      wallets: users,
      totalWalletBalance,
    })
  }

  /**
   * Add wallet balance to any user (including self/others).
   */
  async addBalance({ request, response, session, auth }: HttpContext) {
    const { userId, amount, remark } = await request.validateUsing(addBalanceValidator)
    const admin = auth.getUserOrFail()

    try {
      await WalletService.creditWallet(userId, amount, admin.id, remark)

      const targetUser = (await import('#models/user')).default
      const user = await targetUser.findOrFail(userId)
      session.flash('success', `₹${amount.toLocaleString('en-IN')} credited to ${user.name}'s wallet`)
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }

  /**
   * Admin adds balance to their own wallet.
   */
  async addOwnBalance({ request, response, session, auth }: HttpContext) {
    const { amount, remark } = await request.validateUsing(addOwnBalanceValidator)
    const admin = auth.getUserOrFail()

    try {
      await WalletService.creditWallet(admin.id, amount, admin.id, remark)
      session.flash('success', `₹${amount.toLocaleString('en-IN')} credited to your wallet`)
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }

  /**
   * View wallet transaction history for a specific user.
   */
  async history({ inertia, params, request }: HttpContext) {
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt']
    const { sortBy = 'createdAt', sortOrder = 'desc' } =
      await filterValidator(allowedSortColumns).validate(request.qs())

    const { user, transactions } = await WalletService.getWalletHistory(params.userId, {
      page,
      limit,
      sortBy,
      sortOrder,
    })

    return inertia.render('admin/wallet/history', {
      targetUser: user,
      transactions,
    })
  }
}

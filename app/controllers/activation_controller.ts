import type { HttpContext } from '@adonisjs/core/http'
import UserService from '#services/user_service'

export default class ActivationController {
  /**
   * Self-activate user account using wallet balance
   */
  public async activate({ auth, response }: HttpContext) {
    const user = auth.user!

    try {
      await UserService.selfActivateUser(user.id)
      return response.ok({
        message: 'Account activated successfully',
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }

  /**
   * Admin activates a user with a chosen amount (₹500 or ₹1000).
   * The amount is deducted from the user's wallet balance.
   */
  public async activateUser({ request, response }: HttpContext) {
    const { userId, amount } = request.only(['userId', 'amount'])

    if (!userId) {
      return response.badRequest({ error: 'User ID is required' })
    }

    try {
      await UserService.selfActivateUser(Number(userId), amount ? Number(amount) : undefined)
      return response.ok({
        message: 'User activated successfully',
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }
}

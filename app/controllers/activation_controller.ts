import type { HttpContext } from '@adonisjs/core/http'
import UserService from '#services/user_service'

export default class ActivationController {
  /**
   * Admin activates a user — no wallet deduction, admin controls the system.
   * Accepts an optional amount for record-keeping only.
   */
  public async activateUser({ request, response, auth }: HttpContext) {
    const admin = auth.getUserOrFail()
    const { userId, amount } = request.only(['userId', 'amount'])

    if (!userId) {
      return response.badRequest({ error: 'User ID is required' })
    }

    try {
      await UserService.activateUser(Number(userId), admin.id, amount ? Number(amount) : undefined)
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

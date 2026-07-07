import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserService from '#services/user_service'

export default class AdminSettingsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/settings')
  }

  async updatePassword({ request, auth, response, session }: HttpContext) {
    const admin = auth.getUserOrFail()
    const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword'])

    if (!currentPassword || !newPassword) {
      session.flash('error', 'Current password and new password are required')
      return response.redirect().back()
    }

    if (newPassword.length < 6) {
      session.flash('error', 'New password must be at least 6 characters')
      return response.redirect().back()
    }

    try {
      // Verify current password
      await User.verifyCredentials(admin.id.toString(), currentPassword)

      // Update password
      await UserService.updatePassword(admin, newPassword)

      session.flash('success', 'Password updated successfully')
    } catch (error) {
      session.flash('error', 'Current password is incorrect')
    }

    return response.redirect().back()
  }
}

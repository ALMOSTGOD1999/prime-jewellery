import type { HttpContext } from '@adonisjs/core/http'

import { changePasswordValidator, updateProfileValidator } from '#validators/profile_validator'
import { updateBankValidator } from '#validators/bank_validator'
import { updateKycValidator } from '#validators/kyc_validator'
import User from '#models/user'
import UserService from '#services/user_service'
import BankService from '#services/bank_service'
import KycService from '#services/kyc_service'

export default class ProfilesController {
  async activatePage({ auth, inertia, response }: HttpContext) {
    const user = auth.getUserOrFail()
    // Admin never needs activation
    if (user.role === 'admin') {
      return response.redirect('/dashboard')
    }
    return inertia.render('settings/activate', {
      isActivated: !!user.activatedAt,
      walletBalance: Number(user.walletBalance ?? 0),
    })
  }

  async activate({ request, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
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

  async profile({ inertia }: HttpContext) {
    return inertia.render('settings/profile')
  }

  async updateProfile({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)

    await UserService.updateProfile(user, data)

    session.flash('success', 'Profiles updated successfully.')
    return response.redirect().back()
  }

  async updatePassword({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    try {
      await User.verifyCredentials(user.id.toString(), currentPassword)
      await UserService.updatePassword(user, password)
      session.flash('success', 'Password updated successfully')
    } catch (error) {
      session.flash('errors.currentPassword', 'Invalid current password')
    }

    return response.redirect().back()
  }

  async bankPage({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const bank = await user.related('bank').query().first()

    return inertia.render('settings/bank', { bank: bank?.serialize() })
  }

  async updateBank({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const bank = await user.related('bank').query().first()

    if (bank?.approvedAt) {
      session.flash('errors.global', 'Bank details are approved and cannot be changed.')
      return response.redirect().back()
    }

    const data = await request.validateUsing(updateBankValidator)

    await BankService.updateBankDetails(user, data)

    session.flash('success', 'Bank details updated successfully')
    return response.redirect().back()
  }

  async kycPage({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const kyc = await user.related('kyc').query().first()
    return inertia.render('settings/kyc', { kyc: kyc?.serialize() })
  }

  async updateKyc({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const kyc = await user.related('kyc').query().first()

    if (kyc?.approvedAt) {
      session.flash('errors.global', 'KYC details are approved and cannot be changed.')
      return response.redirect().back()
    }

    const data = await request.validateUsing(updateKycValidator)

    await KycService.updateKycDetails(user, data)

    session.flash('success', 'KYC details updated successfully')
    return response.redirect().back()
  }
}

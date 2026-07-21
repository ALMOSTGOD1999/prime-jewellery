import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { updateBankValidator } from '#validators/bank_validator'
import { updateKycValidator } from '#validators/kyc_validator'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import { adminUpdateProfileValidator } from '#validators/profile_validator'
import { adminCreateUserValidator } from '#validators/admin_validator'
import UserService from '#services/user_service'
import BankService from '#services/bank_service'
import KycService from '#services/kyc_service'
import GoldService from '#services/gold_service'
import WelcomeMessageService from '#services/welcome_message_service'

export default class AdminUsersController {
  async index({ inertia, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = [
      'id',
      'name',
      'email',
      'phone',
      'createdAt',
      'activatedAt',
      'parent',
    ]
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const { users, counts } = await UserService.getAdminUsers({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
    })

    return inertia.render('admin/users/index', {
      members: {
        meta: users.getMeta(),
        data: users.serialize().data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          avatar: u.avatar,
          role: u.role,
          status: u.status ?? 'active',
          activatedAt: u.activatedAt,
          createdAt: u.createdAt,
          parent: u.parent
            ? {
                id: u.parent.id,
                name: u.parent.name,
              }
            : null,
        })),
        counts,
      },
    })
  }

  async lookupUsers({ request, response }: HttpContext) {
    const search = (request.qs().search as string) || ''
    const query = User.query()
      .whereNot('role', 'admin')
      .select('id', 'name', 'email', 'phone', 'status', 'activatedAt')
      .limit(50)
    if (search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhere('id', Number.isInteger(Number(search)) ? Number(search) : -1)
      })
    }
    const users = await query
    return response.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        activatedAt: u.activatedAt,
      })),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(adminCreateUserValidator)

    let parentId: number | null = null
    if (data.parentId) {
      // Strip PJ prefix
      const cleanId = String(data.parentId).replace(/^[a-zA-Z]+/i, '')
      parentId = Number(cleanId)
      const parent = await User.find(parentId)
      if (!parent) {
        session.flash('errors.parentId', 'Parent user not found')
        return response.redirect().back()
      }
    }

    // Create user (NOT auto-activated — admin must activate separately)
    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      parentId,
      role: (data.role as any) || 'user',
      status: 'active',
    })

    // Send welcome email (fire-and-forget)
    WelcomeMessageService.sendWelcomeEmail(user.name, user.id, data.password, user.email)

    session.flash('success', 'User created successfully. Activate from the Activation page.')
    return response.redirect().back()
  }

  async show({ inertia, params }: HttpContext) {
    const user = await UserService.getUserDetails(params.id)

    return inertia.render('admin/users/show', {
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        avatar: user.avatar?.url,
        activatedAt: user.activatedAt,

        parent: user.parent,
        createdAt: user.createdAt,
        activatedByAdmin: !!user.activatedAt && user.transactions.length === 0,

        profile: {
          address: user.address,
          city: user.city,
          state: user.state,
          zip: user.zipcode,
        },
        childrenCount: Number(user.$extras.children_count),
        bank: user.bank ? user.bank.serialize() : null,
        kyc: user.kyc ? user.kyc.serialize() : null,
        activation: user.transactions[0]
          ? {
              id: user.transactions[0].id,
              amount: user.transactions[0].amount,
              proof: user.transactions[0].proof?.url,
              utr: user.transactions[0].utr,
              approvedAt: user.transactions[0].approvedAt,
            }
          : null,
      },
    })
  }

  async updateProfile({ params, request, response, session }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const data = await request.validateUsing(adminUpdateProfileValidator)

    await UserService.updateProfile(user, data)

    session.flash('success', 'User profile updated successfully')
    return response.redirect().back()
  }

  async updateBank({ params, request, response, session }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const data = await request.validateUsing(updateBankValidator)

    await BankService.updateBankDetails(user, data, true)

    session.flash('success', 'User bank details updated successfully')
    return response.redirect().back()
  }

  async updateKyc({ params, request, response, session }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const data = await request.validateUsing(updateKycValidator)

    await KycService.updateKycDetails(user, data, true)

    session.flash('success', 'User KYC details updated successfully')
    return response.redirect().back()
  }

  async updatePassword({ params, request, response, session }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const { password } = request.all()

    await UserService.updatePassword(user, password)

    session.flash('success', 'User password updated successfully')
    return response.redirect().back()
  }

  async impersonate({ params, session, response, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await auth.use('web').login(user)
    session.flash('success', `You are now impersonating ${user.name}`)
    return response.redirect().toPath('/dashboard')
  }

  async activate({ params, session, response, auth }: HttpContext) {
    const admin = auth.getUserOrFail()
    try {
      await UserService.activateUser(params.id, admin.id)
      session.flash('success', 'User activated successfully')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  async inactivate({ params, session, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    user.status = 'inactive'
    await user.save()
    session.flash('success', `${user.name} has been inactivated. All income generation stopped.`)
    return response.redirect().back()
  }

  async reactivate({ params, session, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    user.status = 'active'
    await user.save()
    session.flash('success', `${user.name} has been reactivated.`)
    return response.redirect().back()
  }

  async block({ params, session, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    user.status = 'blocked'
    await user.save()
    session.flash('success', `${user.name} has been blocked. They cannot access their account.`)
    return response.redirect().back()
  }

  async unblock({ params, session, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    user.status = 'active'
    await user.save()
    session.flash('success', `${user.name} has been unblocked.`)
    return response.redirect().back()
  }

  async destroy({ params, session, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    const childrenCount = await user.related('children').query().count('* as total').first()
    if (Number(childrenCount?.$extras.total || 0) > 0) {
      session.flash(
        'error',
        `Cannot delete ${user.name} — they have team members. Remove them first.`
      )
      return response.redirect().back()
    }

    const purchaseCount = await user.related('purchases').query().count('* as total').first()
    if (Number(purchaseCount?.$extras.total || 0) > 0) {
      session.flash('error', `Cannot delete ${user.name} — they have purchase history.`)
      return response.redirect().back()
    }

    await user.delete()
    session.flash('success', `User ${user.name} permanently deleted.`)
    return response.redirect().back()
  }

  async tree({ params, inertia }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const rootUser = await UserService.getTreeRoot(user)

    return inertia.render('admin/users/tree', {
      rootUser,
    })
  }

  /**
   * Look up a user by ID and return basic info (for parent ID autocomplete)
   */
  async lookup({ params, response }: HttpContext) {
    const rawId = String(params.id)
    // Strip prefix (e.g. PJ000135 → 000135)
    const cleanId = rawId.replace(/^[a-zA-Z]+/i, '')
    const userId = Number(cleanId)
    if (!userId) {
      return response.badRequest({ message: 'Invalid user ID' })
    }

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    return response.json({
      id: user.id,
      name: user.name,
    })
  }

  /**
   * Admin makes a gold purchase on behalf of a user.
   * The amount is deducted from the user's wallet.
   */
  async makePurchase({ params, request, response, session, auth }: HttpContext) {
    const admin = auth.getUserOrFail()
    const user = await User.findOrFail(params.id)
    const { amount } = request.only(['amount'])

    if (!amount || amount <= 0) {
      session.flash('errors.amount', 'Invalid amount')
      return response.redirect().back()
    }

    try {
      await GoldService.adminPurchaseGold(user, { amount: Number(amount) }, admin.id)
      session.flash(
        'success',
        `Gold purchase of ₹${Number(amount).toLocaleString('en-IN')} completed for ${user.name}`
      )
    } catch (error) {
      session.flash('errors.amount', error.message)
    }

    return response.redirect().back()
  }
}

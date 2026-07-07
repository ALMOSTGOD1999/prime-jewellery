import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator, signupValidator } from '#validators/auth_validator'
import User from '#models/user'
import Session from '#models/session'
import { UserLegEnum, UserRoleEnum } from '#enums/user'
import BinaryTreeService from '#services/binary_tree_service'

export default class AuthController {
  async signupPage({ inertia, request }: HttpContext) {
    const ref = (request.qs().ref as string) || ''
    const leg = (request.qs().leg as string) || ''
    return inertia.render('auth/signup', { ref, leg })
  }

  async loginPage({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async signup(ctx: HttpContext) {
    const { request } = ctx
    let { referralCode, leg, ...rest } = await request.validateUsing(signupValidator)

    let parentId: number | null = null
    let resolvedLeg: UserLegEnum | null = null

    if (referralCode && leg) {
      // Parse referral code - strip prefix (PJL, PJR, etc.)
      const cleanCode = referralCode.replace(/^[a-zA-Z]+/i, '')
      const rootUser = await User.find(cleanCode)

      if (rootUser) {
        // Use DFS spillover to find placement position
        const placementParent = await BinaryTreeService.findPlacement(
          rootUser.id,
          leg as UserLegEnum
        )
        parentId = placementParent.id
        resolvedLeg = leg as UserLegEnum
      }
    }

    const user = await User.create({
      ...rest,
      parentId,
      leg: resolvedLeg,
      role: UserRoleEnum.USER,
    })

    await this.authenticate(ctx, user)

    return ctx.response.redirect().toRoute('dashboard.index')
  }

  async login(ctx: HttpContext) {
    const { request, response, session } = ctx
    let { userId, password } = await request.validateUsing(loginValidator)

    try {
      if (userId.toLowerCase() === 'admin') {
        const adminUser = await User.findBy('role', UserRoleEnum.ADMIN)
        if (adminUser) {
          userId = adminUser.id.toString()
        }
      } else {
        // Parse userId (strip prefix)
        userId = userId.replace(/^[a-zA-Z]+/i, '')
      }

      const user = await User.verifyCredentials(userId.toString(), password)
      await this.authenticate(ctx, user)
      const next = request.qs().next as string
      if (next) {
        return response.redirect(next)
      }
      return response.redirect().toRoute('dashboard.index')
    } catch (error) {
      console.error(error)
      session.flash('errors.auth', 'Invalid credentials')
      return response.redirect().toRoute('auth.login.page')
    }
  }

  private async authenticate({ auth, request, session }: HttpContext, user: User) {
    await auth.use('web').login(user)

    await Session.create({
      userId: user.id,
      ipAddress: request.ip(),
      sessionToken: session.sessionId,
      userAgent: request.header('User-Agent'),
    })

    session.put('session-token', session.sessionId)
  }

  async logout({ auth, response, session }: HttpContext) {
    await auth.use('web').logout()
    await Session.query().where('sessionToken', session.sessionId).delete()
    session.forget('session-token')
    return response.redirect().toRoute('auth.login.page')
  }
}

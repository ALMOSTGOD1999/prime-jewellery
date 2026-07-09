import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { UserRoleEnum } from '#enums/user'

export default class ActiveUserMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.getUserOrFail()
    // Admin never needs activation
    if (user.role === UserRoleEnum.ADMIN) return next()
    if (user.activatedAt) return next()
    return response.redirect('/dashboard')
  }
}

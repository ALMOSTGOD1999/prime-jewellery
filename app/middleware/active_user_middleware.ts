import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ActiveUserMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.getUserOrFail()
    if (user.activatedAt) return next()
    return response.redirect('/dashboard')
  }
}

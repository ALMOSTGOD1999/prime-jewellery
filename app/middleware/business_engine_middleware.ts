import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const BE_PASSWORD = 'Admin@BO33'

export default class BusinessEngineMiddleware {
  async handle({ session, response }: HttpContext, next: NextFn) {
    if (session.get('be_authenticated') === true) {
      return next()
    }

    // Not authenticated — redirect to gate page
    return response.redirect('/admin/system/advanced/business-engine/gate')
  }
}

export { BE_PASSWORD }

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

export default class GatekeepMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const gateConfig = { prime_jewellery: env.get('GATEKEEP', false) }

    if (gateConfig.prime_jewellery && ctx.request.url() !== '/gatekeep') {
      return ctx.response.redirect().toPath('/gatekeep')
    }

    return next()
  }
}

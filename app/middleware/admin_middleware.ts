import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import db from '@adonisjs/lucid/services/db'
import { TransactionTypeEnum } from '#enums/transaction'
import { UserRoleEnum } from '#enums/user'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    const user = await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
    if (user.role !== 'admin' && ctx.request.url() !== '/dashboard')
      return ctx.response.redirect('/dashboard')

    const result = await db.rawQuery(
      `
      SELECT
        (SELECT count(*) FROM users WHERE role = ? AND activated_at IS NOT NULL AND status = 'active') as active_users,
        (SELECT count(*) FROM transactions WHERE type = ? AND approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL) as pending_activations,
        (SELECT count(*) FROM kycs WHERE approved_at IS NULL AND rejected_at IS NULL) as pending_kycs,
        (SELECT count(*) FROM banks WHERE approved_at IS NULL AND rejected_at IS NULL) as pending_banks,
        (SELECT count(*) FROM purchases WHERE approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL) as pending_purchases
      `,
      [UserRoleEnum.USER, TransactionTypeEnum.ACTIVATION]
    )

    const row = result.rows[0]

    ctx.inertia.share({
      sidebarStats: {
        activeUsers: Number(row.active_users),
        activationRequests: Number(row.pending_activations),
        kycRequests: Number(row.pending_kycs),
        bankRequests: Number(row.pending_banks),
        purchaseRequests: Number(row.pending_purchases),
      },
    })
    return next()
  }
}

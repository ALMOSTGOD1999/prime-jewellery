import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Transaction from '#models/transaction'
import Withdrawl from '#models/withdrawl'
import { TransactionTypeEnum } from '#enums/transaction'
import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'
import { adminWalletWithdrawValidator } from '#validators/admin_wallet_withdraw'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class AdminWalletWithdrawController {
  async index({ inertia, request }: HttpContext) {
    const { search = '' } = request.qs()

    let users: any[] = []

    if (search) {
      const query = User.query()
        .whereNot('role', 'admin')
        .select('id', 'name', 'email', 'phone', 'working_wallet', 'status', 'activatedAt')
        .limit(50)

      query.where((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhere('id', Number.isInteger(Number(search)) ? Number(search) : -1)
      })

      const foundUsers = await query
      users = foundUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        workingWallet: Number(u.workingWallet ?? 0),
        status: u.status,
        activatedAt: u.activatedAt,
      }))
    }

    return inertia.render('admin/wallet-withdraw/index', {
      users,
      search,
    })
  }

  async search({ request, response }: HttpContext) {
    const search = (request.qs().search as string) || ''
    const query = User.query()
      .whereNot('role', 'admin')
      .select('id', 'name', 'email', 'phone', 'working_wallet', 'status', 'activatedAt')
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
        workingWallet: Number(u.workingWallet ?? 0),
        status: u.status,
        activatedAt: u.activatedAt,
      })),
    })
  }

  async withdraw({ request, response, session, auth }: HttpContext) {
    const admin = auth.getUserOrFail()
    const payload = await request.validateUsing(adminWalletWithdrawValidator)

    const user = await User.findOrFail(payload.userId)
    const amount = Number(user.workingWallet ?? 0)

    if (amount <= 0) {
      session.flash('errors.global', `${user.name} has no working wallet balance to withdraw.`)
      return response.redirect().back()
    }

    await db.transaction(async (trx) => {
      // Create withdrawal record (auto-approved since admin-initiated)
      await Withdrawl.create(
        {
          userId: user.id,
          amount,
          type: WithdrawlTypeEnum.WORKING_WALLET,
          status: WithdrawlStatusEnum.APPROVED,
          approvedAt: DateTime.now(),
          remark: payload.remark || `Working wallet withdrawn by admin #${admin.id}`,
          netAmount: amount,
        },
        { client: trx }
      )

      // Create wallet debit transaction for audit trail
      await Transaction.create(
        {
          userId: user.id,
          type: TransactionTypeEnum.WALLET_DEBIT,
          amount,
          remark: `Working wallet withdrawal by admin #${admin.id}${payload.remark ? ` — ${payload.remark}` : ''}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )

      // Wipe the working wallet balance
      await user.useTransaction(trx)
      user.workingWallet = 0
      await user.save()
    })

    session.flash(
      'success',
      `₹${amount.toLocaleString('en-IN')} withdrawn from ${user.name}'s working wallet. Balance wiped to ₹0.`
    )
    return response.redirect().back()
  }
}

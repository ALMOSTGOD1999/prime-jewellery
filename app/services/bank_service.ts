import Bank from '#models/bank'
import User from '#models/user'
import { DateTime } from 'luxon'
import { attachmentManager } from '@jrmc/adonis-attachment'
import db from '@adonisjs/lucid/services/db'

export default class BankService {
  static async getAdminBanks(filters: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
    status?: string
  }) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      status = 'all',
    } = filters

    const query = Bank.query().preload('user')

    // Sorting
    const dbSortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query.orderBy(dbSortColumn, sortOrder)

    // Status Filter
    if (status === 'pending') {
      query.whereNull('approvedAt').whereNull('rejectedAt')
    } else if (status === 'approved') {
      query.whereNotNull('approvedAt')
    } else if (status === 'rejected') {
      query.whereNotNull('rejectedAt')
    }

    // Search Filter
    if (search) {
      query.where((subQuery) => {
        subQuery
          .whereHas('user', (userQuery) => {
            userQuery
              .where('name', 'ILIKE', `%${search}%`)
              .orWhere('email', 'ILIKE', `%${search}%`)
              .orWhere('phone', 'ILIKE', `%${search}%`)
          })
          .orWhere('accountNumber', 'ILIKE', `%${search}%`)
          .orWhere('ifsc', 'ILIKE', `%${search}%`)
          .orWhere('holderName', 'ILIKE', `%${search}%`)
      })
    }

    // Counts
    const [banks, bankStats] = await Promise.all([
      query.paginate(page, limit),
      Bank.query()
        .select(
          db.raw('count(*) as total'),
          db.raw(
            'count(case when approved_at is null and rejected_at is null then 1 end) as pending'
          ),
          db.raw('count(case when approved_at is not null then 1 end) as approved'),
          db.raw('count(case when rejected_at is not null then 1 end) as rejected')
        )
        .first(),
    ])

    const stats = bankStats?.$extras || {}

    return {
      banks,
      counts: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        approved: Number(stats.approved) || 0,
        rejected: Number(stats.rejected) || 0,
      },
    }
  }

  static async processBankUpdate(bankId: number, status: 'approved' | 'rejected') {
    const bank = await Bank.findOrFail(bankId)

    if (status === 'approved') {
      bank.approvedAt = DateTime.now()
      bank.rejectedAt = null
    } else if (status === 'rejected') {
      bank.rejectedAt = DateTime.now()
      bank.approvedAt = null
    }
    await bank.save()
  }

  static async updateBankDetails(
    user: User,
    data: {
      name: string
      branch: string
      ifsc: string
      holderName: string
      accountNumber: string
      upi: string
      qr?: any
    },
    autoApprove: boolean = false
  ) {
    const newBank = await user.related('bank').updateOrCreate(
      { id: user.id },
      {
        name: data.name,
        branch: data.branch,
        ifsc: data.ifsc,
        holderName: data.holderName,
        accountNumber: data.accountNumber,
        upi: data.upi,
        rejectedAt: null,
        approvedAt: autoApprove ? DateTime.now() : null,
      }
    )

    if (data.qr) {
      newBank.qr = (await attachmentManager.createFromFile(data.qr)) as any
      await newBank.save()
    }

    return newBank
  }
}

import Kyc from '#models/kyc'
import User from '#models/user'
import { DateTime } from 'luxon'
import { attachmentManager } from '@jrmc/adonis-attachment'
import db from '@adonisjs/lucid/services/db'

export default class KycService {
  static async getAdminKycs(filters: {
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

    const query = Kyc.query().preload('user')

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
          .orWhere('panNumber', 'ILIKE', `%${search}%`)
          .orWhere('aadhaarNumber', 'ILIKE', `%${search}%`)
      })
    }

    // Counts
    const [kycs, kycStats] = await Promise.all([
      query.paginate(page, limit),
      Kyc.query()
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

    const stats = kycStats?.$extras || {}

    return {
      kycs,
      counts: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        approved: Number(stats.approved) || 0,
        rejected: Number(stats.rejected) || 0,
      },
    }
  }

  static async processKycUpdate(kycId: number, status: 'approved' | 'rejected') {
    const kyc = await Kyc.findOrFail(kycId)

    if (status === 'approved') {
      kyc.approvedAt = DateTime.now()
      kyc.rejectedAt = null
    } else if (status === 'rejected') {
      kyc.rejectedAt = DateTime.now()
      kyc.approvedAt = null
    }
    await kyc.save()
  }

  static async updateKycDetails(
    user: User,
    data: {
      panNumber: string
      aadhaarNumber: string
      panProof?: any
      aadhaarProof?: any
    },
    autoApprove: boolean = false
  ) {
    const newKyc = await user.related('kyc').updateOrCreate(
      { id: user.id },
      {
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        rejectedAt: null,
        approvedAt: autoApprove ? DateTime.now() : null,
      }
    )

    if (data.panProof) {
      newKyc.panProof = (await attachmentManager.createFromFile(data.panProof)) as any
    }

    if (data.aadhaarProof) {
      newKyc.aadhaarProof = (await attachmentManager.createFromFile(data.aadhaarProof)) as any
    }

    await newKyc.save()
    return newKyc
  }
}

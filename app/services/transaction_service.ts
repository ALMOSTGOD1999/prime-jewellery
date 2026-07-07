import Transaction from '#models/transaction'
import User from '#models/user'
import { TransactionTypeEnum } from '#enums/transaction'
import { DateTime } from 'luxon'
import { attachmentManager } from '@jrmc/adonis-attachment'
import db from '@adonisjs/lucid/services/db'

export default class TransactionService {
  static async getActivationRequests(filters: {
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

    const offset = (page - 1) * limit

    const baseTxQuery = `
      SELECT 
        t.id, 
        t.amount, 
        t.utr, 
        t.proof, 
        t.approved_at, 
        t.rejected_at, 
        t.created_at, 
        t.user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.avatar as user_avatar,
        'transaction' as source
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = '${TransactionTypeEnum.ACTIVATION}'
    `

    const baseUserQuery = `
      SELECT 
        'manual-' || CAST(u.id AS TEXT) as id, 
        0 as amount, 
        'Activated by Admin' as utr, 
        CAST(null AS json) as proof, 
        u.activated_at as approved_at, 
        null as rejected_at, 
        u.activated_at as created_at, 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.avatar as user_avatar,
        'manual' as source
      FROM users u
      WHERE u.activated_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM transactions t2 
        WHERE t2.user_id = u.id 
        AND t2.type = '${TransactionTypeEnum.ACTIVATION}' 
        AND t2.approved_at IS NOT NULL
      )
    `

    let whereClause = ''
    const params: any[] = []

    if (status === 'pending') {
      whereClause = `WHERE approved_at IS NULL AND rejected_at IS NULL AND source = 'transaction'`
    } else if (status === 'approved') {
      whereClause = `WHERE approved_at IS NOT NULL`
    } else if (status === 'rejected') {
      whereClause = `WHERE rejected_at IS NOT NULL`
    }

    if (search) {
      const searchClause = `(
        user_name ILIKE ? OR 
        user_email ILIKE ? OR 
        user_phone ILIKE ? OR 
        utr ILIKE ?
      )`
      whereClause = whereClause ? `${whereClause} AND ${searchClause}` : `WHERE ${searchClause}`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    const sortColumn = sortBy === 'createdAt' ? 'created_at' : `"${sortBy}"`

    const finalQuery = `
      SELECT * FROM (
        ${baseTxQuery}
        UNION ALL
        ${baseUserQuery}
      ) as combined
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `

    // Add limit/offset params
    const queryParams = [...params, limit, offset]

    const countQuery = `
      SELECT count(*) as total FROM (
        ${baseTxQuery}
        UNION ALL
        ${baseUserQuery}
      ) as combined
      ${whereClause}
    `

    const [rows, countResult] = await Promise.all([
      db.rawQuery(finalQuery, queryParams),
      db.rawQuery(countQuery, params),
    ])

    const total = Number(countResult.rows[0]?.total || 0)

    // Calculate aggregated counts (approximate or separate queries needed for accurate tabs)
    // For simplicity, we'll do separate count queries like before but adapted

    // Note: To get accurate counts for tabs (Pending, Approved, Rejected) irrespective of current search/filter,
    // we should run a separate aggregation query on the whole set.
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN approved_at IS NULL AND rejected_at IS NULL AND source = 'transaction' THEN 1 END) as pending,
        COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as approved,
        COUNT(CASE WHEN rejected_at IS NOT NULL THEN 1 END) as rejected
      FROM (
        ${baseTxQuery}
        UNION ALL
        ${baseUserQuery}
      ) as combined
    `
    const statsResult = await db.rawQuery(statsQuery)
    const stats = statsResult.rows[0]

    // Fetch actual Transaction models for the transaction rows to ensure Attachments are handled correctly
    const transactionRows = rows.rows.filter((r: any) => r.source === 'transaction')
    const transactionIds = transactionRows.map((r: any) => r.id)

    let txMap = new Map<string, Transaction>()
    if (transactionIds.length > 0) {
      const loadedTxs = await Transaction.query().whereIn('id', transactionIds).preload('user')

      loadedTxs.forEach((t) => txMap.set(t.id, t))
    }

    // Map rows to expected model-like structure
    const transactions = {
      serialize: () => ({
        data: rows.rows.map((row: any) => {
          if (row.source === 'transaction') {
            const t = txMap.get(row.id)
            if (t) {
              const serialized = t.serialize()
              return {
                ...serialized,
                source: 'transaction',
              }
            }
          }

          const proof = row.proof
            ? typeof row.proof === 'string'
              ? JSON.parse(row.proof)
              : row.proof
            : null

          return {
            id: row.id,
            amount: row.amount,
            utr: row.utr,
            proof: proof,
            approvedAt: row.approved_at,
            rejectedAt: row.rejected_at,
            createdAt: row.created_at,
            user: {
              id: row.user_id,
              name: row.user_name,
              email: row.user_email,
              phone: row.user_phone,
              avatar: row.user_avatar
                ? typeof row.user_avatar === 'string'
                  ? JSON.parse(row.user_avatar)
                  : row.user_avatar
                : null,
            },
            source: row.source,
          }
        }),
      }),
      getMeta: () => ({
        total,
        perPage: limit,
        currentPage: page,
        lastPage: Math.ceil(total / limit),
        firstPage: 1,
      }),
    }

    return {
      transactions,
      counts: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        approved: Number(stats.approved) || 0,
        rejected: Number(stats.rejected) || 0,
      },
    }
  }

  static async processActivation(transactionId: number, status: 'approved' | 'rejected') {
    const transaction = await Transaction.findOrFail(transactionId)
    const user = await User.findOrFail(transaction.userId)

    if (status === 'approved') {
      transaction.approvedAt = DateTime.now()
      transaction.rejectedAt = null
      user.activatedAt = DateTime.now()
    } else if (status === 'rejected') {
      transaction.rejectedAt = DateTime.now()
      transaction.approvedAt = null
    }
    await transaction.save()
    await user.save()
  }

  static async requestActivation(user: User, data: { utr: string; proof: any }) {
    await user.related('transactions').create({
      utr: data.utr,
      amount: 1000,
      type: TransactionTypeEnum.ACTIVATION,
      // @ts-ignore
      proof: await attachmentManager.createFromFile(data.proof),
    })
  }

  static async getUserActivationHistory(user: User) {
    const transactionsModel = await user
      .related('transactions')
      .query()
      .where('type', TransactionTypeEnum.ACTIVATION)
      .orderBy('createdAt', 'desc')

    return transactionsModel.map((t) => ({
      id: t.id,
      amount: t.amount,
      proof: t.proof?.url,
      utr: t.utr,
      approvedAt: t.approvedAt,
      rejectedAt: t.rejectedAt,
    }))
  }
}

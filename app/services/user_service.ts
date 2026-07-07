import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { attachmentManager } from '@jrmc/adonis-attachment'
import { UserRoleEnum } from '#enums/user'
import { TransactionTypeEnum } from '#enums/transaction'
import { DateTime } from 'luxon'
import WalletService from '#services/wallet_service'
import { ACTIVATION_AMOUNT } from '#constants/activation'

export default class UserService {
  static async getChildrenCount(user: User): Promise<number> {
    const directCount = await user.related('children').query().count('* as total').first()
    return directCount?.$extras.total || 0
  }

  static async getTeamCount(user: User): Promise<number> {
    const teamCountQuery = db
      .from('users')
      .withRecursive('descendants', (query) => {
        query
          .from('users')
          .where('parent_id', user.id)
          .select('id')
          .unionAll((subQuery) => {
            subQuery
              .from('users')
              .join('descendants', 'users.parent_id', 'descendants.id')
              .select('users.id')
          })
      })
      .from('descendants')
      .count('* as total')

    const result = await teamCountQuery.first()
    return result?.total || 0
  }

  static async getMaxDepth(user: User): Promise<number> {
    const maxDepthResult = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT MAX(depth) as max_depth FROM descendants
    `,
      [user.id]
    )
    return maxDepthResult.rows[0]?.max_depth || 0
  }

  static async getMembers(
    user: User,
    filters: {
      scope?: string
      search?: string
      status?: string
    }
  ) {
    const { scope = 'team', search, status } = filters
    const isAdmin = user.role === UserRoleEnum.ADMIN
    let membersQuery

    // Only admin can see phone numbers
    // Email is hidden from other users for privacy
    const columns = [
      'id',
      'name',
      ...(isAdmin ? ['email', 'phone'] : []),
      'created_at',
      'activated_at',
      'avatar',
      'parent_id',
      'leg',
    ]

    if (scope === 'team' || scope.startsWith('level_')) {
      // Recursive CTE to get all descendants with depth
      membersQuery = User.query()
        .withRecursive('descendants', (query: any) => {
          query
            .from('users')
            .where('parent_id', user.id)
            .select(...columns, db.raw('1 as depth'))
            .unionAll((subQuery: any) => {
              subQuery
                .from('users')
                .join('descendants', 'users.parent_id', 'descendants.id')
                .select(...columns.map((c) => `users.${c}`), db.raw('descendants.depth + 1'))
            })
        })
        .from('descendants')

      if (scope.startsWith('level_')) {
        const level = Number(scope.replace('level_', ''))
        if (!Number.isNaN(level)) {
          membersQuery = membersQuery.where('depth', level)
        }
      }
    } else {
      // Direct children only (equivalent to level 1)
      membersQuery = user
        .related('children')
        .query()
        .select(...columns, db.raw('1 as depth'))
    }

    // Search filter (ILIKE on name, email (admin only), phone (admin only), or exact match on ID)
    if (search) {
      membersQuery = membersQuery.where((subQuery: any) => {
        subQuery.where('name', 'ILIKE', `%${search}%`)

        // Only admin can search by email or phone
        if (isAdmin) {
          subQuery.orWhere('email', 'ILIKE', `%${search}%`)
          subQuery.orWhere('phone', 'ILIKE', `%${search}%`)
        }

        // Cast ID to text for ILIKE search
        subQuery.orWhereRaw('CAST(id AS TEXT) ILIKE ?', [`%${search}%`])
      })
    }

    // Status filter
    if (status) {
      const column = scope === 'team' || scope.startsWith('level_') ? 'activated_at' : 'activatedAt'
      if (status === 'active') {
        membersQuery = membersQuery.whereNotNull(column)
      } else if (status === 'inactive') {
        membersQuery = membersQuery.whereNull(column)
      }
    }

    let members

    if (scope === 'team' || scope.startsWith('level_')) {
      const rawMembers = await membersQuery.orderBy('created_at', 'desc')
      // Normalize raw DB results (snake_case) to match Model serialization (camelCase)
      members = rawMembers.map((m: any) => {
        return {
          id: m.id,
          name: m.name,
          ...(isAdmin ? { email: m.email, phone: m.phone } : {}),
          avatar: m.avatar?.url,
          leg: m.leg,
          createdAt: m.createdAt,
          activatedAt: m.activatedAt,
        }
      })
    } else {
      const result = await membersQuery.orderBy('created_at', 'desc')
      members = result.map((m: User) => {
        const serialized = m.serialize()
        return {
          id: serialized.id,
          name: serialized.name,
          ...(isAdmin ? { email: serialized.email, phone: serialized.phone } : {}),
          avatar: m.avatar?.url,
          leg: m.leg,
          createdAt: m.createdAt,
          activatedAt: m.activatedAt,
        }
      })
    }

    return members
  }

  static async isDescendant(ancestorId: number, descendantId: number): Promise<boolean> {
    const isDescendant = await db.rawQuery(
      `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM users WHERE id = ?
        UNION ALL
        SELECT u.id, u.parent_id
        FROM users u
        INNER JOIN ancestors a ON u.id = a.parent_id
      )
      SELECT 1 FROM ancestors WHERE id = ? LIMIT 1
    `,
      [descendantId, ancestorId]
    )

    return isDescendant.rows.length > 0
  }

  static async getTreeRoot(user: User) {
    await user.loadCount('children')
    await user.load('children', (query) => {
      query.withCount('children')
      query.select('id', 'name', 'created_at', 'activated_at', 'avatar', 'leg')
    })
    const rootUser = user.serialize()
    rootUser.childrenCount = Number(user.$extras.children_count)
    rootUser.children = user.children.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      activatedAt: c.activatedAt,
      avatar: c.avatar,
      leg: c.leg,
      childrenCount: Number(c.$extras.children_count),
    }))
    return rootUser
  }

  static async getChildren(userId: number) {
    const userModel = await User.findOrFail(userId)
    const children = await userModel
      .related('children')
      .query()
      .withCount('children')
      .select('id', 'name', 'created_at', 'activated_at', 'avatar', 'leg')

    return children.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      activatedAt: c.activatedAt,
      avatar: c.avatar,
      leg: c.leg,
      childrenCount: Number(c.$extras.children_count),
    }))
  }

  static async updateProfile(
    user: User,
    data: {
      name?: string
      email?: string
      phone?: string
      gender: any
      address?: string | null
      city?: string | null
      state?: any
      zipcode?: number | null
      avatar?: any
    }
  ) {
    if (data.avatar) {
      user.avatar = (await attachmentManager.createFromFile(data.avatar)) as any
    }

    if (data.name) user.name = data.name
    if (data.email) user.email = data.email
    if (data.phone) user.phone = data.phone
    user.gender = data.gender
    user.address = data.address ?? null
    user.city = data.city ?? null
    user.state = data.state ?? null
    user.zipcode = data.zipcode ?? null

    await user.save()
  }

  static async updatePassword(user: User, password: string) {
    user.password = password
    await user.save()
  }

  static async getAdminUsers(filters: {
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

    const query = User.query().whereNot('users.role', UserRoleEnum.ADMIN).preload('parent')

    // Validate sort column to prevent SQL injection
    const dbSortColumn =
      {
        createdAt: 'created_at',
        activatedAt: 'activated_at',

        parent: 'parents.name',
      }[sortBy] || sortBy

    if (sortBy === 'parent') {
      query
        .leftJoin('users as parents', 'users.parent_id', 'parents.id')
        .select('users.*') // Ensure we select users.* to avoid ambiguity or missing fields
        .orderBy('parents.name', sortOrder)
    } else {
      query.orderBy(dbSortColumn, sortOrder)
    }

    if (search) {
      query.where((subQuery) => {
        subQuery
          .where('name', 'ILIKE', `%${search}%`)
          .orWhere('email', 'ILIKE', `%${search}%`)
          .orWhere('phone', 'ILIKE', `%${search}%`)

          .orWhereRaw('CAST(users.id AS TEXT) ILIKE ?', [`%${search}%`])
      })
    }

    if (status === 'active') {
      query.whereNotNull('activatedAt')
    } else if (status === 'inactive') {
      query.whereNull('activatedAt')
    }

    const [users, userStats] = await Promise.all([
      query.paginate(page, limit),
      User.query()
        .whereNot('role', UserRoleEnum.ADMIN)
        .select(
          db.raw('count(*) as total'),
          db.raw('count(case when activated_at is not null then 1 end) as active'),
          db.raw('count(case when activated_at is null then 1 end) as inactive')
        )
        .first(),
    ])

    const stats = userStats?.$extras || {}

    return {
      users,
      counts: {
        total: Number(stats.total) || 0,
        active: Number(stats.active) || 0,
        inactive: Number(stats.inactive) || 0,
      },
    }
  }

  static async getUserDetails(userId: number) {
    return await User.query()
      .where('id', userId)
      .preload('parent')
      .preload('bank')
      .preload('kyc')
      .preload('transactions', (q) => {
        q.where('type', TransactionTypeEnum.ACTIVATION).andWhereNotNull('approvedAt')
      })
      .withCount('children')
      .firstOrFail()
  }

  static async getAdminDashboardMetrics() {
    const today = DateTime.now().startOf('day').toSQLDate()
    const startOfMonth = DateTime.now().startOf('month').toSQLDate()

    const [userStats, businessStats] = await Promise.all([
      db
        .from('users')
        .whereNot('role', UserRoleEnum.ADMIN)
        .select(
          db.raw('count(*) as total_users'),
          db.raw('count(case when activated_at is not null then 1 end) as active_users'),
          db.raw('count(case when created_at >= ? then 1 end) as today_users', [today]),
          db.raw('count(case when activated_at >= ? then 1 end) as today_active_users', [today]),
          db.raw('count(case when created_at >= ? then 1 end) as month_users', [startOfMonth]),
          db.raw('count(case when activated_at >= ? then 1 end) as month_active_users', [
            startOfMonth,
          ])
        )
        .first(),
      db
        .from('transactions')
        .whereIn('type', [TransactionTypeEnum.TOPUP, TransactionTypeEnum.EMI])
        .whereNotNull('approved_at')
        .select(
          // Total Business
          db.raw('sum(amount) as total_business'),
          db.raw('sum(case when type = ? then amount else 0 end) as total_emi_business', [
            TransactionTypeEnum.EMI,
          ]),

          // Monthly Business
          db.raw('sum(case when created_at >= ? then amount else 0 end) as month_business', [
            startOfMonth,
          ]),
          db.raw(
            'sum(case when type = ? and created_at >= ? then amount else 0 end) as month_emi_business',
            [TransactionTypeEnum.EMI, startOfMonth]
          ),

          // Today's Business
          db.raw('sum(case when created_at >= ? then amount else 0 end) as today_business', [
            today,
          ]),
          db.raw(
            'sum(case when type = ? and created_at >= ? then amount else 0 end) as today_emi_business',
            [TransactionTypeEnum.EMI, today]
          )
        )
        .first(),
    ])

    return {
      totalUsers: Number(userStats.total_users),
      activeUsers: Number(userStats.active_users),
      todayUsers: Number(userStats.today_users),
      todayActiveUsers: Number(userStats.today_active_users),
      monthUsers: Number(userStats.month_users),
      monthActiveUsers: Number(userStats.month_active_users),

      business: {
        total: Number(businessStats.total_business) || 0,
        totalEmi: Number(businessStats.total_emi_business) || 0,
        month: Number(businessStats.month_business) || 0,
        monthEmi: Number(businessStats.month_emi_business) || 0,
        today: Number(businessStats.today_business) || 0,
        todayEmi: Number(businessStats.today_emi_business) || 0,
      },
    }
  }

  static async activateUser(userId: number) {
    const user = await User.findOrFail(userId)

    if (user.activatedAt) {
      throw new Error('User is already activated')
    }

    user.activatedAt = DateTime.now()
    await user.save()
  }

  static async selfActivateUser(userId: number, amount?: number) {
    const user = await User.findOrFail(userId)

    if (user.activatedAt) {
      throw new Error('User is already activated')
    }

    const activationAmount = amount || ACTIVATION_AMOUNT

    // Validate activation amount
    if (![500, 1000].includes(activationAmount)) {
      throw new Error('Invalid activation amount. Please select ₹500 or ₹1000.')
    }

    // Check if user has sufficient wallet balance for activation
    const currentBalance = Number(user.walletBalance ?? 0)
    if (currentBalance < activationAmount) {
      throw new Error('Insufficient wallet balance for activation')
    }

    // Deduct activation amount from wallet
    await WalletService.debitWallet(userId, activationAmount, 'Self-activation fee')

    // Activate user
    user.activatedAt = DateTime.now()
    await user.save()

    // Create activation transaction record (for history/record keeping)
    await user.related('transactions').create({
      utr: `SELF-${DateTime.now().toFormat('yyyyMMddHHmmss')}-${userId}`,
      amount: activationAmount,
      type: TransactionTypeEnum.ACTIVATION,
      approvedAt: DateTime.now(),
    })
  }
}

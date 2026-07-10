import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

export default class WalletService {
  /**
   * Credit a user's wallet balance and create an audit transaction.
   */
  static async creditWallet(userId: number, amount: number, adminId: number, remark?: string) {
    return db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()

      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Credited by admin #${adminId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )

      const currentBalance = Number(user.walletBalance ?? 0)
      user.walletBalance = currentBalance + amount
      await user.save()

      return transaction
    })
  }

  static async creditRepurchaseWallet(
    userId: number,
    amount: number,
    adminId: number,
    remark?: string
  ) {
    return db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Repurchase credited by admin #${adminId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )
      user.repurchaseWallet = Number(user.repurchaseWallet ?? 0) + amount
      await user.save()
      return transaction
    })
  }

  /**
   * Debit a user's wallet balance and create an audit transaction.
   */
  static async debitWallet(userId: number, amount: number, remark?: string) {
    return db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()

      const currentBalance = Number(user.walletBalance ?? 0)
      if (currentBalance < amount) {
        throw new Error('Insufficient wallet balance')
      }

      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_DEBIT,
          amount,
          remark: remark || undefined,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )

      user.walletBalance = currentBalance - amount
      await user.save()

      return transaction
    })
  }

  /**
   * Get paginated list of non-admin users with their wallet balances.
   */
  static async getAdminWallets({
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search = '',
  }: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
    search?: string
  }) {
    const query = User.query()
      .whereNot('role', 'admin')
      .select(
        'id',
        'name',
        'email',
        'phone',
        'wallet_balance',
        'created_at',
        'activated_at',
        'role'
      )

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhere('id', Number.isInteger(Number(search)) ? Number(search) : -1)
      })
    }

    query.orderBy(sortBy, sortOrder as 'asc' | 'desc')

    const users = await query.paginate(page, limit)

    return {
      users: {
        meta: users.getMeta(),
        data: users.serialize().data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          walletBalance: Number(u.walletBalance ?? 0),
          activatedAt: u.activatedAt,
          role: u.role,
          createdAt: u.createdAt,
        })),
      },
      totalWalletBalance: await this.getTotalWalletBalance(),
    }
  }

  /**
   * Get wallet transaction history for a specific user.
   */
  static async getWalletHistory(
    userId: number,
    {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    }: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: string
    }
  ) {
    const user = await User.findOrFail(userId)

    const query = Transaction.query()
      .where('user_id', userId)
      .whereIn('type', [TransactionTypeEnum.WALLET_CREDIT, TransactionTypeEnum.WALLET_DEBIT])
      .orderBy(sortBy, sortOrder as 'asc' | 'desc')

    const transactions = await query.paginate(page, limit)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        walletBalance: Number(user.walletBalance ?? 0),
        incomeWallet: Number(user.incomeWallet ?? 0),
        repurchaseWallet: Number(user.repurchaseWallet ?? 0),
      },
      transactions: {
        meta: transactions.getMeta(),
        data: transactions.serialize().data.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          remark: t.remark,
          createdAt: t.createdAt,
          approvedAt: t.approvedAt,
        })),
      },
    }
  }

  /**
   * Get the sum of all non-admin user wallet balances.
   */
  static async getTotalWalletBalance(): Promise<number> {
    const result = await db
      .from('users')
      .whereNot('role', 'admin')
      .sum('wallet_balance as total')
      .first()
    return Number(result?.total ?? 0)
  }

  /**
   * Search for users by ID, name, email, or phone for wallet transfers
   * Returns user info including name for verification
   * Supports PJR/PJL prefixed IDs by stripping the prefix before searching.
   */
  static async searchUsersForTransfer(searchTerm: string, excludeUserId?: number) {
    // Strip PJR/PJL prefix from search term for ID-based search
    const cleanForId = searchTerm.replace(/^[a-zA-Z]+/i, '')

    const query = User.query()
      .whereNot('role', 'admin')
      .select('id', 'name', 'email', 'phone', 'walletBalance')
      .where((builder) => {
        builder
          .whereILike('name', `%${searchTerm}%`)
          .orWhereILike('email', `%${searchTerm}%`)
          .orWhereILike('phone', `%${searchTerm}%`)
          .orWhere('id', Number.isInteger(Number(cleanForId)) ? Number(cleanForId) : -1)
      })

    // Exclude current user from search results if specified
    if (excludeUserId) {
      query.whereNot('id', excludeUserId)
    }

    const users = await query.limit(10) // Limit results for performance
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      walletBalance: Number(user.walletBalance ?? 0),
    }))
  }

  /**
   * Lookup a single user by their formatted ID (e.g. "PJR7638545" or "PJL7638545").
   * Strips the PJR/PJL prefix and returns the user's basic details.
   * Throws an error if the user is not found.
   */
  static async lookupUserByFormattedId(formattedId: string) {
    const cleanId = formattedId.replace(/^[a-zA-Z]+/i, '')
    const userId = Number(cleanId)

    if (!userId) {
      throw new Error('Invalid user ID format')
    }

    const user = await User.query()
      .where('id', userId)
      .select('id', 'name', 'walletBalance')
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user.id,
      name: user.name,
      walletBalance: Number(user.walletBalance ?? 0),
    }
  }

  /**
   * Transfer funds from one user's wallet to another user's wallet.
   * Creates debit transaction for sender and credit transaction for receiver.
   */
  static async transferWallet(
    senderId: number,
    receiverId: number,
    amount: number,
    remark?: string
  ) {
    return db.transaction(async (trx) => {
      // Verify sender exists and has sufficient balance
      const sender = await User.query({ client: trx }).where('id', senderId).firstOrFail()
      const senderBalance = Number(sender.walletBalance ?? 0)
      if (senderBalance < amount) {
        throw new Error('Insufficient wallet balance')
      }

      // Verify receiver exists
      const receiver = await User.query({ client: trx }).where('id', receiverId).firstOrFail()

      // Create debit transaction for sender
      const debitTransaction = await Transaction.create(
        {
          userId: senderId,
          type: TransactionTypeEnum.WALLET_DEBIT,
          amount,
          remark: remark || `Transferred to user #${receiverId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )

      // Create credit transaction for receiver
      const creditTransaction = await Transaction.create(
        {
          userId: receiverId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Received from user #${senderId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )

      // Update sender's wallet balance
      sender.walletBalance = senderBalance - amount
      await sender.save()

      // Update receiver's wallet balance
      const receiverBalance = Number(receiver.walletBalance ?? 0)
      receiver.walletBalance = receiverBalance + amount
      await receiver.save()

      return {
        debitTransaction,
        creditTransaction,
      }
    })
  }
}

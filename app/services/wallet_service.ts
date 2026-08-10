import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * Payout wallet credits (repurchase + working). The main user wallet balance
 * has been removed from the system — activation is done by the admin.
 */
export default class WalletService {
  static async creditRepurchaseWallet(
    userId: number,
    amount: number,
    adminId: number,
    remark?: string,
    client?: TransactionClientContract
  ) {
    const apply = async (trx: TransactionClientContract) => {
      const user = await User.query({ client: trx })
        .select('id', 'repurchase_wallet')
        .where('id', userId)
        .firstOrFail()
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
    }

    // When called inside an existing transaction, participate in it.
    // Otherwise create a dedicated transaction.
    return client ? apply(client) : db.transaction(apply)
  }

  static async creditWorkingWallet(
    userId: number,
    amount: number,
    adminId: number,
    remark?: string,
    client?: TransactionClientContract
  ) {
    const apply = async (trx: TransactionClientContract) => {
      const user = await User.query({ client: trx })
        .select('id', 'working_wallet')
        .where('id', userId)
        .firstOrFail()
      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Working income credited by admin #${adminId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )
      user.workingWallet = Number(user.workingWallet ?? 0) + amount
      await user.save()
      return transaction
    }

    // When called inside an existing transaction, participate in it.
    // Otherwise create a dedicated transaction.
    return client ? apply(client) : db.transaction(apply)
  }
}

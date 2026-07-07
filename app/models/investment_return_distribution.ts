import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '#models/user'
import Investment from '#models/investment'
import Transaction from '#models/transaction'

export default class InvestmentReturnDistribution extends BaseModel {
  static table = 'investment_return_distributions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare investmentId: number

  @column()
  declare userId: number

  @column.date()
  declare periodMonth: DateTime

  @column()
  declare investmentAmount: number

  @column()
  declare returnAmount: number

  @column()
  declare incomeAmount: number

  @column()
  declare goldAmount: number

  @column()
  declare goldTransactionId: string | null

  @column()
  declare incomeWalletTransactionId: string | null

  @column.dateTime()
  declare paidOutAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Investment)
  declare investment: BelongsTo<typeof Investment>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Transaction, { foreignKey: 'goldTransactionId' })
  declare goldTransaction: BelongsTo<typeof Transaction>
}

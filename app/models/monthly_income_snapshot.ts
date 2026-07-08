import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class MonthlyIncomeSnapshot extends BaseModel {
  static table = 'monthly_income_snapshots'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column.date()
  declare month: DateTime

  @column()
  declare grossAmount: number

  @column()
  declare incomeWalletAmount: number

  @column()
  declare repurchaseWalletAmount: number

  @column.dateTime()
  declare paidOutAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

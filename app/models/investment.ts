import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '#models/user'
import InvestmentReturnDistribution from '#models/investment_return_distribution'

export type InvestmentStatus = 'active' | 'closed'

export default class Investment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare amount: number

  @column()
  declare monthlyReturnRate: number

  @column()
  declare status: InvestmentStatus

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare closedAt: DateTime | null

  @column()
  declare remark: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => InvestmentReturnDistribution)
  declare distributions: HasMany<typeof InvestmentReturnDistribution>
}

import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '#models/user'
import PurchaseReturn from '#models/purchase_return'

export type PurchaseStatus = 'active' | 'closed'

export default class PurchasePlan extends BaseModel {
  static table = 'investments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare amount: number

  /**
   * Gold purchase this purchase plan was created from.
   * Purchases earn monthly returns — every approved purchase is a purchase plan.
   */
  @column()
  declare purchaseId: string | null

  @column()
  declare monthlyReturnRate: number

  @column()
  declare status: PurchaseStatus

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

  @hasMany(() => PurchaseReturn)
  declare distributions: HasMany<typeof PurchaseReturn>
}

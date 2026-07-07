import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import withID from '#models/utils/with_id'
import withTimestamps from '#models/utils/with_timestamps'
import User from '#models/user'

export default class Purchase extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare amount: number

  @column()
  declare buyerName: string

  @column()
  declare quantity: number

  @column()
  declare userId: number

  @column()
  declare approvedAt: DateTime | null

  @column()
  declare rejectedAt: DateTime | null

  @column()
  declare stoppedAt: DateTime | null

  @column()
  declare cancelledAt: DateTime | null

  @column()
  declare remark: string | null

  // Gold billing fields
  @column()
  declare goldWeight: number | null

  @column()
  declare goldCarat: string | null

  @column()
  declare goldRate: number | null

  @column()
  declare goldPrice: number | null

  @column()
  declare makingCharges: number | null

  @column()
  declare gstAmount: number | null

  @column()
  declare hallmarkCharges: number | null

  @column()
  declare additionalCharges: number | null

  @column()
  declare totalItems: number | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import withID from '#models/utils/with_id'
import withTimestamps from '#models/utils/with_timestamps'
import User from '#models/user'

export default class Achievement extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare userId: number

  @column()
  declare power: number

  @column()
  declare weaker: number

  @column()
  declare criteria: number

  @column()
  declare reward: string

  @column()
  declare collectedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @computed()
  get isCollected() {
    return !!this.collectedAt
  }
}

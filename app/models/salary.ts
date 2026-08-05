import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import withID from '#models/utils/with_id'
import withTimestamps from '#models/utils/with_timestamps'
import RewardService from '#services/reward_service'
import User from '#models/user'

export default class Salary extends compose(BaseModel, withID(), withTimestamps()) {
  static table = 'salaries'
  @column()
  declare userId: number

  @column()
  declare power: number

  @column()
  declare weaker: number

  /** 'paid' | 'pending' | 'expired' */
  @column()
  declare status: string

  /** Business volume (6-month accumulation window) at qualification time */
  @column()
  declare qualifyingBusiness: number | null

  /** When the incentive became payable */
  @column()
  declare paidAt: DateTime | null

  @computed()
  get isPaid() {
    return this.status === 'paid'
  }

  @computed()
  get amount() {
    return this.power + this.weaker
  }

  @computed()
  get info() {
    return RewardService.getSalaryInfo([this.power, this.weaker])
  }

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class RewardAward extends BaseModel {
  static table = 'reward_awards'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare businessTarget: number

  @column()
  declare rewardDescription: string

  @column()
  declare sortOrder: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActive(): Promise<RewardAward[]> {
    return this.query().where('is_active', true).orderBy('business_target', 'asc')
  }

  static async findQualifying(businessAmount: number): Promise<RewardAward | null> {
    return this.query()
      .where('is_active', true)
      .where('business_target', '<=', businessAmount)
      .orderBy('business_target', 'desc')
      .first()
  }
}

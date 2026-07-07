import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PerformanceIncentive extends BaseModel {
  static table = 'performance_incentives'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare businessTarget: number

  @column()
  declare rewardAmount: number

  @column()
  declare sortOrder: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActive(): Promise<PerformanceIncentive[]> {
    return this.query().where('is_active', true).orderBy('business_target', 'asc')
  }

  static async findQualifying(businessAmount: number): Promise<PerformanceIncentive | null> {
    return this.query()
      .where('is_active', true)
      .where('business_target', '<=', businessAmount)
      .orderBy('business_target', 'desc')
      .first()
  }
}

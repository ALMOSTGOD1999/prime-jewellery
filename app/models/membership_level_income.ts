import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class MembershipLevelIncome extends BaseModel {
  static table = 'membership_level_incomes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare level: number

  @column()
  declare percentage: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActiveLevels(): Promise<MembershipLevelIncome[]> {
    return this.query().where('is_active', true).orderBy('level', 'asc')
  }

  static async getPercentageForLevel(level: number): Promise<number> {
    const record = await this.query().where('level', level).where('is_active', true).first()
    return record?.percentage ?? 0
  }
}

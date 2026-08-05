import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class TeamBusinessLevel extends BaseModel {
  static table = 'team_business_levels'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare level: number

  @column()
  declare minBusiness: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActiveLevels(): Promise<TeamBusinessLevel[]> {
    return this.query().where('is_active', true).orderBy('level', 'asc')
  }

  static async getLevelForBusiness(business: number): Promise<number> {
    const levels = await this.getActiveLevels()
    let matched = 0
    for (const l of levels) {
      if (business >= l.minBusiness) matched = l.level
      else break
    }
    return matched
  }
}

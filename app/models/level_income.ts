import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LevelIncome extends BaseModel {
  static table = 'level_incomes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare level: number

  @column()
  declare percentage: number

  @column()
  declare minDirects: number

  @column()
  declare minTeamBusinessLevel: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActiveLevels(): Promise<LevelIncome[]> {
    return this.query().where('is_active', true).orderBy('level', 'asc')
  }

  static async getUnlockedLevels(directCount: number): Promise<LevelIncome[]> {
    return this.query()
      .where('is_active', true)
      .where('min_directs', '<=', directCount)
      .orderBy('level', 'asc')
  }

  static async getPercentageForLevel(level: number): Promise<number> {
    const record = await this.query().where('level', level).where('is_active', true).first()
    return record?.percentage ?? 0
  }

  static async getMaxUnlockedLevel(
    directCount: number,
    teamBusinessLevel: number
  ): Promise<number> {
    const levels = await this.query().where('is_active', true).orderBy('level', 'desc')
    for (const l of levels) {
      if (directCount >= l.minDirects && teamBusinessLevel >= l.minTeamBusinessLevel) {
        return l.level
      }
    }
    return 0
  }
}

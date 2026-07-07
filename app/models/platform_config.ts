import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PlatformConfig extends BaseModel {
  static table = 'platform_configs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare key: string

  @column()
  declare value: string

  @column()
  declare group: string

  @column()
  declare label: string | null

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async get(key: string, defaultValue?: string): Promise<string | null> {
    const config = await this.query().where('key', key).first()
    return config?.value ?? defaultValue ?? null
  }

  static async set(key: string, value: string, group = 'general', label?: string, description?: string) {
    const existing = await this.query().where('key', key).first()
    if (existing) {
      existing.value = value
      if (label) existing.label = label
      if (description) existing.description = description
      await existing.save()
      return existing
    }
    return this.create({ key, value, group, label, description })
  }

  static async getByGroup(group: string): Promise<PlatformConfig[]> {
    return this.query().where('group', group).orderBy('key', 'asc')
  }

  static async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const val = await this.get(key, String(defaultValue))
    return Number(val) || defaultValue
  }
}

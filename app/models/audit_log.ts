import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class AuditLog extends BaseModel {
  static table = 'audit_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare entityType: string

  @column()
  declare entityId: number

  @column()
  declare field: string

  @column()
  declare oldValue: string | null

  @column()
  declare newValue: string

  @column()
  declare changedBy: number | null

  @column()
  declare reason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'changedBy' })
  declare changer: BelongsTo<typeof User>

  static async log(params: {
    entityType: string
    entityId: number
    field: string
    oldValue: string | null
    newValue: string
    changedBy: number
    reason?: string
  }) {
    return this.create(params)
  }

  static async getHistory(entityType: string, entityId: number) {
    return this.query()
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .preload('changer', (q) => q.select('id', 'name'))
      .orderBy('created_at', 'desc')
  }

  static async getAllHistory(page = 1, limit = 50) {
    return this.query()
      .preload('changer', (q) => q.select('id', 'name'))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }
}

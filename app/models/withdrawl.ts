import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'
import User from '#models/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Withdrawl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare amount: number

  @column()
  declare type: WithdrawlTypeEnum

  @column()
  declare status: WithdrawlStatusEnum

  @column()
  declare mode: string | null

  @column()
  declare ref: string | null

  @column.dateTime({ serializeAs: 'approved_at' })
  declare approvedAt: DateTime | null

  @column.dateTime({ serializeAs: 'rejected_at' })
  declare rejectedAt: DateTime | null

  @column()
  declare remark: string | null

  @column()
  declare adminCharges: number | null

  @column()
  declare otherDeductions: number | null

  @column()
  declare netAmount: number | null

  @column.dateTime({ autoCreate: true, serializeAs: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

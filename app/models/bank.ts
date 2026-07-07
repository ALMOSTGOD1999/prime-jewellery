import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { Attachment, attachment } from '@jrmc/adonis-attachment'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import withTimestamps from '#models/utils/with_timestamps'
import { DateTime } from 'luxon'

export default class Bank extends compose(BaseModel, withTimestamps()) {
  @column()
  declare id: number

  @column()
  declare name: string

  @column()
  declare branch: string

  @column()
  declare ifsc: string

  @column()
  declare holderName: string

  @column()
  declare accountNumber: string

  @column()
  declare upi: string

  @attachment({
    folder: 'qr',
    rename: (b: Bank) => `${b.id}.${b.qr?.extname}`,
    preComputeUrl: true,
  })
  declare qr: Attachment | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare rejectedAt: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'id',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof User>
}

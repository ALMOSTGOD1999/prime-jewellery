import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import withTimestamps from '#models/utils/with_timestamps'
import User from '#models/user'
import { type Attachment, attachment } from '@jrmc/adonis-attachment'

export default class Kyc extends compose(BaseModel, withTimestamps()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare aadhaarNumber: string

  @attachment({
    folder: (k: Kyc) => `kyc/${k.id}`,
    rename: (k: Kyc) => `aadhaar.${k.aadhaarProof.extname}`,
    preComputeUrl: true,
  })
  declare aadhaarProof: Attachment

  @column()
  declare panNumber: string

  @attachment({
    folder: (k: Kyc) => `kyc/${k.id}`,
    rename: (k: Kyc) => `pan.${k.panProof.extname}`,
    preComputeUrl: true,
  })
  declare panProof: Attachment

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

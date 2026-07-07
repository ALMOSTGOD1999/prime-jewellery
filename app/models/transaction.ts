import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { attachment, type Attachment } from '@jrmc/adonis-attachment'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import withID from '#models/utils/with_id'
import withTimestamps from '#models/utils/with_timestamps'
import { TransactionTypeEnum } from '#enums/transaction'
import User from '#models/user'

export interface PurchaseMetadata {
  itemName: string
  huid: string
  quantity: number
  hsnCode: string
  grossWeight: number
  netWeight: number
  ratePerGram: number
  valueOfOrnament: number
  diamondCharges: number
  makingCharge: number
  miscellaneousCharges: number
  cashAmount: number
  chequeAmount: number
  bankTransferAmount: number
  cardAmount: number
  advanceAmount: number
  ogAdjustmentAmount: number
}

export default class Transaction extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare userId: number

  @column()
  declare amount: number

  @column()
  declare type: TransactionTypeEnum

  @attachment({
    folder: (t: Transaction) => `transactions/${t.userId}/${DateTime.now().toFormat('yyyy/MM/dd')}`,
    preComputeUrl: true,
  })
  declare proof: Attachment | null

  @column()
  declare utr: string | null

  @column()
  declare approvedAt: DateTime | null

  @column()
  declare rejectedAt: DateTime | null

  @column()
  declare stoppedAt: DateTime | null

  @column()
  declare cancelledAt: DateTime | null

  @column()
  declare wastedAmount: number | null

  @column()
  declare remark: string | null

  @column({
    prepare: (value: any) => {
      if (!value) return null
      if (typeof value === 'string') return value
      return JSON.stringify(value)
    },
    consume: (value: any) => {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare metadata: PurchaseMetadata[] | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

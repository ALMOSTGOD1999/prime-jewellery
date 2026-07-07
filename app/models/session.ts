import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'

import withID from '#models/utils/with_id'

export default class Session extends compose(BaseModel, withID()) {
  @column()
  declare userId: number

  @column()
  declare ipAddress: string

  @column()
  declare sessionToken: string

  @column()
  declare userAgent: string

  @column.dateTime({ autoCreate: true })
  declare lastActiveAt: DateTime
}

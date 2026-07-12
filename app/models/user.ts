import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type Attachment, attachment } from '@jrmc/adonis-attachment'
import { DateTime } from 'luxon'

import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

import withTimestamps from '#models/utils/with_timestamps'
import { UserGenderEnum, UserLegEnum, UserRoleEnum } from '#enums/user'
import Transaction from '#models/transaction'
import { IndianStatesEnum } from '#enums/settings'
import Bank from '#models/bank'
import Kyc from '#models/kyc'
import Purchase from '#models/purchase'
import Salary from '#models/salary'
import Achievement from '#models/achievement'
import Withdrawl from '#models/withdrawl'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['id'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder, withTimestamps()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare phone: string

  @column()
  declare gender: UserGenderEnum

  @attachment({
    folder: 'avatars',
    rename: (u: User) => `${u.id}.${u.avatar?.extname}`,
    preComputeUrl: true,
  })
  declare avatar: Attachment | null

  @column()
  declare role: UserRoleEnum

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare activatedAt: DateTime | null

  @column()
  declare status: string

  @column()
  declare parentId: number | null

  @column()
  declare leg: UserLegEnum | null

  @column()
  declare address: string | null

  @column()
  declare zipcode: number | null

  @column()
  declare city: string | null

  @column()
  declare state: IndianStatesEnum | null

  @column()
  declare walletBalance: number

  @column()
  declare incomeWallet: number

  @column()
  declare rewardWallet: number

  @column()
  declare repurchaseWallet: number

  @column()
  declare totalInvested: number

  @hasMany(() => User, {
    localKey: 'id',
    foreignKey: 'parentId',
  })
  declare children: HasMany<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'parentId',
  })
  declare parent: BelongsTo<typeof User>

  @hasMany(() => Transaction)
  declare transactions: HasMany<typeof Transaction>

  @hasMany(() => Purchase)
  declare purchases: HasMany<typeof Purchase>

  @hasOne(() => Bank, {
    localKey: 'id',
    foreignKey: 'id',
  })
  declare bank: HasOne<typeof Bank>

  @hasOne(() => Kyc, {
    localKey: 'id',
    foreignKey: 'id',
  })
  declare kyc: HasOne<typeof Kyc>

  @hasMany(() => Salary)
  declare salaries: HasMany<typeof Salary>

  @hasMany(() => Achievement)
  declare achievements: HasMany<typeof Achievement>

  @hasMany(() => Withdrawl)
  declare withdrawls: HasMany<typeof Withdrawl>

  @beforeCreate()
  public static async beforeCreate(user: User) {
    if (user.role === UserRoleEnum.ADMIN) {
      const adminExists = await User.query().where('role', UserRoleEnum.ADMIN).first()
      if (adminExists) {
        throw new Error('An admin already exists. Only one admin is allowed.')
      }
    }
    user.id = user.id ?? (await this.generateUniqueId(user.role))
  }

  private static async generateUniqueId(role: UserRoleEnum): Promise<number> {
    let min = 1_000_000
    let max = 9_000_000

    if (role === UserRoleEnum.FRANCHISE) {
      min = 100_000
      max = 900_000
    }

    const id = Math.floor(min + Math.random() * max)
    const exist = await this.find(id)
    if (exist) {
      return this.generateUniqueId(role)
    }
    return id
  }
}

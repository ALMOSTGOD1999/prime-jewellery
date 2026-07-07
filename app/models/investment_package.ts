import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class InvestmentPackage extends BaseModel {
  static table = 'investment_packages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare minAmount: number

  @column()
  declare maxAmount: number | null

  @column()
  declare monthlyReturnPercent: number

  @column()
  declare maxReturnPercent: number

  @column()
  declare sortOrder: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getActivePackages(): Promise<InvestmentPackage[]> {
    return this.query().where('is_active', true).orderBy('sort_order', 'asc')
  }

  static async findPackageForAmount(amount: number): Promise<InvestmentPackage | null> {
    return this.query()
      .where('is_active', true)
      .where('min_amount', '<=', amount)
      .where((query) => {
        query.whereNull('max_amount').orWhere('max_amount', '>=', amount)
      })
      .orderBy('min_amount', 'desc')
      .first()
  }
}

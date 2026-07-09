import db from '@adonisjs/lucid/services/db'
import PlatformConfig from '#models/platform_config'
import InvestmentPackage from '#models/investment_package'
import PerformanceIncentive from '#models/performance_incentive'
import MembershipLevelIncome from '#models/membership_level_income'
import LevelIncome from '#models/level_income'
import AuditLog from '#models/audit_log'

export default class BusinessEngineService {
  private adminId: number

  constructor(adminId: number) {
    this.adminId = adminId
  }

  // ─── Audit Helper ────────────────────────────────────────────

  private async audit(
    entityType: string,
    entityId: number,
    field: string,
    oldValue: string | null,
    newValue: string,
    reason?: string
  ) {
    await AuditLog.log({
      entityType,
      entityId,
      field,
      oldValue,
      newValue,
      changedBy: this.adminId,
      reason: reason || undefined,
    })
  }

  // ─── Platform Config with Audit ───────────────────────────────

  async getPlatformConfigs(group?: string) {
    const query = PlatformConfig.query().orderBy('group', 'asc').orderBy('key', 'asc')
    if (group) query.where('group', group)
    return query
  }

  async updatePlatformConfig(key: string, value: string, reason?: string) {
    return db.transaction(async (trx) => {
      const existing = await PlatformConfig.query({ client: trx }).where('key', key).first()
      const oldValue = existing?.value ?? null

      const config = await PlatformConfig.set(key, value)

      await this.audit('platform_config', config.id, 'value', oldValue, String(value), reason)
      return config
    })
  }

  async bulkUpdateConfigs(updates: Record<string, string>, group: string, reason?: string) {
    return db.transaction(async (trx) => {
      for (const [key, value] of Object.entries(updates)) {
        const existing = await PlatformConfig.query({ client: trx }).where('key', key).first()
        const oldValue = existing?.value ?? null

        await PlatformConfig.set(key, String(value), group)
        const config = await PlatformConfig.query({ client: trx }).where('key', key).first()

        await AuditLog.create(
          {
            entityType: 'platform_config',
            entityId: config!.id,
            field: 'value',
            oldValue,
            newValue: String(value),
            changedBy: this.adminId,
            reason: reason || undefined,
          },
          { client: trx }
        )
      }
    })
  }

  // ─── Gold Purchase Config ──────────────────────────────────────

  async getGoldPurchaseConfig() {
    return PlatformConfig.query()
      .whereIn('group', ['gold_billing', 'gold_purchase'])
      .orWhereIn('key', [
        'gold_jewellery_value_percent',
        'gold_making_charge_percent',
        'gold_gst_percent',
        'gold_additional_charge_percent',
        'gold_rate_source',
        'gold_rate_manual_override',
      ])
      .orderBy('key', 'asc')
  }

  async updateGoldConfig(data: Record<string, string>, reason?: string) {
    const goldKeys = [
      'gold_jewellery_value_percent',
      'gold_making_charge_percent',
      'gold_gst_percent',
      'gold_additional_charge_percent',
      'gold_rate_source',
      'gold_rate_manual_override',
    ]
    const updates: Record<string, string> = {}
    for (const key of goldKeys) {
      if (data[key] !== undefined) {
        updates[key] = data[key]
      }
    }
    await this.bulkUpdateConfigs(updates, 'gold_purchase', reason)
  }

  // ─── Income Distribution Config ───────────────────────────────

  async getIncomeDistributionConfig() {
    return PlatformConfig.query()
      .whereIn('key', ['repurchase_wallet_percent', 'admin_charge_percent'])
      .orderBy('key', 'asc')
  }

  async updateIncomeDistribution(data: Record<string, string>, reason?: string) {
    const keys = ['repurchase_wallet_percent', 'admin_charge_percent']
    const updates: Record<string, string> = {}
    for (const key of keys) {
      if (data[key] !== undefined) {
        updates[key] = data[key]
      }
    }
    await this.bulkUpdateConfigs(updates, 'income_distribution', reason)
  }

  // ─── Monthly Cash Reward Slabs ────────────────────────────────

  async getCashRewardSlabs() {
    return InvestmentPackage.query().orderBy('sort_order', 'asc').orderBy('min_amount', 'asc')
  }

  async upsertCashRewardSlab(
    data: {
      id?: number
      name: string
      minAmount: number
      maxAmount: number | null
      monthlyReturnPercent: number
      maxReturnPercent: number
      sortOrder: number
      isActive: boolean
    },
    reason?: string
  ) {
    return db.transaction(async (trx) => {
      const slab = data.id
        ? await InvestmentPackage.query({ client: trx }).where('id', data.id).firstOrFail()
        : new InvestmentPackage()

      const isNew = !data.id

      if (!isNew) {
        // Audit each changed field
        if (slab.name !== data.name)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'name',
            slab.name,
            data.name,
            reason
          )
        if (slab.minAmount !== data.minAmount)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'min_amount',
            String(slab.minAmount),
            String(data.minAmount),
            reason
          )
        if (slab.maxAmount !== data.maxAmount)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'max_amount',
            String(slab.maxAmount ?? ''),
            String(data.maxAmount ?? ''),
            reason
          )
        if (slab.monthlyReturnPercent !== data.monthlyReturnPercent)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'monthly_return_percent',
            String(slab.monthlyReturnPercent),
            String(data.monthlyReturnPercent),
            reason
          )
        if (slab.maxReturnPercent !== data.maxReturnPercent)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'max_return_percent',
            String(slab.maxReturnPercent),
            String(data.maxReturnPercent),
            reason
          )
        if (slab.sortOrder !== data.sortOrder)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'sort_order',
            String(slab.sortOrder),
            String(data.sortOrder),
            reason
          )
        if (slab.isActive !== data.isActive)
          await this.auditTx(
            trx,
            'investment_package',
            slab.id,
            'is_active',
            String(slab.isActive),
            String(data.isActive),
            reason
          )
      }

      slab.name = data.name
      slab.minAmount = data.minAmount
      slab.maxAmount = data.maxAmount
      slab.monthlyReturnPercent = data.monthlyReturnPercent
      slab.maxReturnPercent = data.maxReturnPercent
      slab.sortOrder = data.sortOrder
      slab.isActive = data.isActive
      await slab.useTransaction(trx).save()

      if (isNew) {
        await AuditLog.create(
          {
            entityType: 'investment_package',
            entityId: slab.id,
            field: 'all',
            oldValue: null,
            newValue: JSON.stringify(data),
            changedBy: this.adminId,
            reason: reason || 'Created new cash reward slab',
          },
          { client: trx }
        )
      }

      return slab
    })
  }

  async deleteCashRewardSlab(id: number, reason?: string) {
    return db.transaction(async (trx) => {
      const slab = await InvestmentPackage.query({ client: trx }).where('id', id).firstOrFail()
      await this.auditTx(
        trx,
        'investment_package',
        slab.id,
        'deleted',
        JSON.stringify(slab.serialize()),
        '',
        reason || 'Slab removed'
      )
      await slab.useTransaction(trx).delete()
    })
  }

  private async auditTx(
    trx: any,
    entityType: string,
    entityId: number,
    field: string,
    oldValue: string | null,
    newValue: string,
    reason?: string
  ) {
    await AuditLog.create(
      {
        entityType,
        entityId,
        field,
        oldValue,
        newValue,
        changedBy: this.adminId,
        reason: reason || undefined,
      },
      { client: trx }
    )
  }

  // ─── Membership Level Income ──────────────────────────────────

  async getMembershipLevels() {
    return MembershipLevelIncome.query().orderBy('level', 'asc')
  }

  async upsertMembershipLevel(
    data: {
      id?: number
      level: number
      percentage: number
      isActive: boolean
    },
    reason?: string
  ) {
    return db.transaction(async (trx) => {
      const record = data.id
        ? await MembershipLevelIncome.query({ client: trx }).where('id', data.id).firstOrFail()
        : new MembershipLevelIncome()

      if (data.id) {
        if (record.percentage !== data.percentage)
          await this.auditTx(
            trx,
            'membership_level_income',
            record.id,
            'percentage',
            String(record.percentage),
            String(data.percentage),
            reason
          )
        if (record.isActive !== data.isActive)
          await this.auditTx(
            trx,
            'membership_level_income',
            record.id,
            'is_active',
            String(record.isActive),
            String(data.isActive),
            reason
          )
      }

      record.level = data.level
      record.percentage = data.percentage
      record.isActive = data.isActive
      await record.useTransaction(trx).save()

      if (!data.id) {
        await AuditLog.create(
          {
            entityType: 'membership_level_income',
            entityId: record.id,
            field: 'all',
            oldValue: null,
            newValue: JSON.stringify(data),
            changedBy: this.adminId,
            reason: reason || 'Created',
          },
          { client: trx }
        )
      }

      return record
    })
  }

  // ─── Level Income ─────────────────────────────────────────────

  async getLevelIncomes() {
    return LevelIncome.query().orderBy('level', 'asc')
  }

  async upsertLevelIncome(
    data: {
      id?: number
      level: number
      percentage: number
      minDirects: number
      isActive: boolean
    },
    reason?: string
  ) {
    return db.transaction(async (trx) => {
      const record = data.id
        ? await LevelIncome.query({ client: trx }).where('id', data.id).firstOrFail()
        : new LevelIncome()

      if (data.id) {
        if (record.percentage !== data.percentage)
          await this.auditTx(
            trx,
            'level_income',
            record.id,
            'percentage',
            String(record.percentage),
            String(data.percentage),
            reason
          )
        if (record.minDirects !== data.minDirects)
          await this.auditTx(
            trx,
            'level_income',
            record.id,
            'min_directs',
            String(record.minDirects),
            String(data.minDirects),
            reason
          )
        if (record.isActive !== data.isActive)
          await this.auditTx(
            trx,
            'level_income',
            record.id,
            'is_active',
            String(record.isActive),
            String(data.isActive),
            reason
          )
      }

      record.level = data.level
      record.percentage = data.percentage
      record.minDirects = data.minDirects
      record.isActive = data.isActive
      await record.useTransaction(trx).save()

      if (!data.id) {
        await AuditLog.create(
          {
            entityType: 'level_income',
            entityId: record.id,
            field: 'all',
            oldValue: null,
            newValue: JSON.stringify(data),
            changedBy: this.adminId,
            reason: reason || 'Created',
          },
          { client: trx }
        )
      }

      return record
    })
  }

  // ─── Performance Incentives ───────────────────────────────────

  async getPerformanceIncentives() {
    return PerformanceIncentive.query().orderBy('sort_order', 'asc')
  }

  async upsertPerformanceIncentive(
    data: {
      id?: number
      title: string
      businessTarget: number
      rewardAmount: number
      sortOrder: number
      isActive: boolean
    },
    reason?: string
  ) {
    return db.transaction(async (trx) => {
      const record = data.id
        ? await PerformanceIncentive.query({ client: trx }).where('id', data.id).firstOrFail()
        : new PerformanceIncentive()

      if (data.id) {
        if (record.title !== data.title)
          await this.auditTx(
            trx,
            'performance_incentive',
            record.id,
            'title',
            record.title,
            data.title,
            reason
          )
        if (record.businessTarget !== data.businessTarget)
          await this.auditTx(
            trx,
            'performance_incentive',
            record.id,
            'business_target',
            String(record.businessTarget),
            String(data.businessTarget),
            reason
          )
        if (record.rewardAmount !== data.rewardAmount)
          await this.auditTx(
            trx,
            'performance_incentive',
            record.id,
            'reward_amount',
            String(record.rewardAmount),
            String(data.rewardAmount),
            reason
          )
        if (record.isActive !== data.isActive)
          await this.auditTx(
            trx,
            'performance_incentive',
            record.id,
            'is_active',
            String(record.isActive),
            String(data.isActive),
            reason
          )
      }

      record.title = data.title
      record.businessTarget = data.businessTarget
      record.rewardAmount = data.rewardAmount
      record.sortOrder = data.sortOrder
      record.isActive = data.isActive
      await record.useTransaction(trx).save()

      if (!data.id) {
        await AuditLog.create(
          {
            entityType: 'performance_incentive',
            entityId: record.id,
            field: 'all',
            oldValue: null,
            newValue: JSON.stringify(data),
            changedBy: this.adminId,
            reason: reason || 'Created',
          },
          { client: trx }
        )
      }

      return record
    })
  }

  // ─── Business Rules Config ────────────────────────────────────

  async getBusinessRules() {
    return PlatformConfig.query().where('group', 'business_rules').orderBy('key', 'asc')
  }

  async updateBusinessRules(data: Record<string, string>, reason?: string) {
    const keys = [
      'min_gold_purchase_amount',
      'min_withdrawal_amount',
      'withdrawal_processing_days',
      'wallet_transfer_limit',
      'gold_purchase_self_min',
      'activation_amount',
      'deposit_auto_approve',
    ]
    const updates: Record<string, string> = {}
    for (const key of keys) {
      if (data[key] !== undefined) {
        updates[key] = data[key]
      }
    }
    await this.bulkUpdateConfigs(updates, 'business_rules', reason)
  }

  // ─── Audit Log Viewer ─────────────────────────────────────────

  async getAuditLogs(page = 1, limit = 50) {
    return AuditLog.getAllHistory(page, limit)
  }
}

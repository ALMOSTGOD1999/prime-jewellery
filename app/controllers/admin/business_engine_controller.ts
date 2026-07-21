import type { HttpContext } from '@adonisjs/core/http'
import BusinessEngineService from '#services/business_engine_service'
import { BE_PASSWORD } from '#middleware/business_engine_middleware'
import { paginationValidator } from '#validators/common_validator'

export default class BusinessEngineController {
  // ─── Password Gate ──────────────────────────────────────────

  async gate({ inertia }: HttpContext) {
    return inertia.render('admin/business-engine/gate')
  }

  async authenticate({ request, session, response }: HttpContext) {
    const { password } = request.only(['password'])
    if (password === BE_PASSWORD) {
      session.put('be_authenticated', true)
      return response.redirect('/admin/system/advanced/business-engine')
    }
    session.flash('errors.be_password', 'Invalid password')
    return response.redirect().back()
  }

  // ─── Main Dashboard ──────────────────────────────────────────

  async index({ inertia, auth }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)

    const [
      goldConfig,
      incomeConfig,
      cashRewardSlabs,
      membershipLevels,
      levelIncomes,
      performanceIncentives,
      businessRules,
    ] = await Promise.all([
      be.getGoldPurchaseConfig(),
      be.getIncomeDistributionConfig(),
      be.getCashRewardSlabs(),
      be.getMembershipLevels(),
      be.getLevelIncomes(),
      be.getPerformanceIncentives(),
      be.getBusinessRules(),
    ])

    return inertia.render('admin/business-engine/index', {
      goldConfig: goldConfig.reduce((acc: Record<string, string>, c: any) => {
        acc[c.key] = c.value
        return acc
      }, {}),
      incomeConfig: incomeConfig.reduce((acc: Record<string, string>, c: any) => {
        acc[c.key] = c.value
        return acc
      }, {}),
      cashRewardSlabs: cashRewardSlabs.map((s) => s.serialize()),
      membershipLevels: membershipLevels.map((l) => l.serialize()),
      levelIncomes: levelIncomes.map((l) => l.serialize()),
      performanceIncentives: performanceIncentives.map((p) => p.serialize()),
      businessRules: businessRules.reduce((acc: Record<string, string>, c: any) => {
        acc[c.key] = c.value
        return acc
      }, {}),
    })
  }

  // ─── Gold Purchase Config ────────────────────────────────────

  async updateGoldConfig({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason || 'Gold config updated via Business Engine'
    delete data._reason

    try {
      await be.updateGoldConfig(data, reason)
      session.flash('success', 'Gold purchase configuration updated')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Income Distribution ─────────────────────────────────────

  async updateIncomeDistribution({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason || 'Income distribution updated via Business Engine'
    delete data._reason

    try {
      await be.updateIncomeDistribution(data, reason)
      session.flash('success', 'Income distribution updated')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Cash Reward Slabs ────────────────────────────────────────

  async upsertCashRewardSlab({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason
    delete data._reason

    try {
      await be.upsertCashRewardSlab(
        {
          id: data.id ? Number(data.id) : undefined,
          name: data.name,
          minAmount: Number(data.minAmount),
          maxAmount: data.maxAmount ? Number(data.maxAmount) : null,
          monthlyReturnPercent: Number(data.monthlyReturnPercent),
          maxReturnPercent: Number(data.maxReturnPercent),
          sortOrder: Number(data.sortOrder),
          isActive: data.isActive === 'true' || data.isActive === true,
        },
        reason
      )
      session.flash('success', data.id ? 'Cash reward slab updated' : 'Cash reward slab created')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  async deleteCashRewardSlab({ auth, params, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const { reason } = request.only(['reason'])

    try {
      await be.deleteCashRewardSlab(params.id, reason)
      session.flash('success', 'Cash reward slab removed')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Membership Level Income ─────────────────────────────────

  async upsertMembershipLevel({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason
    delete data._reason

    try {
      await be.upsertMembershipLevel(
        {
          id: data.id ? Number(data.id) : undefined,
          level: Number(data.level),
          percentage: Number(data.percentage),
          isActive: data.isActive === 'true' || data.isActive === true,
        },
        reason
      )
      session.flash('success', data.id ? 'Membership level updated' : 'Membership level created')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Level Income ─────────────────────────────────────────────

  async upsertLevelIncome({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason
    delete data._reason

    try {
      await be.upsertLevelIncome(
        {
          id: data.id ? Number(data.id) : undefined,
          level: Number(data.level),
          percentage: Number(data.percentage),
          minDirects: Number(data.minDirects),
          isActive: data.isActive === 'true' || data.isActive === true,
        },
        reason
      )
      session.flash('success', data.id ? 'Level income updated' : 'Level income created')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Performance Incentives ──────────────────────────────────

  async upsertPerformanceIncentive({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason
    delete data._reason

    try {
      await be.upsertPerformanceIncentive(
        {
          id: data.id ? Number(data.id) : undefined,
          title: data.title,
          businessTarget: Number(data.businessTarget),
          rewardAmount: Number(data.rewardAmount),
          sortOrder: Number(data.sortOrder),
          isActive: data.isActive === 'true' || data.isActive === true,
        },
        reason
      )
      session.flash(
        'success',
        data.id ? 'Performance incentive updated' : 'Performance incentive created'
      )
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Business Rules ───────────────────────────────────────────

  async updateBusinessRules({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const data = request.all()
    const reason = data._reason || 'Business rules updated via Business Engine'
    delete data._reason

    try {
      await be.updateBusinessRules(data, reason)
      session.flash('success', 'Business rules updated')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  // ─── Audit Log Viewer ─────────────────────────────────────────

  async auditLog({ inertia, auth, request }: HttpContext) {
    const admin = auth.getUserOrFail()
    const be = new BusinessEngineService(admin.id)
    const { page = 1, limit = 50 } = await paginationValidator.validate(request.qs())

    const logs = await be.getAuditLogs(page, limit)

    return inertia.render('admin/business-engine/audit', {
      logs: {
        meta: logs.getMeta(),
        data: logs.serialize().data.map((l: any) => ({
          id: l.id,
          entityType: l.entityType,
          entityId: l.entityId,
          field: l.field,
          oldValue: l.oldValue,
          newValue: l.newValue,
          reason: l.reason,
          createdAt: l.createdAt,
          changer: l.changer ? { id: l.changer.id, name: l.changer.name } : null,
        })),
      },
    })
  }
}

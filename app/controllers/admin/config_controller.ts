import type { HttpContext } from '@adonisjs/core/http'
import PlatformConfig from '#models/platform_config'
import InvestmentPackage from '#models/investment_package'
import PerformanceIncentive from '#models/performance_incentive'
import RewardAward from '#models/reward_award'
import MembershipLevelIncome from '#models/membership_level_income'
import LevelIncome from '#models/level_income'

export default class AdminConfigController {
  async investmentPackages({ inertia }: HttpContext) {
    const packages = await InvestmentPackage.query().orderBy('sort_order', 'asc')
    return inertia.render('admin/config/investment_packages', { packages })
  }

  async updateInvestmentPackage({ request, response }: HttpContext) {
    const {
      id,
      name,
      minAmount,
      maxAmount,
      monthlyReturnPercent,
      maxReturnPercent,
      sortOrder,
      isActive,
    } = request.all()
    const pkg = id ? await InvestmentPackage.findOrFail(id) : new InvestmentPackage()
    if (name) pkg.name = name
    if (minAmount !== undefined) pkg.minAmount = Number(minAmount)
    if (maxAmount !== undefined) pkg.maxAmount = maxAmount ? Number(maxAmount) : null
    if (monthlyReturnPercent !== undefined) pkg.monthlyReturnPercent = Number(monthlyReturnPercent)
    if (maxReturnPercent !== undefined) pkg.maxReturnPercent = Number(maxReturnPercent)
    if (sortOrder !== undefined) pkg.sortOrder = Number(sortOrder)
    if (isActive !== undefined) pkg.isActive = Boolean(isActive)
    await pkg.save()
    return response.redirect().back()
  }

  async performanceIncentives({ inertia }: HttpContext) {
    const incentives = await PerformanceIncentive.query().orderBy('sort_order', 'asc')
    return inertia.render('admin/config/performance_incentives', { incentives })
  }

  async updatePerformanceIncentive({ request, response }: HttpContext) {
    const { id, title, businessTarget, rewardAmount, sortOrder, isActive } = request.all()
    const incentive = id ? await PerformanceIncentive.findOrFail(id) : new PerformanceIncentive()
    if (title) incentive.title = title
    if (businessTarget !== undefined) incentive.businessTarget = Number(businessTarget)
    if (rewardAmount !== undefined) incentive.rewardAmount = Number(rewardAmount)
    if (sortOrder !== undefined) incentive.sortOrder = Number(sortOrder)
    if (isActive !== undefined) incentive.isActive = Boolean(isActive)
    await incentive.save()
    return response.redirect().back()
  }

  async rewardAwards({ inertia }: HttpContext) {
    const awards = await RewardAward.query().orderBy('sort_order', 'asc')
    return inertia.render('admin/config/reward_awards', { awards })
  }

  async updateRewardAward({ request, response }: HttpContext) {
    const { id, title, businessTarget, rewardDescription, sortOrder, isActive } = request.all()
    const award = id ? await RewardAward.findOrFail(id) : new RewardAward()
    if (title) award.title = title
    if (businessTarget !== undefined) award.businessTarget = Number(businessTarget)
    if (rewardDescription !== undefined) award.rewardDescription = rewardDescription
    if (sortOrder !== undefined) award.sortOrder = Number(sortOrder)
    if (isActive !== undefined) award.isActive = Boolean(isActive)
    await award.save()
    return response.redirect().back()
  }

  async membershipLevelIncomes({ inertia }: HttpContext) {
    const levels = await MembershipLevelIncome.query().orderBy('level', 'asc')
    return inertia.render('admin/config/membership_level_incomes', { levels })
  }

  async updateMembershipLevelIncome({ request, response }: HttpContext) {
    const { id, level, percentage, isActive } = request.all()
    const record = id ? await MembershipLevelIncome.findOrFail(id) : new MembershipLevelIncome()
    if (level !== undefined) record.level = Number(level)
    if (percentage !== undefined) record.percentage = Number(percentage)
    if (isActive !== undefined) record.isActive = Boolean(isActive)
    await record.save()
    return response.redirect().back()
  }

  async levelIncomes({ inertia }: HttpContext) {
    const levels = await LevelIncome.query().orderBy('level', 'asc')
    return inertia.render('admin/config/level_incomes', { levels })
  }

  async updateLevelIncome({ request, response }: HttpContext) {
    const { id, level, percentage, minDirects, isActive } = request.all()
    const record = id ? await LevelIncome.findOrFail(id) : new LevelIncome()
    if (level !== undefined) record.level = Number(level)
    if (percentage !== undefined) record.percentage = Number(percentage)
    if (minDirects !== undefined) record.minDirects = Number(minDirects)
    if (isActive !== undefined) record.isActive = Boolean(isActive)
    await record.save()
    return response.redirect().back()
  }

  async platformSettings({ inertia }: HttpContext) {
    const configs = await PlatformConfig.query().orderBy('group', 'asc').orderBy('key', 'asc')
    return inertia.render('admin/config/platform_settings', { configs })
  }

  async updatePlatformSetting({ request, response }: HttpContext) {
    const { key, value } = request.all()
    if (!key) return response.status(400).send({ error: 'Key is required' })
    await PlatformConfig.set(key, String(value))
    return response.redirect().back()
  }

  async goldBilling({ inertia }: HttpContext) {
    const configs = await PlatformConfig.query()
      .where('group', 'gold_billing')
      .orderBy('key', 'asc')
    return inertia.render('admin/config/gold_billing', { configs })
  }

  async updateGoldBilling({ request, response, session }: HttpContext) {
    const data = request.all()
    const keys = [
      'gold_rate_18ct',
      'gold_rate_22ct',
      'gold_rate_24ct',
      'gold_making_charge_percent',
      'gold_gst_percent',
      'gold_hallmark_additional_percent',
    ]

    for (const key of keys) {
      if (data[key] !== undefined) {
        await PlatformConfig.set(key, String(data[key]), 'gold_billing')
      }
    }

    session.flash('success', 'Gold billing rates updated successfully')
    return response.redirect().back()
  }
}

import { BaseSeeder } from '@adonisjs/lucid/seeders'
import PlatformConfig from '#models/platform_config'
import InvestmentPackage from '#models/investment_package'
import PerformanceIncentive from '#models/performance_incentive'
import RewardAward from '#models/reward_award'
import MembershipLevelIncome from '#models/membership_level_income'
import LevelIncome from '#models/level_income'
import TeamBusinessLevel from '#models/team_business_level'

export default class extends BaseSeeder {
  async run() {
    // ─── Investment Packages (3 tiers) ───
    await InvestmentPackage.createMany([
      {
        name: 'Silver Plan',
        minAmount: 10000,
        maxAmount: 199000,
        monthlyReturnPercent: 3,
        maxReturnPercent: 100,
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Gold Plan',
        minAmount: 200000,
        maxAmount: 499000,
        monthlyReturnPercent: 3.5,
        maxReturnPercent: 100,
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Platinum Plan',
        minAmount: 500000,
        maxAmount: null,
        monthlyReturnPercent: 4,
        maxReturnPercent: 100,
        sortOrder: 3,
        isActive: true,
      },
    ])

    // ─── Performance Incentives (60:40 business accumulation) ───
    await PerformanceIncentive.createMany([
      { title: 'Starter', businessTarget: 500000, rewardAmount: 1999, sortOrder: 1, isActive: true },
      { title: 'Bronze', businessTarget: 1000000, rewardAmount: 3499, sortOrder: 2, isActive: true },
      {
        title: 'Silver',
        businessTarget: 2500000,
        rewardAmount: 9999,
        sortOrder: 3,
        isActive: true,
      },
      { title: 'Gold', businessTarget: 5000000, rewardAmount: 19499, sortOrder: 4, isActive: true },
      {
        title: 'Emerald',
        businessTarget: 10000000,
        rewardAmount: 39999,
        sortOrder: 5,
        isActive: true,
      },
      {
        title: 'Ruby',
        businessTarget: 30000000,
        rewardAmount: 79999,
        sortOrder: 6,
        isActive: true,
      },
      {
        title: 'Sapphire',
        businessTarget: 50000000,
        rewardAmount: 129999,
        sortOrder: 7,
        isActive: true,
      },
      {
        title: 'Topaz',
        businessTarget: 100000000,
        rewardAmount: 199999,
        sortOrder: 8,
        isActive: true,
      },
      {
        title: 'Diamond',
        businessTarget: 250000000,
        rewardAmount: 259999,
        sortOrder: 9,
        isActive: true,
      },
      {
        title: 'B Diamond',
        businessTarget: 500000000,
        rewardAmount: 449999,
        sortOrder: 10,
        isActive: true,
      },
      {
        title: 'C Diamond',
        businessTarget: 1000000000,
        rewardAmount: 799999,
        sortOrder: 11,
        isActive: true,
      },
      {
        title: 'R Diamond',
        businessTarget: 3000000000,
        rewardAmount: 1499999,
        sortOrder: 12,
        isActive: true,
      },
      {
        title: 'Crown',
        businessTarget: 8000000000,
        rewardAmount: 2999999,
        sortOrder: 13,
        isActive: true,
      },
      {
        title: 'Royal',
        businessTarget: 12000000000,
        rewardAmount: 4999999,
        sortOrder: 14,
        isActive: true,
      },
      {
        title: 'Elite',
        businessTarget: 17000000000,
        rewardAmount: 7999999,
        sortOrder: 15,
        isActive: true,
      },
    ])

    // ─── Reward & Award Program (17 tiers) ───
    await RewardAward.createMany([
      {
        title: 'EV Scooter',
        businessTarget: 10000000,
        rewardDescription: 'Electric Scooter',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Premium Motorcycle',
        businessTarget: 30000000,
        rewardDescription: 'Premium Motorcycle',
        sortOrder: 2,
        isActive: true,
      },
      {
        title: 'Four-Wheeler',
        businessTarget: 50000000,
        rewardDescription: 'Premium Four-Wheeler',
        sortOrder: 3,
        isActive: true,
      },
      {
        title: 'Premium Four-Wheeler',
        businessTarget: 100000000,
        rewardDescription: 'Another Premium Four-Wheeler',
        sortOrder: 4,
        isActive: true,
      },
      {
        title: 'XUV Vehicle',
        businessTarget: 200000000,
        rewardDescription: 'XUV Vehicle',
        sortOrder: 5,
        isActive: true,
      },
      {
        title: '2-Bedroom Flat',
        businessTarget: 500000000,
        rewardDescription: 'Two-Bedroom Flat',
        sortOrder: 6,
        isActive: true,
      },
      {
        title: '2-Bedroom Bungalow',
        businessTarget: 1000000000,
        rewardDescription: 'Two-Bedroom Bungalow',
        sortOrder: 7,
        isActive: true,
      },
      {
        title: 'Fortuner SUV',
        businessTarget: 3000000000,
        rewardDescription: 'Fortuner SUV',
        sortOrder: 8,
        isActive: true,
      },
      {
        title: 'Mercedes + 50g Gold',
        businessTarget: 8000000000,
        rewardDescription: 'Mercedes Car + 50 Grams Gold',
        sortOrder: 9,
        isActive: true,
      },
      {
        title: 'Audi + 100g Gold',
        businessTarget: 12000000000,
        rewardDescription: 'Audi Car + 100 Grams Gold',
        sortOrder: 10,
        isActive: true,
      },
      {
        title: 'BMW + 200g Gold',
        businessTarget: 17000000000,
        rewardDescription: 'BMW Car + 200 Grams Gold',
        sortOrder: 11,
        isActive: true,
      },
      {
        title: 'Jaguar + 300g Gold',
        businessTarget: 25000000000,
        rewardDescription: 'Jaguar Car + 300 Grams Gold',
        sortOrder: 12,
        isActive: true,
      },
      {
        title: 'Fully Paid 2BHK Flat',
        businessTarget: 35000000000,
        rewardDescription: 'Fully Paid Two-Bedroom Flat',
        sortOrder: 13,
        isActive: true,
      },
      {
        title: 'Fully Paid 3BHK Flat',
        businessTarget: 50000000000,
        rewardDescription: 'Fully Paid Three-Bedroom Flat',
        sortOrder: 14,
        isActive: true,
      },
      {
        title: '2 KG Gold',
        businessTarget: 80000000000,
        rewardDescription: 'Two Kilograms of Gold',
        sortOrder: 15,
        isActive: true,
      },
      {
        title: '3 KG Gold',
        businessTarget: 100000000000,
        rewardDescription: 'Three Kilograms of Gold',
        sortOrder: 16,
        isActive: true,
      },
    ])

    // ─── Membership Level Income (15 levels) ───
    await MembershipLevelIncome.createMany([
      { level: 1, percentage: 10, isActive: true },
      { level: 2, percentage: 5, isActive: true },
      { level: 3, percentage: 2, isActive: true },
      { level: 4, percentage: 1, isActive: true },
      { level: 5, percentage: 0.5, isActive: true },
      { level: 6, percentage: 0.5, isActive: true },
      { level: 7, percentage: 0.25, isActive: true },
      { level: 8, percentage: 0.25, isActive: true },
      { level: 9, percentage: 0.25, isActive: true },
      { level: 10, percentage: 0.25, isActive: true },
      { level: 11, percentage: 0.1, isActive: true },
      { level: 12, percentage: 0.1, isActive: true },
      { level: 13, percentage: 0.1, isActive: true },
      { level: 14, percentage: 0.1, isActive: true },
      { level: 15, percentage: 0.1, isActive: true },
    ])

    // ─── Level Income System (24 levels, unlocked by direct referrals + team business) ───
    // Unlock rules (direct referrals + team business level):
    // 1 direct → levels 1-2
    // 2 directs + 2-level team business → levels 1-4
    // 3 directs + 5-level team business → levels 1-8
    // 4 directs + 10-level team business → levels 1-12
    // 5 directs + 15-level team business → levels 1-16
    // 6 directs + 25-level team business → levels 1-24
    // Percentages: L1 1%, L2 0.5%, L3 0.2%, L4-7 0.15%, L8-11 0.10%, L12-19 0.05%, L20-24 0.02%
    const levelIncomeData: Array<{
      level: number
      percentage: number
      minDirects: number
      minTeamBusinessLevel: number
      isActive: boolean
    }> = []
    const levelRules = [
      { maxLevel: 2, minDirects: 1, minTeamBusinessLevel: 1 },
      { maxLevel: 4, minDirects: 2, minTeamBusinessLevel: 2 },
      { maxLevel: 8, minDirects: 3, minTeamBusinessLevel: 5 },
      { maxLevel: 12, minDirects: 4, minTeamBusinessLevel: 10 },
      { maxLevel: 16, minDirects: 5, minTeamBusinessLevel: 15 },
      { maxLevel: 24, minDirects: 6, minTeamBusinessLevel: 25 },
    ]
    for (const rule of levelRules) {
      for (let l = 1; l <= 24; l++) {
        if (l > rule.maxLevel) continue
        const existing = levelIncomeData.find((x) => x.level === l)
        if (existing) continue
        let percentage = 0.02
        if (l === 1) percentage = 1
        else if (l === 2) percentage = 0.5
        else if (l === 3) percentage = 0.2
        else if (l >= 4 && l <= 7) percentage = 0.15
        else if (l >= 8 && l <= 11) percentage = 0.1
        else if (l >= 12 && l <= 19) percentage = 0.05
        levelIncomeData.push({
          level: l,
          percentage,
          minDirects: rule.minDirects,
          minTeamBusinessLevel: rule.minTeamBusinessLevel,
          isActive: true,
        })
      }
    }
    await LevelIncome.createMany(levelIncomeData)

    // ─── Team Business Levels (25 levels, thresholds in INR) ───
    // Default scale — editable via Business Engine. Level N requires min_team_business.
    await TeamBusinessLevel.createMany(
      Array.from({ length: 25 }, (_, i) => {
        const level = i + 1
        let minBusiness = 0
        if (level === 1) minBusiness = 0
        else if (level === 2) minBusiness = 100000
        else if (level === 3) minBusiness = 200000
        else if (level === 4) minBusiness = 350000
        else if (level === 5) minBusiness = 500000
        else if (level === 6) minBusiness = 700000
        else if (level === 7) minBusiness = 900000
        else if (level === 8) minBusiness = 1200000
        else if (level === 9) minBusiness = 1500000
        else if (level === 10) minBusiness = 1800000
        else minBusiness = 1800000 + (level - 10) * 400000
        return { level, minBusiness, isActive: true }
      })
    )

    // ─── Platform Configs ───
    const configs: Array<{
      key: string
      value: string
      group: string
      label: string
      description: string
    }> = [
      // Wallet Configs
      {
        key: 'wallet_working_threshold',
        value: '50000',
        group: 'wallet',
        label: 'Working Wallet Threshold',
        description: 'Auto-transfer threshold for Working Wallet to Repurchase Wallet',
      },
      {
        key: 'wallet_repurchase_percent',
        value: '20',
        group: 'wallet',
        label: 'Repurchase Wallet Transfer %',
        description: 'Percentage of future earnings transferred to Repurchase Wallet',
      },

      // Withdrawal Configs
      {
        key: 'withdrawal_admin_charge',
        value: '8',
        group: 'withdrawal',
        label: 'Admin Service Charge %',
        description: 'Administrative service charge on withdrawals',
      },
      {
        key: 'withdrawal_tds_percent',
        value: '2',
        group: 'withdrawal',
        label: 'TDS Deduction %',
        description: 'TDS deduction percentage on withdrawals',
      },
      {
        key: 'withdrawal_min_amount',
        value: '200',
        group: 'withdrawal',
        label: 'Minimum Withdrawal Amount',
        description: 'Minimum withdrawal amount in INR',
      },

      // Processing Dates
      {
        key: 'processing_monthly_rewards_day',
        value: '30',
        group: 'processing',
        label: 'Monthly Reward Processing Day',
        description: 'Day of month for monthly reward processing',
      },
      {
        key: 'processing_cashback_day',
        value: '10',
        group: 'processing',
        label: 'Cashback Reward Processing Day',
        description: 'Day of month for cashback reward processing',
      },
      {
        key: 'processing_working_income_start',
        value: '15',
        group: 'processing',
        label: 'Working Income Credit Start Day',
        description: 'Start day for working income credit',
      },
      {
        key: 'processing_working_income_end',
        value: '20',
        group: 'processing',
        label: 'Working Income Credit End Day',
        description: 'End day for working income credit',
      },

      // Membership Gift
      {
        key: 'membership_gift_amount',
        value: '1000',
        group: 'gift',
        label: 'Membership Gift Amount',
        description: 'Gift amount for new registered members',
      },
      {
        key: 'membership_gift_description',
        value: 'Branded PRIME Jewellery Bag',
        group: 'gift',
        label: 'Membership Gift Description',
        description: 'Description of the membership gift',
      },

      // Gold Billing Rates & Charges
      {
        key: 'gold_rate_18ct',
        value: '5200',
        group: 'gold_billing',
        label: 'Gold Rate 18 CT (per gram)',
        description: 'Gold rate for 18 carat in INR per gram',
      },
      {
        key: 'gold_rate_22ct',
        value: '6200',
        group: 'gold_billing',
        label: 'Gold Rate 22 CT (per gram)',
        description: 'Gold rate for 22 carat in INR per gram',
      },
      {
        key: 'gold_rate_24ct',
        value: '6800',
        group: 'gold_billing',
        label: 'Gold Rate 24 CT (per gram)',
        description: 'Gold rate for 24 carat in INR per gram',
      },
      {
        key: 'gold_making_charge_percent',
        value: '12',
        group: 'gold_billing',
        label: 'Making Charge %',
        description: 'Making charge percentage applied on gold price',
      },
      {
        key: 'gold_gst_percent',
        value: '3',
        group: 'gold_billing',
        label: 'GST %',
        description: 'GST percentage applied on (gold price + making charges)',
      },
      {
        key: 'gold_hallmark_additional_percent',
        value: '2',
        group: 'gold_billing',
        label: 'Hallmark & Additional %',
        description: 'Merged hallmark and additional charges: 2% of (gold price + making charges)',
      },
    ]

    for (const config of configs) {
      await PlatformConfig.set(
        config.key,
        config.value,
        config.group,
        config.label,
        config.description
      )
    }

    console.log('✅ Platform setup seeded successfully!')
  }
}

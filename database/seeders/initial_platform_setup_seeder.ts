import { BaseSeeder } from '@adonisjs/lucid/seeders'
import PlatformConfig from '#models/platform_config'
import InvestmentPackage from '#models/investment_package'
import PerformanceIncentive from '#models/performance_incentive'
import RewardAward from '#models/reward_award'
import MembershipLevelIncome from '#models/membership_level_income'
import LevelIncome from '#models/level_income'

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
      { title: 'Starter', businessTarget: 200000, rewardAmount: 999, sortOrder: 1, isActive: true },
      { title: 'Bronze', businessTarget: 500000, rewardAmount: 2499, sortOrder: 2, isActive: true },
      {
        title: 'Silver',
        businessTarget: 1000000,
        rewardAmount: 5499,
        sortOrder: 3,
        isActive: true,
      },
      { title: 'Gold', businessTarget: 2500000, rewardAmount: 15999, sortOrder: 4, isActive: true },
      {
        title: 'Platinum',
        businessTarget: 5000000,
        rewardAmount: 24999,
        sortOrder: 5,
        isActive: true,
      },
      {
        title: 'Emerald',
        businessTarget: 10000000,
        rewardAmount: 51999,
        sortOrder: 6,
        isActive: true,
      },
      {
        title: 'Ruby',
        businessTarget: 30000000,
        rewardAmount: 105999,
        sortOrder: 7,
        isActive: true,
      },
      {
        title: 'Sapphire',
        businessTarget: 50000000,
        rewardAmount: 154999,
        sortOrder: 8,
        isActive: true,
      },
      {
        title: 'Topaz',
        businessTarget: 100000000,
        rewardAmount: 254999,
        sortOrder: 9,
        isActive: true,
      },
      {
        title: 'Diamond',
        businessTarget: 200000000,
        rewardAmount: 509999,
        sortOrder: 10,
        isActive: true,
      },
      {
        title: 'Black Diamond',
        businessTarget: 500000000,
        rewardAmount: 824999,
        sortOrder: 11,
        isActive: true,
      },
      {
        title: 'Crown Diamond',
        businessTarget: 1000000000,
        rewardAmount: 1249999,
        sortOrder: 12,
        isActive: true,
      },
      {
        title: 'Royal Diamond',
        businessTarget: 3000000000,
        rewardAmount: 2999999,
        sortOrder: 13,
        isActive: true,
      },
      {
        title: 'Crown',
        businessTarget: 8000000000,
        rewardAmount: 4949999,
        sortOrder: 14,
        isActive: true,
      },
      {
        title: 'Royal',
        businessTarget: 12000000000,
        rewardAmount: 7499999,
        sortOrder: 15,
        isActive: true,
      },
      {
        title: 'Elite',
        businessTarget: 17000000000,
        rewardAmount: 9999999,
        sortOrder: 16,
        isActive: true,
      },
      {
        title: 'Legend',
        businessTarget: 25000000000,
        rewardAmount: 14999999,
        sortOrder: 17,
        isActive: true,
      },
      {
        title: 'Supreme',
        businessTarget: 35000000000,
        rewardAmount: 19999999,
        sortOrder: 18,
        isActive: true,
      },
      {
        title: 'Master',
        businessTarget: 50000000000,
        rewardAmount: 24000000,
        sortOrder: 19,
        isActive: true,
      },
      {
        title: 'Emperor',
        businessTarget: 80000000000,
        rewardAmount: 34999999,
        sortOrder: 20,
        isActive: true,
      },
      {
        title: 'King',
        businessTarget: 100000000000,
        rewardAmount: 49999999,
        sortOrder: 21,
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

    // ─── Membership Level Income (10 levels) ───
    await MembershipLevelIncome.createMany([
      { level: 1, percentage: 10, isActive: true },
      { level: 2, percentage: 5, isActive: true },
      { level: 3, percentage: 1, isActive: true },
      { level: 4, percentage: 1, isActive: true },
      { level: 5, percentage: 0.5, isActive: true },
      { level: 6, percentage: 0.5, isActive: true },
      { level: 7, percentage: 1, isActive: true },
      { level: 8, percentage: 0.5, isActive: true },
      { level: 9, percentage: 0.5, isActive: true },
      { level: 10, percentage: 0.5, isActive: true },
    ])

    // ─── Level Income System (20 levels, unlocked by direct referrals) ───
    // Unlock rules:
    // 1 direct → levels 1-2, 2 directs → levels 1-4, 3 directs → levels 1-8,
    // 4 directs → levels 1-12, 5+ directs → all 20 levels
    await LevelIncome.createMany([
      { level: 1, percentage: 1, minDirects: 1, isActive: true },
      { level: 2, percentage: 0.5, minDirects: 1, isActive: true },
      { level: 3, percentage: 0.2, minDirects: 2, isActive: true },
      { level: 4, percentage: 0.15, minDirects: 2, isActive: true },
      { level: 5, percentage: 0.15, minDirects: 3, isActive: true },
      { level: 6, percentage: 0.15, minDirects: 3, isActive: true },
      { level: 7, percentage: 0.15, minDirects: 3, isActive: true },
      { level: 8, percentage: 0.1, minDirects: 3, isActive: true },
      { level: 9, percentage: 0.1, minDirects: 4, isActive: true },
      { level: 10, percentage: 0.1, minDirects: 4, isActive: true },
      { level: 11, percentage: 0.1, minDirects: 4, isActive: true },
      { level: 12, percentage: 0.05, minDirects: 4, isActive: true },
      { level: 13, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 14, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 15, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 16, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 17, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 18, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 19, percentage: 0.05, minDirects: 5, isActive: true },
      { level: 20, percentage: 0.1, minDirects: 5, isActive: true },
    ])

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

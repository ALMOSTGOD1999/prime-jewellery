import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // 1. Reset stuck payout months to empty string
    await db
      .from('platform_configs')
      .where('key', 'income_wallet_payout_month')
      .update({ value: '' })
    await db
      .from('platform_configs')
      .where('key', 'working_wallet_payout_month')
      .update({ value: '' })

    // 2. Seed gold billing configs
    const goldConfigs = [
      {
        key: 'gold_jewellery_value_percent',
        value: '70',
        group: 'gold_purchase',
        label: 'Jewellery Value %',
      },
      {
        key: 'gold_making_charge_percent',
        value: '37.85',
        group: 'gold_purchase',
        label: 'Making Charge %',
      },
      { key: 'gold_gst_percent', value: '3', group: 'gold_purchase', label: 'GST %' },
      {
        key: 'gold_additional_charge_percent',
        value: '2',
        group: 'gold_purchase',
        label: 'Additional Charge %',
      },
      { key: 'gold_rate_source', value: 'live', group: 'gold_purchase', label: 'Rate Source' },
      {
        key: 'gold_rate_manual_override',
        value: '',
        group: 'gold_purchase',
        label: 'Manual Rate Override',
      },
    ]

    for (const config of goldConfigs) {
      const exists = await db.from('platform_configs').where('key', config.key).first()
      if (exists) {
        if (!exists.value) {
          await db.from('platform_configs').where('key', config.key).update({
            value: config.value,
            group: config.group,
            label: config.label,
          })
        }
      } else {
        await db.table('platform_configs').insert(config)
      }
    }

    // 3. Seed income distribution configs
    const incomeConfigs = [
      {
        key: 'repurchase_wallet_percent',
        value: '20',
        group: 'income_distribution',
        label: 'Repurchase Wallet %',
      },
      {
        key: 'admin_charge_percent',
        value: '10',
        group: 'income_distribution',
        label: 'Admin Charge %',
      },
    ]

    for (const config of incomeConfigs) {
      const exists = await db.from('platform_configs').where('key', config.key).first()
      if (!exists) {
        await db.table('platform_configs').insert(config)
      }
    }

    // 4. Seed business rules
    const ruleConfigs = [
      {
        key: 'min_gold_purchase_amount',
        value: '10000',
        group: 'business_rules',
        label: 'Min Gold Purchase',
      },
      {
        key: 'min_withdrawal_amount',
        value: '500',
        group: 'business_rules',
        label: 'Min Withdrawal',
      },
      {
        key: 'withdrawal_processing_days',
        value: '7',
        group: 'business_rules',
        label: 'Withdrawal Days',
      },
      {
        key: 'wallet_transfer_limit',
        value: '50000',
        group: 'business_rules',
        label: 'Wallet Transfer Limit',
      },
      {
        key: 'activation_amount',
        value: '1000',
        group: 'business_rules',
        label: 'Activation Amount',
      },
    ]

    for (const config of ruleConfigs) {
      const exists = await db.from('platform_configs').where('key', config.key).first()
      if (!exists) {
        await db.table('platform_configs').insert(config)
      }
    }
  }

  async down() {}
}

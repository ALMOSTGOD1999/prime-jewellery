import PlatformConfig from '#models/platform_config'

export interface GoldBillingRates {
  rate18ct: number
  rate22ct: number
  rate24ct: number
  jewelleryValuePercent: number
  makingChargePercent: number
  gstPercent: number
  additionalChargePercent: number
}

export default class GoldBillingConfig {
  static async getRates(): Promise<GoldBillingRates> {
    const [
      rate18ct,
      rate22ct,
      rate24ct,
      jewelleryValuePercent,
      makingChargePercent,
      gstPercent,
      additionalChargePercent,
    ] = await Promise.all([
      PlatformConfig.getNumber('gold_rate_18ct', 5200),
      PlatformConfig.getNumber('gold_rate_22ct', 6200),
      PlatformConfig.getNumber('gold_rate_24ct', 6800),
      PlatformConfig.getNumber('gold_jewellery_value_percent', 70),
      PlatformConfig.getNumber('gold_making_charge_percent', 37.85),
      PlatformConfig.getNumber('gold_gst_percent', 3),
      PlatformConfig.getNumber('gold_additional_charge_percent', 2),
    ])

    return {
      rate18ct,
      rate22ct,
      rate24ct,
      jewelleryValuePercent,
      makingChargePercent,
      gstPercent,
      additionalChargePercent,
    }
  }

  static getRateForCarat(rates: GoldBillingRates, carat: string): number {
    switch (carat) {
      case '18ct':
        return rates.rate18ct
      case '22ct':
        return rates.rate22ct
      case '24ct':
        return rates.rate24ct
      default:
        return rates.rate22ct
    }
  }

  /**
   * Fully automatic calculation based on gold weight only.
   *
   * New Formula:
   *   Gold Value     = Weight × Rate per gram
   *   Investment     = Gold Value ÷ (jewelleryValuePercent / 100)
   *   GST            = (gstPercent / 100) × Gold Value
   *   Additional     = (additionalChargePercent / 100) × Gold Value
   *   Making         = Investment − Gold Value − GST − Additional
   *   Making %       = (Making / Gold Value) × 100
   *   Total Package  = Investment (same as Customer Investment)
   */
  static calculate(
    rates: GoldBillingRates,
    carat: string,
    weight: number
  ): {
    goldRate: number
    goldValue: number
    investment: number
    jewelleryValue: number
    makingCharges: number
    makingChargePercent: number
    gstAmount: number
    additionalCharges: number
    packageAmount: number
  } {
    const goldRate = this.getRateForCarat(rates, carat)
    const goldValue = goldRate * weight

    // Investment (Total Package) = Gold Value / jewelleryValuePercent
    const investment = goldValue / (rates.jewelleryValuePercent / 100)

    // Jewellery Value = Gold Value (the pure gold portion)
    const jewelleryValue = goldValue

    // GST & Additional are calculated on Gold Value only
    const gstAmount = (goldValue * rates.gstPercent) / 100
    const additionalCharges = (goldValue * rates.additionalChargePercent) / 100

    // Making Charge is the remainder so that Total = Investment
    const makingCharges = investment - goldValue - gstAmount - additionalCharges
    const makingChargePercent = goldValue > 0 ? (makingCharges / goldValue) * 100 : 0

    // Total Package = Investment (they are now the same)
    const packageAmount = investment

    const r = (n: number) => Math.round(n * 100) / 100

    return {
      goldRate,
      goldValue: r(goldValue),
      investment: r(investment),
      jewelleryValue: r(jewelleryValue),
      makingCharges: r(makingCharges),
      makingChargePercent: r(makingChargePercent),
      gstAmount: r(gstAmount),
      additionalCharges: r(additionalCharges),
      packageAmount: r(packageAmount),
    }
  }
}

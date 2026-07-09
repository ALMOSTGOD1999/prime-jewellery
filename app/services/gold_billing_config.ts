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
   * Formula:
   *   Gold Value   = Weight × Rate per gram
   *   Investment   = Gold Value ÷ (jewelleryValuePercent / 100)
   *   Making       = (makingChargePercent / 100) × Gold Value
   *   GST          = (gstPercent / 100) × Gold Value
   *   Additional   = (additionalChargePercent / 100) × Gold Value
   *   Total        = Gold Value + Making + GST + Additional
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
    gstAmount: number
    additionalCharges: number
    packageAmount: number
  } {
    const goldRate = this.getRateForCarat(rates, carat)
    const goldValue = goldRate * weight

    // Investment = Gold Value / (jewelleryValuePercent / 100)
    const investment = goldValue / (rates.jewelleryValuePercent / 100)

    // Jewellery Value = Gold Value (the pure gold portion)
    const jewelleryValue = goldValue

    // All charges are calculated on Gold Value only
    const makingCharges = (goldValue * rates.makingChargePercent) / 100
    const gstAmount = (goldValue * rates.gstPercent) / 100
    const additionalCharges = (goldValue * rates.additionalChargePercent) / 100

    // Total = Gold Value + all charges
    const packageAmount = goldValue + makingCharges + gstAmount + additionalCharges

    return {
      goldRate,
      goldValue: Math.round(goldValue * 100) / 100,
      investment: Math.round(investment * 100) / 100,
      jewelleryValue: Math.round(jewelleryValue * 100) / 100,
      makingCharges: Math.round(makingCharges * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      additionalCharges: Math.round(additionalCharges * 100) / 100,
      packageAmount: Math.round(packageAmount * 100) / 100,
    }
  }
}

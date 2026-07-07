import PlatformConfig from '#models/platform_config'

export interface GoldBillingRates {
  rate18ct: number
  rate22ct: number
  rate24ct: number
  makingChargePercent: number
  gstPercent: number
  hallmarkAdditionalPercent: number
}

export default class GoldBillingConfig {
  static async getRates(): Promise<GoldBillingRates> {
    const [
      rate18ct,
      rate22ct,
      rate24ct,
      makingChargePercent,
      gstPercent,
      hallmarkAdditionalPercent,
    ] = await Promise.all([
      PlatformConfig.getNumber('gold_rate_18ct', 5200),
      PlatformConfig.getNumber('gold_rate_22ct', 6200),
      PlatformConfig.getNumber('gold_rate_24ct', 6800),
      PlatformConfig.getNumber('gold_making_charge_percent', 12),
      PlatformConfig.getNumber('gold_gst_percent', 3),
      PlatformConfig.getNumber('gold_hallmark_additional_percent', 2),
    ])

    return {
      rate18ct,
      rate22ct,
      rate24ct,
      makingChargePercent,
      gstPercent,
      hallmarkAdditionalPercent,
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

  static calculate(
    rates: GoldBillingRates,
    carat: string,
    weight: number
  ): {
    goldRate: number
    goldPrice: number
    makingCharges: number
    gstAmount: number
    hallmarkAdditional: number
    packageAmount: number
  } {
    const goldRate = this.getRateForCarat(rates, carat)
    const goldPrice = goldRate * weight

    const makingCharges = (goldPrice * rates.makingChargePercent) / 100
    const taxableForGst = goldPrice + makingCharges
    const gstAmount = (taxableForGst * rates.gstPercent) / 100

    // Merged Hallmark & Additional: 2% of (Gold Price + Making Charges)
    const hallmarkAdditional = (taxableForGst * rates.hallmarkAdditionalPercent) / 100

    const packageAmount = goldPrice + makingCharges + gstAmount + hallmarkAdditional

    return {
      goldRate,
      goldPrice: Math.round(goldPrice * 100) / 100,
      makingCharges: Math.round(makingCharges * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      hallmarkAdditional: Math.round(hallmarkAdditional * 100) / 100,
      packageAmount: Math.round(packageAmount * 100) / 100,
    }
  }
}

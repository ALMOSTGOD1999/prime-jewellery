import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ToWords } from 'to-words'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function numberToWords(amount: number | string) {
  return new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
      doNotAddOnly: false,
      currencyOptions: {
        // can be used to override defaults for the selected locale
        name: 'Rupee',
        plural: 'Rupees',
        symbol: '₹',
        fractionalUnit: {
          name: 'Paisa',
          plural: 'Paise',
          symbol: '',
        },
      },
    },
  }).convert(Number(amount))
}

export function formatUserId(id: number | string, roleOrLeg?: string | null, leg?: string | null) {
  const idStr = id.toString()

  // Determine the leg: use `leg` param if provided, otherwise check if roleOrLeg is a leg value
  const userLeg = leg ?? (roleOrLeg === 'left' || roleOrLeg === 'right' ? roleOrLeg : null)

  if (userLeg === 'right') {
    return `PJR${idStr}`
  }
  if (userLeg === 'left') {
    return `PJL${idStr}`
  }

  // No leg info — return plain ID
  return idStr
}

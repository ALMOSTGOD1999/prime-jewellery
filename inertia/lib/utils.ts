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

export function formatUserId(
  id: number | string,
  _roleOrLeg?: string | null,
  _leg?: string | null
) {
  // Always pad to 6 digits minimum, don't truncate (e.g. 135 → "000135", 7638545 → "7638545")
  const idStr = String(id).padStart(6, '0')
  return `PJ${idStr}`
}

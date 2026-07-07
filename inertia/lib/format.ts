import { format, formatDistance } from 'date-fns'

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts,
    }).format(new Date(date))
  } catch (_err) {
    return ''
  }
}

export function formatDateWithRelative(date: Date | string | number | undefined | null): {
  formatted: string
  relative: string
} {
  if (!date) return { formatted: '', relative: '' }

  try {
    const dateObj = new Date(date)
    const formatted = format(dateObj, 'MMM d yyyy')
    const relative = formatDistance(dateObj, new Date(), { addSuffix: true }).replaceAll(
      'about ',
      ''
    )

    return { formatted, relative }
  } catch (_err) {
    return { formatted: '', relative: '' }
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

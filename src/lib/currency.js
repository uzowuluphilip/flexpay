export const DISPLAY_CURRENCY_KEY = 'flexpay-display-currency'

export function getStoredDisplayCurrency() {
  if (typeof window === 'undefined') return 'NGN'
  const stored = window.localStorage.getItem(DISPLAY_CURRENCY_KEY)
  return stored === 'USD' ? 'USD' : 'NGN'
}

export function setStoredDisplayCurrency(currency) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DISPLAY_CURRENCY_KEY, currency === 'USD' ? 'USD' : 'NGN')
}

export function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0))
}

export function formatDisplayAmount(amount, displayCurrency, exchangeRate) {
  const amountNumber = Number(amount ?? 0)
  const safeRate = Number(exchangeRate ?? 0) || 1

  if (displayCurrency === 'USD') {
    const usdValue = amountNumber / safeRate
    return `$${formatUsd(usdValue)}`
  }

  return `₦${formatNaira(amountNumber)}`
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://flexpay-production-348e.up.railway.app'

function getStoredToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('flexpay-token') || null
}

async function apiRequest(path, { method = 'GET', body, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const authToken = token ?? getStoredToken()

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  const rawText = await response.text()
  let payload = {}

  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch (error) {
      throw new Error(`Request failed (${response.status}): ${rawText.slice(0, 180)}`)
    }
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Something went wrong. Please try again.')
  }

  return payload.data ?? payload
}

async function uploadRequest(path, formData, token = null) {
  const headers = {}
  const authToken = token ?? getStoredToken()
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })
  const rawText = await response.text()
  let payload = {}

  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      throw new Error(`Request failed (${response.status}): ${rawText.slice(0, 180)}`)
    }
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Something went wrong. Please try again.')
  }
  return payload.data ?? payload
}

export async function getWalletSummary() {
  const data = await apiRequest('/api/wallet/summary', { token: getStoredToken() })
  return {
    balance: Number(data.balance ?? 0),
    referralsActive: Number(data.referralsActive ?? 0),
    perReferral: Number(data.perReferral ?? 0),
    referralTier: data.referralTier || 'STARTER',
    verified: Boolean(data.verified ?? true),
  }
}

export async function getWithdrawProgress() {
  const data = await apiRequest('/api/wallet/withdraw-progress', { token: getStoredToken() })
  return {
    balance: Number(data.balance ?? 0),
    referrals: Number(data.referrals ?? 0),
    tasks: Number(data.tasks ?? 0),
    claims: Number(data.claims ?? 0),
  }
}

export async function submitWithdrawal(payload) {
  return apiRequest('/api/wallet/withdraw', {
    method: 'POST',
    body: payload,
    token: getStoredToken(),
  })
}

export async function playSpin(stake) {
  const data = await apiRequest('/api/spin/play', {
    method: 'POST',
    body: { stake },
    token: getStoredToken(),
  })
  return data
}

export async function getExchangeRate() {
  const data = await apiRequest('/api/exchange-rate', { token: getStoredToken() })
  return Number(data.rate ?? 1359)
}

export async function creditTaskReward(amount) {
  const data = await apiRequest('/api/wallet/claim-reward', {
    method: 'POST',
    body: { amount },
    token: getStoredToken(),
  })

  return {
    balance: Number(data.rewardAmount ?? amount / 100 ?? 0),
  }
}

export async function getCheckInStatus() {
  const data = await apiRequest('/api/wallet/checkin-status', { token: getStoredToken() })
  return {
    currentDay: Number(data.currentDay ?? 1),
    maxDay: Number(data.maxDay ?? 7),
    unlockedDays: Array.isArray(data.unlockedDays) ? data.unlockedDays.map(Number) : [1],
    checkedInToday: Boolean(data.checkedInToday ?? false),
    maxClaims: Number(data.maxClaims ?? 1),
    claimsToday: Number(data.claimsToday ?? 0),
    claimsRemaining: Number(data.claimsRemaining ?? 1),
  }
}

export async function claimDailyReward() {
  const data = await apiRequest('/api/wallet/claim-reward', {
    method: 'POST',
    token: getStoredToken(),
  })

  return {
    claimsToday: Number(data.claimsToday ?? 0),
    claimsRemaining: Number(data.claimsRemaining ?? 1),
    rewardAmount: Number(data.rewardAmount ?? 0),
  }
}

export async function checkIn() {
  const data = await apiRequest('/api/wallet/checkin', {
    method: 'POST',
    token: getStoredToken(),
  })

  return {
    currentDay: Number(data.currentDay ?? 1),
    unlockedDays: Array.isArray(data.unlockedDays) ? data.unlockedDays.map(Number) : [1],
    checkedInToday: Boolean(data.checkedInToday ?? false),
  }
}

export async function getAchievements() {
  const data = await apiRequest('/api/wallet/achievements', { token: getStoredToken() })
  return {
    unlocked: Number(data.unlocked ?? 0),
    total: Number(data.total ?? data.list?.length ?? 0),
    list: Array.isArray(data.list) ? data.list.map((item) => ({
      ...item,
      current: Number(item.current ?? 0),
      target: Number(item.target ?? 1),
      progress: Number(item.progress ?? item.current ?? 0),
      unlocked: Boolean(item.unlocked),
    })) : [],
  }
}

export async function getRecentActivity() {
  const data = await apiRequest('/api/wallet/activity', { token: getStoredToken() })
  return Array.isArray(data.items) ? data.items.map((item) => ({
    title: item.title || item.description || 'Activity',
    description: item.description || item.title || 'Recent activity',
    amount: Number(item.amount ?? 0),
    time: item.time || item.timestamp || 'Now',
  })) : []
}

export async function getTransactionHistory() {
  const data = await apiRequest('/api/wallet/activity', { token: getStoredToken() })
  return Array.isArray(data.items) ? data.items.map((item) => ({
    id: item.id,
    type: item.type || 'activity',
    title: item.title || item.description || 'Activity',
    timestamp: item.timestamp || new Date().toISOString(),
    amount: Number(item.amount ?? 0),
    credit: item.credit ?? true,
    status: item.status || 'completed',
  })) : []
}

export async function getReferralInfo() {
  const data = await apiRequest('/api/referrals/info', { token: getStoredToken() })
  return {
    code: data.code || '',
    link: data.link || '',
    count: Number(data.count ?? 0),
    milestones: data.milestones || [10, 25, 50, 100],
    progress: data.progress || {},
    message: data.message || '',
    perReferral: Number(data.perReferral ?? 15000),
    referralTier: data.referralTier || 'STARTER',
  }
}

export async function lockFunds(amount) {
  const data = await apiRequest('/api/invest/lock', {
    method: 'POST',
    body: { amount },
    token: getStoredToken(),
  })

  return data.lock || data
}

export async function getInvestLocks() {
  const data = await apiRequest('/api/invest/locks', { token: getStoredToken() })
  return Array.isArray(data.locks) ? data.locks : []
}

const DEFAULT_TOPUP_CONFIG = {
  bankName: 'Moniepoint MFB',
  accountNumber: '5289340156',
  accountName: 'Divine Kelechi Christopher',
  feeRate: 0.02,
  minAmount: 100,
  maxAmount: 500000,
  verificationTimeframe: 'a few hours',
}

export async function getTopupConfig(token = null) {
  try {
    const data = await apiRequest('/api/wallet/topup-config', { token })
    return {
      ...DEFAULT_TOPUP_CONFIG,
      ...data,
      bankName: data?.bankName || data?.bank_name || DEFAULT_TOPUP_CONFIG.bankName,
      accountNumber: data?.accountNumber || data?.account_number || DEFAULT_TOPUP_CONFIG.accountNumber,
      accountName: data?.accountName || data?.account_name || DEFAULT_TOPUP_CONFIG.accountName,
      feeRate: Number(data?.feeRate ?? data?.fee_rate ?? DEFAULT_TOPUP_CONFIG.feeRate),
      minAmount: Number(data?.minAmount ?? data?.min_amount ?? DEFAULT_TOPUP_CONFIG.minAmount),
      maxAmount: Number(data?.maxAmount ?? data?.max_amount ?? DEFAULT_TOPUP_CONFIG.maxAmount),
      verificationTimeframe: data?.verificationTimeframe || data?.verification_timeframe || DEFAULT_TOPUP_CONFIG.verificationTimeframe,
    }
  } catch (error) {
    return { ...DEFAULT_TOPUP_CONFIG }
  }
}

export async function submitTopupReceipt(amount, file, token = null) {
  const formData = new FormData()
  formData.append('amount', String(amount))
  formData.append('receipt', file)
  return uploadRequest('/api/wallet/topup/submit-receipt', formData, token)
}

export async function submitUpgradeReceipt(amount, tier, file, token = null) {
  const formData = new FormData()
  formData.append('amount', String(amount))
  formData.append('tier', tier)
  formData.append('receipt', file)
  return uploadRequest('/api/wallet/upgrade/submit-receipt', formData, token)
}

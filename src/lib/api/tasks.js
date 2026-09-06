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

export const tasks = [
  {
    id: 'join-telegram-channel',
    title: 'Join Telegram Channel',
    description: 'Join the official FlexPay Telegram channel for announcements and rewards.',
    rewardAmount: 5000,
    url: 'https://t.me/flexpay',
  },
  {
    id: 'complete-profile',
    title: 'Complete Profile',
    description: 'Upload your profile photo and complete your FlexPay account profile.',
    rewardAmount: 2000,
    url: 'https://flexpay.com/profile',
  },
  {
    id: 'make-first-referral',
    title: 'Make First Referral',
    description: 'Invite your first friend to FlexPay and earn your referral bonus.',
    rewardAmount: 10000,
    url: 'https://flexpay.com/referral',
  },
  {
    id: 'daily-check-in',
    title: 'Daily Check-in',
    description: 'Login daily with FlexPay to earn your bonus check-in reward.',
    rewardAmount: 1000,
    url: 'https://flexpay.com/login',
  },
  {
    id: 'share-on-telegram',
    title: 'Share on Telegram',
    description: 'Share FlexPay with your Telegram contacts to grow the community.',
    rewardAmount: 2000,
    url: 'https://t.me/share?text=Join%20FlexPay',
  },
  {
    id: 'join-telegram-group',
    title: 'Join Telegram Group',
    description: 'Join the FlexPay Telegram discussion group to meet other members.',
    rewardAmount: 2000,
    url: 'https://t.me/flexpaygroup',
  },
  {
    id: 'follow-telegram-bot',
    title: 'Follow Telegram Bot',
    description: 'Follow the official FlexPay Telegram bot for updates and support.',
    rewardAmount: 3000,
    url: 'https://t.me/flexpaybot',
  },
  {
    id: 'invite-3-friends-today',
    title: 'Invite 3 Friends Today',
    description: 'Share your FlexPay referral link with at least three friends today.',
    rewardAmount: 5000,
    url: 'https://flexpay.com/referral',
  },
  {
    id: 'join-telegram-community',
    title: 'Join Telegram Community',
    description: 'Join the FlexPay Telegram community group for support and updates.',
    rewardAmount: 2000,
    url: 'https://t.me/flexpaycommunity',
  },
  {
    id: 'follow-on-threads',
    title: 'Follow on Threads',
    description: 'Follow FlexPay on Threads to stay up to date with announcements.',
    rewardAmount: 2500,
    url: 'https://threads.net/@flexpay',
  },
]

export async function getTasks() {
  const data = await apiRequest('/api/tasks', { token: getStoredToken() })
  return Array.isArray(data.tasks) ? data.tasks : []
}

export async function verifyTask(taskId) {
  const data = await apiRequest(`/api/tasks/${taskId}/verify`, {
    method: 'POST',
    token: getStoredToken(),
  })

  return {
    taskId,
    verified: Boolean(data.verified ?? true),
    alreadyCompleted: Boolean(data.already_completed ?? false),
  }
}

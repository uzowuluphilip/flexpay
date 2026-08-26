const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

  const response = await fetch(`${API_BASE}${path}`, {
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
    id: 'join-telegram-channel-2',
    title: 'Join Telegram Channel 2',
    description: 'Join the second FlexPay Telegram channel to stay connected with our community.',
    rewardAmount: 5000,
    url: 'https://t.me/flexpay2',
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
    id: 'follow-on-instagram',
    title: 'Follow on Instagram',
    description: 'Follow FlexPay on Instagram to keep up with new offers and updates.',
    rewardAmount: 3000,
    url: 'https://instagram.com/flexpay',
  },
  {
    id: 'follow-on-x',
    title: 'Follow on X (Twitter)',
    description: 'Follow FlexPay on X to get the latest announcements and promotions.',
    rewardAmount: 3000,
    url: 'https://twitter.com/flexpay',
  },
  {
    id: 'like-facebook-page',
    title: 'Like Facebook Page',
    description: 'Like the official FlexPay Facebook page for news and rewards.',
    rewardAmount: 3000,
    url: 'https://facebook.com/flexpay',
  },
  {
    id: 'follow-on-tiktok',
    title: 'Follow on TikTok',
    description: 'Follow FlexPay on TikTok for fun videos and reward updates.',
    rewardAmount: 3000,
    url: 'https://tiktok.com/@flexpay',
  },
  {
    id: 'share-on-telegram',
    title: 'Share on Telegram',
    description: 'Share FlexPay with your Telegram contacts to grow the community.',
    rewardAmount: 2000,
    url: 'https://t.me/share?text=Join%20FlexPay',
  },
  {
    id: 'share-instagram-story',
    title: 'Share Instagram Story',
    description: 'Post about FlexPay on your Instagram story to invite friends.',
    rewardAmount: 2000,
    url: 'https://instagram.com',
  },
  {
    id: 'watch-youtube-video',
    title: 'Watch YouTube Video',
    description: 'Watch and like the latest FlexPay video on YouTube.',
    rewardAmount: 2500,
    url: 'https://youtube.com/flexpay',
  },
  {
    id: 'subscribe-on-youtube',
    title: 'Subscribe on YouTube',
    description: 'Subscribe to the FlexPay YouTube channel for video updates.',
    rewardAmount: 3000,
    url: 'https://youtube.com/flexpay',
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
    id: 'repost-on-x',
    title: 'Repost on X',
    description: 'Repost the pinned FlexPay tweet on X to share our message.',
    rewardAmount: 2000,
    url: 'https://x.com/flexpay',
  },
  {
    id: 'comment-on-facebook-post',
    title: 'Comment on Facebook Post',
    description: 'Leave a positive comment on the latest FlexPay Facebook post.',
    rewardAmount: 1500,
    url: 'https://facebook.com/flexpay',
  },
  {
    id: 'invite-3-friends-today',
    title: 'Invite 3 Friends Today',
    description: 'Share your FlexPay referral link with at least three friends today.',
    rewardAmount: 5000,
    url: 'https://flexpay.com/referral',
  },
  {
    id: 'rate-our-app',
    title: 'Rate Our App',
    description: 'Leave a five-star review for FlexPay to help more people discover us.',
    rewardAmount: 2000,
    url: 'https://flexpay.com/review',
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

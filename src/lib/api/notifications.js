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

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload.data ?? payload
}

export async function savePushSubscription(subscription, token) {
  return apiRequest('/api/notifications/subscribe', {
    method: 'POST',
    token,
    body: subscription.toJSON(),
  })
}

export async function getNotificationInbox() {
  const data = await apiRequest('/api/notifications')
  return Array.isArray(data.items) ? data.items : []
}

export async function markNotificationsRead(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return true
  return apiRequest('/api/notifications/read', {
    method: 'POST',
    body: { ids },
  })
}

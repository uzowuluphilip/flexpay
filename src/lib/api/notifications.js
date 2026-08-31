const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://flexpay-production-348e.up.railway.app'

export async function savePushSubscription(subscription, token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(subscription.toJSON()),
  })
  const payload = await response.json()
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Could not enable notifications.')
  }
  return payload.data ?? payload
}

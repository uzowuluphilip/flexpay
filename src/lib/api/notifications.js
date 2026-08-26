const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function savePushSubscription(subscription, token) {
  const response = await fetch(`${API_BASE}/api/notifications/subscribe`, {
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

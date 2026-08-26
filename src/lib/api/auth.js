const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function apiRequest(path, { method = 'GET', body, token = null } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
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
      const cleanedText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const detail = cleanedText ? cleanedText.slice(0, 180) : 'The server returned an invalid response.'
      throw new Error(`Request failed (${response.status}): ${detail}`)
    }
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Something went wrong. Please try again.')
  }

  return payload.data ?? payload
}

function getStoredToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('flexpay-token')
}

export async function signIn(email, password) {
  if (!email || !password) {
    throw new Error('Please enter both your email and password.')
  }

  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  const user = data.user || data
  const token = data.token || user.token || getStoredToken()

  if (token && typeof window !== 'undefined') {
    window.localStorage.setItem('flexpay-token', token)
  }

  return {
    user: {
      ...user,
      token,
    },
  }
}

export async function signUp(payload) {
  if (!payload?.email || !payload?.password || !payload?.fullName) {
    throw new Error('Please complete all required fields.')
  }

  const data = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      referral_code: payload.referralCode || '',
    },
  })

  return {
    user: data.user || data,
  }
}

export async function forgotPassword(email) {
  if (!email) {
    throw new Error('Please provide your email address.')
  }

  await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })

  return { ok: true }
}

export async function resetPassword({ email, token, password }) {
  if (!email || !token) {
    throw new Error('The reset link is missing its email or token details.')
  }
  if (!password) {
    throw new Error('Please choose a new password.')
  }

  await apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: {
      token,
      new_password: password,
    },
  })

  return { ok: true }
}

export async function getCurrentUser() {
  const token = getStoredToken()
  if (!token) {
    return { user: null }
  }

  const data = await apiRequest('/api/auth/me', { token })
  return { user: data.user || data }
}

export async function logoutSession() {
  const token = getStoredToken()
  if (!token) {
    return { ok: true }
  }

  await apiRequest('/api/auth/logout', {
    method: 'POST',
    token,
  })

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('flexpay-token')
    window.localStorage.removeItem('flexpay-session')
  }

  return { ok: true }
}

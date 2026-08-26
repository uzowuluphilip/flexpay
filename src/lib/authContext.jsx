import { createContext, useCallback, useMemo, useState } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    if (typeof window === 'undefined') return null
    const saved = window.localStorage.getItem('flexpay-session')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('flexpay-token') || null
  })

  const signIn = useCallback((user, nextToken = null) => {
    const safeUser = user && typeof user === 'object' && user.user ? user.user : user
    const resolvedToken = nextToken ?? safeUser?.token ?? token

    const cleanedUser = safeUser ? { ...safeUser } : null
    if (cleanedUser && cleanedUser.token) {
      delete cleanedUser.token
    }

    setSession(cleanedUser)
    setToken(resolvedToken)

    if (typeof window !== 'undefined') {
      if (cleanedUser) {
        window.localStorage.setItem('flexpay-session', JSON.stringify(cleanedUser))
      } else {
        window.localStorage.removeItem('flexpay-session')
      }

      if (resolvedToken) {
        window.localStorage.setItem('flexpay-token', resolvedToken)
      } else {
        window.localStorage.removeItem('flexpay-token')
      }
    }
  }, [token])

  const signOut = useCallback(() => {
    setSession(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('flexpay-session')
      window.localStorage.removeItem('flexpay-token')
    }
  }, [])

  const logout = useCallback(() => {
    // Alias for signOut so components can call a logout() method directly.
    signOut()
  }, [signOut])

  const value = useMemo(() => ({
    session,
    token,
    signIn,
    signOut,
    logout,
    setSession,
    setToken,
  }), [session, token, signIn, signOut, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

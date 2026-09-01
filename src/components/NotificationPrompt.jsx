import { Bell, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { savePushSubscription } from '../lib/api/notifications'

const dismissalKey = 'flexpay-notification-dismissed-at'
const sessionKey = 'flexpay-notification-prompt-seen'
const pendingSubscriptionKey = 'flexpay-pending-push-subscription'
const dismissalPeriod = 3 * 24 * 60 * 60 * 1000

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

function NotificationPrompt() {
  const { token } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const supportsPush = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  const permission = supportsPush ? Notification.permission : 'unsupported'
  const canEnable = supportsPush && permission !== 'denied'

  useEffect(() => {
    if (token && supportsPush && Notification.permission === 'granted') {
      const pendingSubscription = window.localStorage.getItem(pendingSubscriptionKey)
      if (pendingSubscription) {
        savePushSubscription({ toJSON: () => JSON.parse(pendingSubscription) }, token)
          .then(() => window.localStorage.removeItem(pendingSubscriptionKey))
          .catch(() => {})
      }
    }

    const handlePromptOpen = () => {
      window.sessionStorage.setItem(sessionKey, '1')
      setVisible(true)
    }

    window.addEventListener('flexpay-open-notification-prompt', handlePromptOpen)

    if (window.sessionStorage.getItem(sessionKey)) return () => {
      window.removeEventListener('flexpay-open-notification-prompt', handlePromptOpen)
    }

    const dismissedAt = Number(window.localStorage.getItem(dismissalKey) || 0)
    if (Date.now() - dismissedAt < dismissalPeriod) return () => {
      window.removeEventListener('flexpay-open-notification-prompt', handlePromptOpen)
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(sessionKey, '1')
      setVisible(true)
    }, 300)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('flexpay-open-notification-prompt', handlePromptOpen)
    }
  }, [token, supportsPush])

  const dismiss = () => {
    setVisible(false)
    window.localStorage.setItem(dismissalKey, String(Date.now()))
  }

  const enable = async () => {
    if (!canEnable) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        dismiss()
        return
      }

      const registration = await navigator.serviceWorker.ready
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!publicKey) throw new Error('VAPID public key is not configured.')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      })
      if (token) {
        await savePushSubscription(subscription, token)
      } else {
        window.localStorage.setItem(pendingSubscriptionKey, JSON.stringify(subscription.toJSON()))
      }
      dismiss()
    } catch (error) {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-[70] flex justify-center sm:inset-x-6 sm:bottom-8">
      <section role="dialog" aria-labelledby="notification-prompt-title" className="w-full max-w-[390px] rounded-[1.5rem] border border-brand-border bg-brand-panel p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-lime text-brand-base"><Bell size={21} /></div>
          <div className="min-w-0 flex-1"><h2 id="notification-prompt-title" className="text-lg font-semibold">Enable Notifications</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Get instant alerts for withdrawals, bonuses, and important updates!</p></div>
          <button type="button" onClick={dismiss} aria-label="Close notification prompt" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-muted hover:text-brand-text"><X size={18} /></button>
        </div>
        <div className="mt-5 flex items-center justify-end gap-4"><button type="button" onClick={dismiss} className="min-h-11 px-3 text-sm font-semibold text-brand-muted hover:text-brand-text">Later</button><button type="button" onClick={enable} disabled={busy || !canEnable} className="min-h-11 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-5 text-sm font-semibold text-brand-base disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Enabling...' : permission === 'denied' ? 'Blocked' : 'Enable'}</button></div>
      </section>
    </div>
  )
}

export default NotificationPrompt

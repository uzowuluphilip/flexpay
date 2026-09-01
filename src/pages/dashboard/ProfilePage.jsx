import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Camera, CalendarDays, CheckCircle2, ChevronRight, Hash, LogOut, Mail, Moon, Settings2, User, Users, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { useAuth } from '../../hooks/useAuth'
import { logoutSession } from '../../lib/api/auth'
import { getReferralInfo, getWalletSummary } from '../../lib/api/wallet'

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-GB')
}

function ProfilePage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [walletSummary, setWalletSummary] = useState({ referralsActive: 0 })
  const [referralInfo, setReferralInfo] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [themeEnabled, setThemeEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('flexpay-theme-enabled') !== 'false'
  })
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('flexpay-sounds-enabled') !== 'false'
  })
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function loadProfileData() {
      const [walletResult, referralResult] = await Promise.allSettled([getWalletSummary(), getReferralInfo()])

      if (walletResult.status === 'fulfilled') {
        setWalletSummary(walletResult.value)
      }
      if (referralResult.status === 'fulfilled') {
        setReferralInfo(referralResult.value)
      }
    }

    loadProfileData()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flexpay-theme-enabled', themeEnabled ? 'true' : 'false')
    document.documentElement.dataset.theme = themeEnabled ? 'dark' : 'light'
  }, [themeEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flexpay-sounds-enabled', soundsEnabled ? 'true' : 'false')
  }, [soundsEnabled])

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const referralCode = useMemo(() => {
    const code = referralInfo?.code || session?.name?.toLowerCase().replace(/\s+/g, '') || 'flexpaydemo'
    return code
  }, [referralInfo, session])

  const initials = useMemo(() => {
    const name = session?.name || 'FlexPay User'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }, [session])

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)

    // Real upload call goes here later, once the backend endpoint is available.
    // For now this is a local preview only and does not persist after refresh.
  }

  const handleLogout = async () => {
    try {
      await logoutSession()
    } catch {
      // Ignore backend logout failure and clear local state so the user can still exit cleanly.
    }

    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-5 lg:px-8 lg:py-6">
        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => navigate('/home')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-panel/80 text-brand-text transition hover:border-brand-lime">
              <ArrowLeft size={20} />
            </button>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.9rem] bg-[rgba(198,241,53,0.12)] text-brand-lime">
              <User size={24} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold text-brand-text">My Profile</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-lime/20 to-brand-panel/80 text-4xl font-semibold text-brand-lime shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border border-brand-border/70 bg-brand-panel/90 text-brand-lime shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                aria-label="Change profile photo"
              >
                <Camera size={18} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            <p className="text-sm text-brand-muted">Tap photo to change</p>
            <p className="text-xl font-semibold text-brand-text">{session?.name || 'FlexPay member'}</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <div className="flex items-center gap-3 text-brand-lime">
              <span className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3">
                <Mail size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Email</p>
                <p className="mt-2 text-sm text-brand-text">{session?.email || 'Not available'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <div className="flex items-center gap-3 text-brand-lime">
              <span className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3">
                <Hash size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Referral Code</p>
                <p className="mt-2 text-sm text-brand-text">{referralCode}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <div className="flex items-center gap-3 text-brand-lime">
              <span className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3">
                <Users size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Total Referrals</p>
                <p className="mt-2 text-sm text-brand-text">{walletSummary.referralsActive}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <div className="flex items-center gap-3 text-brand-lime">
              <span className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3">
                <CalendarDays size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Member Since</p>
                <p className="mt-2 text-sm text-brand-text">{formatDate(session?.created_at)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3 text-brand-lime">
            <span className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3">
              <Settings2 size={18} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">SETTINGS</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 px-4 py-4">
              <div>
                <div className="flex items-center gap-2 text-brand-lime">
                  <Moon size={18} />
                  <p className="text-sm font-semibold text-brand-text">Theme</p>
                </div>
                <p className="mt-1 text-sm text-brand-muted">Dark mode</p>
              </div>
              <button
                type="button"
                onClick={() => setThemeEnabled((value) => !value)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full border ${themeEnabled ? 'border-brand-lime bg-brand-lime/20' : 'border-brand-border/70 bg-[rgba(198,241,53,0.08)]'}`}
                aria-label="Toggle dark mode"
              >
                <span className={`absolute left-1 h-6 w-6 rounded-full bg-brand-base transition ${themeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 px-4 py-4">
              <div>
                <div className="flex items-center gap-2 text-brand-lime">
                  <Volume2 size={18} />
                  <p className="text-sm font-semibold text-brand-text">Sounds</p>
                </div>
                <p className="mt-1 text-sm text-brand-muted">Enable sound cues</p>
              </div>
              <button
                type="button"
                onClick={() => setSoundsEnabled((value) => !value)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full border ${soundsEnabled ? 'border-brand-lime bg-brand-lime/20' : 'border-brand-border/70 bg-[rgba(198,241,53,0.08)]'}`}
                aria-label="Toggle sounds"
              >
                <span className={`absolute left-1 h-6 w-6 rounded-full bg-brand-base transition ${soundsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-danger/10 px-4 py-3 text-sm font-semibold text-brand-danger border border-brand-danger/40 transition hover:bg-brand-danger/15">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  )
}

export default ProfilePage

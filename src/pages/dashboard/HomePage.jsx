import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { Bell, Eye, EyeOff, BadgeCheck, Wallet2, Plus, ArrowDownLeft, Sparkles, Gift, Trophy, Lock, ChevronRight, LoaderCircle, Send, CircleDollarSign, Flame, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import CurrencyDisplayToggle from '../../components/dashboard/CurrencyDisplayToggle'
import ReferralProgram from '../../components/dashboard/ReferralProgram'
import { useAuth } from '../../hooks/useAuth'
import { claimDailyReward, checkIn, getAchievements, getExchangeRate, getRecentActivity, getCheckInStatus, getReferralInfo, getWalletSummary } from '../../lib/api/wallet'
import { formatDisplayAmount, getStoredDisplayCurrency } from '../../lib/currency'

function HomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState('Good morning')
  const [balanceVisible, setBalanceVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('flexpay-balance-hidden') !== 'true'
  })
  const [wallet, setWallet] = useState({ balance: 0, referralsActive: 0, perReferral: 0, verified: true })
  const [checkInStatus, setCheckInStatus] = useState({ currentDay: 1, maxDay: 7, unlockedDays: [1], checkedInToday: false, maxClaims: 30 })
  const [claimStatus, setClaimStatus] = useState({ claimsToday: 0, claimsRemaining: 1 })
  const [exchangeRate, setExchangeRate] = useState(1359)
  const [displayCurrency, setDisplayCurrency] = useState(getStoredDisplayCurrency())
  const [achievements, setAchievements] = useState({ unlocked: 0, total: 10 })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener?.('change', updatePreference)

    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 18) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }

    async function loadDashboard() {
      setLoading(true)
      const [walletData, checkInData, achievementsData, activityData, rate] = await Promise.all([
        getWalletSummary(),
        getCheckInStatus(),
        getAchievements(),
        getRecentActivity(),
        getExchangeRate(),
      ])
      setWallet(walletData)
      setCheckInStatus(checkInData)
      setClaimStatus({ claimsToday: checkInData.claimsToday, claimsRemaining: checkInData.claimsRemaining })
      setAchievements(achievementsData)
      setActivity(activityData)
      setExchangeRate(rate)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  const balanceLabel = useMemo(() => (balanceVisible ? formatDisplayAmount(wallet.balance, displayCurrency, exchangeRate) : '••••••'), [balanceVisible, wallet.balance, displayCurrency, exchangeRate])
  const perReferralLabel = useMemo(() => formatDisplayAmount(wallet.perReferral, displayCurrency, exchangeRate), [wallet.perReferral, displayCurrency, exchangeRate])
  const liveRateText = displayCurrency === 'USD' ? `Live rate: 1 USD = ₦${Number(exchangeRate).toLocaleString('en-NG')}` : ''

  const toggleBalance = () => {
    const next = !balanceVisible
    setBalanceVisible(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('flexpay-balance-hidden', next ? 'true' : 'false')
    }
  }

  const triggerConfetti = () => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      return
    }

    const end = Date.now() + 1800
    const colors = ['#c6f135', '#f6d365', '#ffb703', '#f97316', '#60a5fa', '#a78bfa', '#f87171']

    const frame = () => {
      if (Date.now() > end) return

      confetti({
        particleCount: 28,
        angle: 90,
        spread: 100,
        startVelocity: 30,
        origin: { x: Math.random(), y: 0.2 },
        colors,
      })

      requestAnimationFrame(frame)
    }

    frame()
  }

  const handleCheckIn = async () => {
    if (checkingIn) return

    setCheckingIn(true)

    try {
      const updated = await checkIn()
      setCheckInStatus((current) => ({
        ...current,
        currentDay: updated.currentDay,
        unlockedDays: updated.unlockedDays,
        checkedInToday: updated.checkedInToday,
      }))

      if (updated.checkedInToday) {
        triggerConfetti()
      }
    } finally {
      setCheckingIn(false)
    }
  }

  const handleClaimReward = async () => {
    setClaiming(true)
    try {
      const updated = await claimDailyReward()
      setClaimStatus({
        claimsToday: updated.claimsToday,
        claimsRemaining: updated.claimsRemaining,
      })
    } finally {
      setClaiming(false)
    }
  }

  const checkInDays = Array.from({ length: checkInStatus.maxDay }, (_, index) => index + 1)
  const hasCheckedInToday = Boolean(checkInStatus.checkedInToday)
  const streakDisplay = `${checkInStatus.currentDay} day streak`

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <header className="flex items-center justify-between rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] px-4 py-3 shadow-[0_16px_42px_rgba(0,0,0,0.22)] sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-lime to-[#fbdc8b] text-lg font-semibold text-brand-base">
              {session?.name?.[0] || 'F'}
            </div>
            <div>
              <p className="text-sm text-brand-muted">{greeting}</p>
              <h1 className="text-lg font-semibold text-brand-text">{session?.name || 'FlexPay member'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyDisplayToggle exchangeRate={exchangeRate} value={displayCurrency} onChange={setDisplayCurrency} />
            <button className="relative rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2.5 text-brand-lime">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff8158]" />
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[1.75rem] border border-brand-border/70 bg-[linear-gradient(135deg,rgba(198,241,53,0.12),rgba(11,7,20,0.86))] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.2)] sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Total Balance</p>
                <div className="mt-2 flex items-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.54)] px-3 py-1.5 text-sm text-brand-lime">
                  <Wallet2 size={14} />
                  <span>{displayCurrency === 'USD' ? 'USD' : 'NGN'}</span>
                </div>
              </div>
              <button onClick={toggleBalance} className="rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.54)] p-2.5 text-brand-lime">
                {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-3xl font-semibold text-brand-text sm:text-4xl">{loading ? '••••••' : balanceLabel}</p>
                {displayCurrency === 'USD' && liveRateText ? (
                  <div className="mt-2 text-xs text-brand-lime">{liveRateText}</div>
                ) : null}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(198,241,53,0.22)] bg-[rgba(198,241,53,0.08)] px-3 py-1.5 text-sm text-brand-lime">
                  <BadgeCheck size={15} />
                  Verified FlexPay wallet · {wallet.referralsActive} referrals active
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/top-up')} className="flex items-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.54)] px-4 py-2.5 text-sm font-semibold text-brand-text">
                <Plus size={16} /> Top-Up
              </button>
              <button onClick={() => navigate('/withdraw')} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-2.5 text-sm font-semibold text-brand-base">
                <ArrowDownLeft size={16} /> Withdraw
              </button>
              <button onClick={() => navigate('/upgrade')} className="flex items-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.54)] px-4 py-2.5 text-sm font-semibold text-brand-text">
                <Sparkles size={16} /> Upgrade
              </button>
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Referrals</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-brand-text">{wallet.referralsActive}</p>
              <p className="mt-2 text-sm text-brand-muted">Active invites on your network.</p>
            </section>
            <section className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Per Referral</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-brand-text">{perReferralLabel}</p>
              <p className="mt-2 text-sm text-brand-muted">Your reward payout per friend.</p>
            </section>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(246,211,101,0.12)] text-base text-[#f6d365]">
                <Flame size={18} />
              </div>
              <h2 className="text-xl font-semibold text-brand-text">Daily Check-In</h2>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-[rgba(246,211,101,0.12)] px-3 py-1 text-sm font-semibold text-[#f6d365]">
              <Flame size={14} />
              {streakDisplay}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {checkInDays.map((day) => {
              const unlocked = checkInStatus.unlockedDays.includes(day)
              const isCurrentDay = day === checkInStatus.currentDay
              const isChecked = unlocked && day <= checkInStatus.currentDay

              return (
                <div key={day} className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center ${isCurrentDay ? 'border-brand-lime bg-[rgba(198,241,53,0.12)] text-brand-lime' : unlocked ? 'border-brand-border/70 bg-[rgba(198,241,53,0.06)] text-brand-text' : 'border-brand-border/40 bg-[rgba(255,255,255,0.04)] text-brand-muted'}`}>
                  {isChecked ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#22c55e] text-[11px] font-bold text-white shadow-[0_0_0_4px_rgba(34,197,94,0.16)]">
                      <Check size={13} />
                    </div>
                  ) : unlocked ? (
                    <span className="text-sm font-semibold">D{day}</span>
                  ) : (
                    <Lock size={12} />
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em]">D{day}</p>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkingIn || hasCheckedInToday}
            className={`mt-4 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ${hasCheckedInToday ? 'bg-gradient-to-r from-[#f8c66b] to-[#f5b75d] text-brand-base shadow-[0_8px_18px_rgba(245,183,93,0.25)]' : 'bg-gradient-to-r from-brand-lime to-brand-lime-light text-brand-base'} disabled:cursor-not-allowed disabled:opacity-100`}
          >
            {checkingIn ? <><LoaderCircle className="mr-2 animate-spin" size={16} /> Checking in...</> : hasCheckedInToday ? <><Check className="mr-2" size={16} /> Checked in today!</> : `Check In (Day ${checkInStatus.currentDay})`}
          </button>

          <div className="mt-4 flex flex-col gap-3 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
                <Gift size={16} />
              </div>
              <div>
                <p className="font-semibold text-brand-text">Daily reward</p>
                <p className="text-sm text-brand-muted">{claimStatus.claimsToday}/1 claim ₦4,000 today</p>
              </div>
            </div>
            <button onClick={handleClaimReward} disabled={claiming || claimStatus.claimsToday >= 1} className="rounded-full border border-brand-lime/50 bg-[rgba(198,241,53,0.1)] px-4 py-2 text-sm font-semibold text-brand-lime disabled:cursor-not-allowed disabled:opacity-75">
              {claiming ? <><LoaderCircle className="mr-2 inline animate-spin" size={14} /> Claiming...</> : claimStatus.claimsToday >= 1 ? 'Claimed today' : 'Claim'}
            </button>
          </div>

          <Link to="/status" className="mt-4 flex items-center justify-between rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-3 transition hover:border-brand-lime/60">
            <span className="text-sm font-semibold text-brand-text">
              <span>Status</span>
            </span>
            <ChevronRight size={16} className="text-brand-muted" />
          </Link>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: 'Refer & Earn', subtitle: 'Bring friends into the club', to: '/home#referrals', icon: Send, accent: 'from-[#24A1DE] to-[#70cfff]' },
            { title: 'Daily Tasks', subtitle: 'Small wins for bigger rewards', to: '/tasks', icon: CircleDollarSign, accent: 'from-[#f2b95c] to-[#ffdf96]' },
            { title: 'Spin & Win', subtitle: 'Try your luck with free spins', to: '/spin', icon: Sparkles, accent: 'from-[#8a71ff] to-[#c2b0ff]' },
            { title: 'History', subtitle: 'Review past activity instantly', to: '/history', icon: ArrowDownLeft, accent: 'from-[#ff8158] to-[#ffaf7f]' },
          ].map(({ title, subtitle, to, icon: Icon, accent }) => (
            <Link key={title} to={to} className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 transition hover:border-brand-lime/60">
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${accent} p-2.5 text-brand-base`}>
                <Icon size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-text">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{subtitle}</p>
            </Link>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-brand-text">Achievements</h3>
                <p className="text-sm text-brand-muted">{achievements.unlocked}/{achievements.total} badges unlocked</p>
              </div>
            </div>
            <Link to="/achievements" className="mt-4 flex items-center justify-between rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-4 py-3 text-sm font-semibold text-brand-lime">
              <span>Open achievement hub</span>
              <ChevronRight size={16} />
            </Link>
          </section>

          <section className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Live Activity</p>
                <h3 className="mt-1 text-lg font-semibold text-brand-text">Recent updates</h3>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[rgba(198,241,53,0.2)] bg-[rgba(198,241,53,0.08)] px-3 py-1 text-sm text-brand-lime">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-lime" /> Live
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {activity.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-brand-border/70 bg-[rgba(11,7,20,0.3)] p-4 text-center text-sm text-brand-muted">
                  No activity yet
                </div>
              ) : activity.map((item, index) => {
                const signedAmount = item.amount >= 0 ? `+${formatDisplayAmount(item.amount, displayCurrency, exchangeRate)}` : `-${formatDisplayAmount(Math.abs(item.amount), displayCurrency, exchangeRate)}`

                return (
                  <div key={`${item.title}-${index}`} className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-4 py-3">
                    <div>
                      <p className="font-semibold text-brand-text">{item.title}</p>
                      <p className="text-sm text-brand-muted">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-brand-lime">{signedAmount}</p>
                      <p className="text-xs text-brand-muted">{item.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="mt-2">
          <ReferralProgram />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default HomePage

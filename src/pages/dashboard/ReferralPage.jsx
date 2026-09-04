import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Copy, Gift, Link2, Send, Share2, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import CurrencyDisplayToggle from '../../components/dashboard/CurrencyDisplayToggle'
import '../../styles/wave-bounce.css'
import { useAuth } from '../../hooks/useAuth'
import { getExchangeRate, getReferralInfo, getWalletSummary } from '../../lib/api/wallet'
import { formatDisplayAmount, getStoredDisplayCurrency } from '../../lib/currency'

const steps = [
  { title: 'Share your unique referral link with friends' },
  { title: 'They sign up and start earning' },
  { title: 'You earn a referral bonus' },
]

const milestoneRewards = [
  { label: '10 active referrals', target: 10, reward: 2000 },
  { label: '25 active referrals', target: 25, reward: 6000 },
  { label: '50 active referrals', target: 50, reward: 15000 },
  { label: '100 active referrals', target: 100, reward: 35000 },
]

function ReferralPage() {
  const { session } = useAuth()
  const [wallet, setWallet] = useState({ balance: 0, referralsActive: 0, perReferral: 15000, referralTier: 'STARTER', verified: true })
  const [referralInfo, setReferralInfo] = useState(null)
  const [exhangeRate, setExchangeRate] = useState(1359)
  const [displayCurrency, setDisplayCurrency] = useState(getStoredDisplayCurrency())
  const [copied, setCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadReferralData() {
      const [walletData, referralData, rate] = await Promise.all([getWalletSummary(), getReferralInfo(), getExchangeRate()])
      setWallet(walletData)
      setReferralInfo(referralData)
      setExchangeRate(rate)
    }

    loadReferralData()
  }, [])

  const referralCode = referralInfo?.code || session?.name?.toLowerCase().replace(/\s+/g, '') || 'flexpaydemo'
  const referralLink = referralInfo?.link || `https://flexpay-theta.vercel.app/register?ref=${encodeURIComponent(referralCode)}`
  const shareMessage = useMemo(
    () => referralInfo?.message || `🚨🔥 STOP SCROLLING — THIS IS YOUR SIGN! 💸\n\n💰 I'm cashing out HUGE on Flexpay and YOU'RE next!\n🎁 Grab a FREE ₦60,000 welcome bonus the second you sign up\n⚡ Earn ₦15,000 for EVERY friend you bring in\n🏦 Withdraw straight to your bank — fast, real, no stress\n🎯 Daily rewards, spins & bonuses waiting for you\n\n🔗 Tap my link NOW: ${referralLink}\n🆔 Referral Code: ${referralCode}\n\n🚀 Don't watch others get rich — JOIN ME TODAY!`,
    [referralCode, referralInfo, referralLink],
  )

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      if (text === shareMessage) {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 1200)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.prompt('Copy this link manually:', text)
      }
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FlexPay referral', text: shareMessage })
        return
      } catch {
        // fallback to copy
      }
    }
    await copyText(shareMessage)
  }

  const progressWidth = (target) => `${Math.min((wallet.referralsActive / target) * 100, 100)}%`
  const perReferralLabel = formatDisplayAmount(wallet.perReferral || referralInfo?.perReferral || 15000, displayCurrency, exhangeRate)
  const totalEarnedLabel = formatDisplayAmount(0, displayCurrency, exhangeRate)

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-5 lg:px-8 lg:py-6">
        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => navigate('/home')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-panel/80 text-brand-text transition hover:border-brand-lime">
              <ArrowLeft size={20} />
            </button>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.9rem] bg-[rgba(198,241,53,0.12)] text-brand-lime">
              <Gift size={24} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold text-brand-text">Refer & Earn</p>
              <p className="mt-1 text-sm leading-6 text-brand-muted">Invite friends, earn rewards</p>
            </div>
            <CurrencyDisplayToggle exchangeRate={exhangeRate} value={displayCurrency} onChange={setDisplayCurrency} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Referrals</p>
            <p className="mt-4 text-4xl font-semibold text-brand-text">{wallet.referralsActive}</p>
            <p className="mt-2 text-sm text-brand-muted">Live count from your referrals.</p>
          </div>
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Per Invite</p>
            <p className="mt-4 text-4xl font-semibold text-brand-text">{perReferralLabel}</p>
            <p className="mt-2 text-sm text-brand-muted">Credit when a referred user completes their first real action.</p>
          </div>
          <div className="rounded-[1.75rem] border border-brand-border/60 bg-brand-panel/90 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Total Earned</p>
            <p className="mt-4 text-4xl font-semibold text-brand-text">{totalEarnedLabel}</p>
            <p className="mt-2 text-sm text-brand-muted">Your own accumulated earnings.</p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <button onClick={handleNativeShare} className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-5 py-3 text-sm font-semibold text-brand-base transition hover:opacity-95">
            <Share2 size={18} /> Invite
          </button>
          <button onClick={() => navigate('/leaders')} className="rounded-full border border-brand-border/60 bg-brand-panel/90 px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-lime">
            Leaders
          </button>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Your Referral Link</p>
              <h2 className="mt-2 text-2xl font-semibold text-brand-text">Share it with friends</h2>
            </div>
            <div className="rounded-2xl border border-brand-border/70 bg-brand-panel/80 px-3 py-2 text-xs uppercase tracking-[0.28em] text-brand-lime">Code: {referralCode}</div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 p-4">
            <p className="text-sm text-brand-muted">Link</p>
            <p className="mt-3 break-all font-mono text-sm text-brand-text">{referralLink}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button onClick={() => copyText(referralLink)} className="flex items-center justify-center gap-2 rounded-full border border-brand-border/60 bg-[rgba(198,241,53,0.08)] px-4 py-3 text-sm font-semibold text-brand-lime">
                <Copy size={16} /> Copy
              </button>
              <button onClick={handleNativeShare} className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3 text-sm font-semibold text-brand-base">
                <Link2 size={16} /> Share
              </button>
            </div>
            {copied ? <p className="mt-3 text-sm text-brand-lime">Link copied</p> : null}
            {shareCopied ? <p className="mt-2 text-sm text-brand-lime">Message copied</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(198,241,53,0.12)] p-3 text-brand-lime">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Boost Your Earnings</p>
              <h2 className="mt-2 text-xl font-semibold text-brand-text">Reach higher referral tiers</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-brand-muted">Upgrade to premium tiers to increase your referral earnings.</p>
          <Link to="/invest" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[rgba(198,241,53,0.12)] px-4 py-3 text-sm font-semibold text-brand-lime transition hover:bg-[rgba(198,241,53,0.18)]">
            View Upgrade Options
          </Link>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">How It Works</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-text">Referral steps</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 p-4">
                <div style={{ '--wave-delay': `${index * 0.15}s` }} className="wave-bounce-item flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(198,241,53,0.12)] text-brand-lime font-semibold">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm leading-7 text-brand-muted">{step.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Milestone Rewards</p>
              <h2 className="mt-2 text-2xl font-semibold text-brand-text">Growing your network</h2>
            </div>
            <div className="rounded-full border border-brand-border/70 bg-brand-panel/80 px-3 py-1 text-xs uppercase tracking-[0.28em] text-brand-lime">Track progress</div>
          </div>
          <div className="mt-6 space-y-4">
            {milestoneRewards.map((item, index) => (
              <div key={item.label} style={{ '--wave-delay': `${index * 0.15}s` }} className="wave-bounce-item rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-text">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Reward: ₦{item.reward.toLocaleString('en-NG')}</p>
                  </div>
                  <p className="text-sm text-brand-muted">{Math.min(wallet.referralsActive, item.target)}/{item.target}</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(198,241,53,0.12)]">
                  <div className="h-full rounded-full bg-brand-lime" style={{ width: progressWidth(item.target) }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  )
}

export default ReferralPage

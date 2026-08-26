import { ArrowRight, Bell, CheckCircle2, ExternalLink, Gift, Megaphone, Sparkles, Users, WalletCards, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import telegramLogo from '../../assets/brand/telegram.png'

const slides = [
  {
    icon: Megaphone,
    iconClass: 'from-[#2D7FF9] to-[#35B8E8]',
    title: 'Join Our Community',
    subtitle: 'Stay updated with bonuses & rewards',
    body: 'Join the official FlexPay community for updates on bonuses, withdrawals, and special rewards.',
    action: 'Join Telegram Channel',
    href: 'https://t.me/+2bBhQbUIxq1jNTc0',
  },
  {
    icon: Sparkles,
    iconClass: 'from-brand-lime to-[#17CBA2]',
    title: 'Welcome to FlexPay',
    subtitle: 'Your wallet is ready',
    body: 'Your account is live. Explore your wallet, complete real activities, and turn your everyday progress into Naira rewards.',
    action: 'Continue',
  },
  {
    icon: Users,
    iconClass: 'from-[#2F9AF2] to-[#10D68A]',
    title: 'Refer & Earn',
    subtitle: 'Share your link, earn per active referral',
    body: 'Earn ₦15,000 when a referred friend becomes active by completing their first real task or check-in. Milestone bonuses unlock at 10, 25, 50, and 100 active referrals.',
    action: 'Continue',
  },
  {
    icon: Gift,
    iconClass: 'from-[#FFB20F] to-[#FF6B18]',
    title: 'Daily Rewards',
    subtitle: 'Claim bonuses & build check-in streaks',
    body: 'Claim a ₦4,000 daily reward, then build a seven-day check-in streak earning ₦500 every day.',
    action: 'Continue',
  },
  {
    icon: Zap,
    iconClass: 'from-[#AE4FF0] to-[#E83E91]',
    title: 'Your Dashboard',
    subtitle: 'Everything in one place',
    body: 'Your balance, tasks, check-ins, spin & win, referrals, live activity, and transaction history are ready from one home screen.',
    action: 'Continue',
  },
  {
    icon: WalletCards,
    iconClass: 'from-[#16D885] to-[#218CF2]',
    title: 'Withdraw Anytime',
    subtitle: 'Move real Naira when you are ready',
    body: 'Request a withdrawal from your available balance and follow its review status from your wallet.',
    action: 'Get Started',
  },
]

function onboardingKey(userId) {
  return `flexpay-onboarding-complete-${userId}`
}

export function hasCompletedOnboarding(userId) {
  if (typeof window === 'undefined' || !userId) return false
  return window.localStorage.getItem(onboardingKey(userId)) === '1'
}

function OnboardingPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [step, setStep] = useState(0)
  const slide = slides[step]
  const Icon = slide.icon
  const isLast = step === slides.length - 1

  const finish = () => {
    if (session?.id) window.localStorage.setItem(onboardingKey(session.id), '1')
    navigate('/home', { replace: true })
  }

  const next = () => {
    if (isLast) {
      finish()
      return
    }
    setStep((current) => current + 1)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070B] text-brand-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(41,58,78,0.38),transparent_42%)]" />
      <div className="absolute bottom-[-8rem] left-[8%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(18,214,126,0.24),transparent_68%)] blur-2xl" />
      <button type="button" onClick={finish} className="absolute right-4 top-4 z-10 min-h-11 rounded-full border border-white/10 px-4 text-sm font-semibold text-brand-muted transition hover:border-brand-lime/50 hover:text-brand-text sm:right-8 sm:top-6" aria-label="Skip onboarding">Skip</button>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-5 pb-5 pt-20 sm:px-8 sm:pt-24">
        <div key={step} className="flex w-full flex-1 flex-col items-center text-center motion-safe:animate-[onboarding-enter_500ms_ease-out_both]">
          <div className={`relative flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br ${slide.iconClass} shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:h-40 sm:w-40`}>
            <Icon size={62} strokeWidth={1.9} />
            {step === 0 ? <Bell className="absolute -right-2 -top-2 text-[#2D7FF9]" size={20} fill="currentColor" /> : null}
          </div>

          <div className="mt-12 max-w-2xl">
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{step === 1 && session?.name ? `Welcome to ${session.name}` : slide.title}</h1>
            <p className="mt-4 text-lg font-semibold text-brand-lime sm:text-xl">{slide.subtitle}</p>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#9DA5B4] sm:text-lg">{slide.body}</p>
          </div>

          <div className="mt-auto w-full pt-10">
            <div className="mb-7 flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${slides.length}`}>
              {slides.map((item, index) => <span key={item.title} className={`h-2 rounded-full transition-all duration-300 ${index === step ? 'w-12 bg-brand-lime' : 'w-2 bg-white/15'}`} />)}
            </div>
            {step === 0 ? (
              <a href={slide.href} target="_blank" rel="noreferrer" onClick={next} className="mx-auto flex min-h-14 w-full max-w-[500px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#2D7FF9] to-[#35B8E8] px-6 text-lg font-bold text-white shadow-[0_15px_35px_rgba(45,127,249,0.18)] transition hover:brightness-110">
                <img src={telegramLogo} alt="" className="h-5 w-5" />{slide.action}<ExternalLink size={19} />
              </a>
            ) : (
              <button type="button" onClick={next} className="mx-auto flex min-h-14 w-full max-w-[500px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-brand-lime to-[#16CFA0] px-6 text-lg font-bold text-brand-base shadow-[0_15px_35px_rgba(20,210,130,0.18)] transition hover:brightness-110">
                {isLast ? <CheckCircle2 size={20} /> : null}{slide.action}{!isLast ? <ArrowRight size={20} /> : null}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default OnboardingPage

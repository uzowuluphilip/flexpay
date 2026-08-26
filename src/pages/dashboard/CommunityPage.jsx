import { ArrowLeft, Sparkles, Users, Zap, ShieldCheck, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import telegramLogo from '../../assets/brand/telegram.png'

function CommunityPage() {
  const navigate = useNavigate()

  const channels = [
    {
      title: 'Telegram Channel',
      badge: 'Official 📢',
      description: 'Official announcements & payment updates',
      href: 'https://t.me/FlexPayOfficial',
    },
    {
      title: 'Telegram Channel',
      badge: 'Community 💬',
      description: 'Daily tips, winners & community chat',
      href: 'https://t.me/FlexPayCommunity',
    },
    {
      title: 'Telegram Bot',
      badge: 'Bot 🤖',
      description: 'Follow our official bot @FlexPayBot',
      href: 'https://t.me/FlexPayBot',
    },
  ]

  const benefits = [
    { label: 'Instant updates on new features', icon: Zap },
    { label: 'Connect with successful earners', icon: Users },
    { label: 'Exclusive tips & strategies', icon: ShieldCheck },
    { label: 'Special contests & giveaways', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-brand-base text-brand-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4 rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 px-4 py-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)] sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-base/80 text-brand-text transition hover:border-brand-lime"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-brand-lime/10 text-brand-lime shadow-[0_12px_28px_rgba(198,241,53,0.18)]">
            <Users size={24} />
          </div>

          <div>
            <p className="text-xl font-semibold text-brand-text">Community</p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 px-6 py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:px-8">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-lime/15 via-brand-lime/10 to-brand-panel/90 text-brand-lime shadow-[0_12px_28px_rgba(198,241,53,0.18)]">
            <Users size={48} />
          </div>
          <div className="flex items-center justify-center gap-3 text-3xl font-semibold text-brand-text sm:text-4xl">
            <span>Join Our Community</span>
            <span className="text-3xl">🎉</span>
          </div>
          <p className="max-w-xl text-sm text-brand-muted">Tap a channel below to connect with thousands of earners.</p>
        </main>

        <section className="grid gap-4 sm:grid-cols-3">
          {channels.map((channel) => {
            return (
              <div key={channel.title + channel.badge} className="flex flex-col justify-between gap-4 rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_22px_58px_rgba(0,0,0,0.16)]">
                <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[rgba(29,155,240,0.12)] text-[#0088cc]">
                        <img src={telegramLogo} alt="Telegram" className="h-6 w-6" />
                      </div>
                      <div className="rounded-full border border-brand-border/70 bg-brand-panel/80 px-3 py-1 text-xs uppercase tracking-[0.26em] text-brand-lime">
                        {channel.badge}
                      </div>
                    </div>
                <div>
                  <p className="text-lg font-semibold text-brand-text">{channel.title}</p>
                  <p className="mt-2 text-sm leading-6 text-brand-muted">{channel.description}</p>
                </div>
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3 text-sm font-semibold text-brand-base transition hover:opacity-95"
                >
                  Join
                </a>
              </div>
            )
          })}
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Why Join?</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-text">Community benefits</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const BenefitIcon = benefit.icon
              return (
                <div key={benefit.label} className="flex items-start gap-4 rounded-[1.75rem] border border-brand-border/60 bg-brand-base/95 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[rgba(198,241,53,0.12)] text-brand-lime">
                    <BenefitIcon size={20} />
                  </div>
                  <p className="text-sm font-semibold text-brand-text">{benefit.label}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default CommunityPage

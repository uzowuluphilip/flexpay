import { Sparkles, Gift, RotateCw, CheckCircle2, Trophy, Wallet } from 'lucide-react'

const features = [
  {
    title: 'Referral Program',
    copy: 'Invite friends and turn trusted networks into recurring rewards.',
    icon: Sparkles,
  },
  {
    title: 'Daily Check-In',
    copy: 'Come back each day to build streaks and unlock steady bonuses.',
    icon: CheckCircle2,
  },
  {
    title: 'Spin & Win',
    copy: 'Every spin unlocks a chance at extra Naira and surprise boosts.',
    icon: RotateCw,
  },
  {
    title: 'Daily Tasks',
    copy: 'Complete simple activities and keep your balance growing.',
    icon: Gift,
  },
  {
    title: 'Achievements',
    copy: 'Collect badges as you reach milestones and unlock special perks.',
    icon: Trophy,
  },
  {
    title: 'Instant Withdrawal',
    copy: 'Move funds from wallet to cash quickly with transparent processing.',
    icon: Wallet,
  },
]

function FeaturesGrid() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-lime">Features</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text sm:text-4xl">Built for momentum, designed for calm.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="group rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.86)] p-7 transition duration-300 hover:-translate-y-1 hover:border-brand-lime/50">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(198,241,53,0.12)] text-brand-lime">
                  <Icon size={22} />
                </div>
                <h3 className="font-display text-xl text-brand-text">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{feature.copy}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FeaturesGrid

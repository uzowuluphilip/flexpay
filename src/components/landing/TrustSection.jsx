import { ShieldCheck, ReceiptText, Zap } from 'lucide-react'

const trustPoints = [
  {
    title: 'Verified wallet security',
    copy: 'Protect your funds with safeguards designed for peace of mind from day one.',
    icon: ShieldCheck,
  },
  {
    title: 'Transparent payouts',
    copy: 'Referral rewards and task earnings are explained clearly before you claim them.',
    icon: ReceiptText,
  },
  {
    title: 'Fast access to cash',
    copy: 'Withdraw when you need it and keep the experience smooth from from saving to earning to payout.',
    icon: Zap,
  },
]

function TrustSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-brand-border/70 bg-[linear-gradient(135deg,_rgba(198,241,53,0.09),_rgba(11,7,20,0.95))] p-8 sm:p-10 lg:p-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-lime">Why FlexPay</p>
            <h2 className="mt-3 font-display text-3xl text-brand-text sm:text-4xl">Premium confidence, without the friction.</h2>
            <p className="mt-4 text-lg leading-8 text-brand-muted">
              Every part of the experience is built to feel calm, clear, and worth returning to.
            </p>
          </div>
          <div className="rounded-full border border-brand-border/60 bg-[rgba(11,7,20,0.7)] px-4 py-2 text-sm text-brand-muted">
            Trusted by early users across Nigeria
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon
            return (
              <div key={point.title} className="rounded-[1.25rem] border border-brand-border/60 bg-[rgba(11,7,20,0.82)] p-6">
                <div className="mb-4 inline-flex rounded-2xl bg-[rgba(198,241,53,0.12)] p-3 text-brand-lime">
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-xl text-brand-text">{point.title}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{point.copy}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default TrustSection

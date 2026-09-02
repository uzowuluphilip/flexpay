import { useEffect, useState } from 'react'
import { ArrowLeft, BadgeCheck, CircleDot, Eye, ShieldCheck, Sparkles, Users, Wallet, XCircle, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'

const credentials = [
  {
    title: 'CBN',
    subtitle: 'Central Bank of Nigeria',
    description: 'Aligned with CBN financial guidelines, AML directives, and consumer protection for digital reward platforms.',
  },
  {
    title: 'CAC',
    subtitle: 'Corporate Affairs Commission',
    description: 'Officially incorporated as a fully recognized Nigerian business entity.',
  },
  {
    title: 'NDPR',
    subtitle: 'Nigeria Data Protection Regulation',
    description: 'Strict adherence to Nigeria Data Protection Regulation on every record.',
  },
  {
    title: 'SSL',
    subtitle: '256-bit encryption',
    description: 'End-to-end encryption matching the standard of leading financial applications.',
  },
]

const pillars = [
  { title: 'Infrastructure', description: 'Enterprise cloud · 99.9% uptime · DDoS shielded.' },
  { title: 'Surveillance', description: '24/7 fraud monitoring · device fingerprinting.' },
  { title: 'Identity', description: 'Bank-verified account matching on every payout.' },
  { title: 'Live Support', description: 'Human agents — Telegram & in-app, no bots.' },
]

const proofItems = [
  'Transparent on-platform transaction history',
  'Public proof-of-payment community',
  'Manual review on every withdrawal',
  'Verified KYC-style validation',
  'Active anti-fraud & device control',
  'Direct human admin support',
  'Consistent payout track record',
  'Real-time platform announcements',
]

const faqs = [
  { question: 'Is Flexpay a registered company?', answer: 'Yes. We are registered as a company in Nigeria and operate under applicable business regulations.' },
  { question: 'Are you regulated by the Central Bank of Nigeria?', answer: 'We follow Nigerian financial and payout guidelines, with registered operations that align to local standards.' },
  { question: 'How is my personal data protected?', answer: 'Personal data is protected with strict controls and processes built around Nigeria’s data protection regulations.' },
  { question: 'How do I know withdrawals are real?', answer: 'Withdrawals are processed with confirmation steps and human review to keep funds moving securely.' },
  { question: 'What protects me from fraud?', answer: 'We use device checks, activity monitoring, and manual review to detect suspicious behavior early.' },
  { question: 'How do I reach a real human if I need help?', answer: 'Support is available through our help channels, with people ready to respond to your inquiry.' },
]

function AboutPage() {
  const [openIndex, setOpenIndex] = useState(0)
  const [viewerCount, setViewerCount] = useState(27652)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setViewerCount((current) => {
        const direction = Math.random() > 0.48 ? 1 : -1
        const change = Math.floor(Math.random() * 18) + 1
        return Math.min(27950, Math.max(27480, current + direction * change))
      })
    }, 2200)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-5 lg:px-8 lg:py-6">
        <div className="rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/home" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-panel/80 text-brand-text transition hover:border-brand-lime">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center justify-center gap-3 rounded-full border border-brand-border/40 bg-brand-panel/90 px-4 py-2 text-xs uppercase tracking-[0.35em] text-brand-lime sm:text-sm">
              <CircleDot size={12} /> VERIFIED DOSSIER - MMXXVI
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-brand-border/50 bg-brand-panel/90 p-5 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.06)]">
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-brand-lime/60 bg-gradient-to-br from-brand-base via-brand-panel to-brand-panel-2 text-brand-lime shadow-[0_0_0_16px_rgba(124,58,237,0.08)]">
                  <ShieldCheck size={42} />
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-flex rounded-full bg-brand-panel/90 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-brand-lime">Authenticated</span>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/85 p-5">
                <p className="text-xs uppercase tracking-[0.32em] text-brand-lime">CERTIFICATE OF AUTHENTICITY</p>
                <h1 className="mt-4 text-4xl font-semibold leading-tight text-brand-text">Trust & Verified</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-muted">A registered Nigerian rewards institution operating under recognized regulatory frameworks.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-brand-border/50 bg-brand-panel/80 px-4 py-3 text-sm text-brand-lime">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-panel/80 px-3 py-2 text-brand-lime">
                    <Eye size={14} /> {viewerCount.toLocaleString('en-NG')} viewers · live
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-panel/80 px-3 py-2 text-brand-lime">
                    <Users size={14} /> Lagos · Nigeria
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-brand-border/40 bg-brand-panel/90 p-5 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.1)]">
              <div className="flex items-center gap-3 text-brand-lime">
                <span className="rounded-2xl bg-brand-panel/80 px-3 py-2 text-xs uppercase tracking-[0.3em]">Pillars</span>
                <span className="text-xs uppercase tracking-[0.3em] text-brand-muted">04</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {pillars.map((item) => (
                  <div key={item.title} className="rounded-[1.25rem] border border-brand-border/40 bg-brand-panel/80 p-4">
                    <div className="flex items-center gap-3 text-brand-lime">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-panel/80 text-brand-lime">
                        <Sparkles size={18} />
                      </span>
                      <h3 className="text-base font-semibold text-brand-text">{item.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-brand-muted">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/80 p-5 text-center">
                  <p className="text-3xl font-semibold text-brand-text">50K+</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.28em] text-brand-muted">Active Users</p>
                </div>
                <div className="rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/80 p-5 text-center">
                  <p className="text-3xl font-semibold text-brand-text">₦500M+</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.28em] text-brand-muted">Paid Out</p>
                </div>
                <div className="rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/80 p-5 text-center">
                  <p className="text-3xl font-semibold text-brand-text">99.9%</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.28em] text-brand-muted">Uptime</p>
                </div>
                <div className="rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/80 p-5 text-center">
                  <p className="text-3xl font-semibold text-brand-text">MMXXV</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.28em] text-brand-muted">Established</p>
                </div>
              </div>
            </div>
          </div>
          </div>

          <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div className="mx-auto flex items-center gap-3">
                <div className="h-px w-10 bg-brand-border/40" />
                <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Credentials</p>
                <div className="h-px w-10 bg-brand-border/40" />
              </div>
              <div className="text-sm text-brand-muted">04</div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {credentials.map((c, idx) => (
                <div key={c.title} className="relative overflow-hidden rounded-[1.25rem] border border-brand-border/30 bg-gradient-to-b from-brand-base to-brand-panel p-6">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-panel/80 text-brand-lime">
                      {idx === 0 && <ShieldCheck size={18} />}
                      {idx === 1 && <BadgeCheck size={18} />}
                      {idx === 2 && <Wallet size={18} />}
                      {idx === 3 && <XCircle size={18} />}
                    </div>
                    <div className="text-xs text-brand-muted">{String(idx + 1).padStart(2, '0')}</div>
                  </div>

                  <h3 className="mt-6 text-3xl font-semibold text-brand-text">{c.title}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.28em] text-brand-muted">{c.subtitle}</p>
                  <div className="mt-3 h-0.5 w-14 rounded bg-brand-lime" />
                  <p className="mt-4 text-sm leading-7 text-brand-muted">{c.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Proof of Legitimacy</p>
              <h2 className="mt-3 text-3xl font-semibold text-brand-text">Why we stand apart</h2>
            </div>
            <span className="rounded-full border border-brand-border/60 bg-brand-panel/80 px-3 py-1 text-xs uppercase tracking-[0.28em] text-brand-lime">08</span>
          </div>
          <div className="mt-6 grid gap-3 rounded-[1.75rem] border border-brand-border/40 bg-brand-panel/80 p-5">
            {proofItems.map((item, index) => (
              <div key={item} className="flex items-start gap-4 rounded-[1.25rem] border border-brand-border/20 bg-brand-panel/90 px-4 py-3">
                <div className="mt-1 rounded-2xl bg-brand-panel/80 p-3 text-brand-lime">
                  <BadgeCheck size={16} />
                </div>
                <p className="text-sm leading-7 text-brand-muted"><span className="font-semibold text-brand-text">0{index + 1}</span> — {item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Frequently Asked</p>
              <h2 className="mt-3 text-3xl font-semibold text-brand-text">Questions people ask first</h2>
            </div>
            <div className="rounded-2xl border border-brand-border/40 bg-brand-panel/80 px-4 py-3 text-sm text-brand-muted">
              Still have questions? Reach our admin team via <Link to="/about" className="font-semibold text-brand-lime">Support</Link> or <Link to="/spin" className="font-semibold text-brand-lime">Community</Link>.
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {faqs.map((item, index) => {
              const open = openIndex === index
              return (
                <div key={item.question} className="overflow-hidden rounded-[1.5rem] border border-brand-border/40 bg-brand-panel/90">
                  <button onClick={() => setOpenIndex(open ? -1 : index)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-brand-text">
                    <span>{item.question}</span>
                    <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open ? <div className="border-t border-brand-border/20 px-5 py-4 text-sm leading-7 text-brand-muted">{item.answer}</div> : null}
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-brand-border/60 bg-brand-base/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-brand-border/30 bg-brand-panel/90 p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-3xl bg-gradient-to-br from-brand-lime via-brand-panel to-brand-panel-2 p-4 text-brand-lime">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">Issued by</p>
                  <h3 className="mt-2 text-xl font-semibold text-brand-text">Flexpay Limited</h3>
                  <p className="mt-2 text-sm text-brand-muted">Federal Republic of Nigeria</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {['Registered', 'Compliant', 'Operational'].map((label) => (
                  <div key={label} className="rounded-[1.25rem] border border-brand-border/30 bg-brand-panel/90 p-4 text-center text-sm text-brand-muted">
                    <span className="block font-semibold text-brand-text">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-brand-lime/20 bg-brand-panel/90 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-lime">About Flexpay</p>
                  <h3 className="mt-2 text-xl font-semibold text-brand-text">Tap to reveal</h3>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-brand-lime/20 via-brand-panel to-brand-panel p-3 text-brand-lime">
                  <Sparkles size={18} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-brand-muted">Flexpay is designed to provide a transparent rewards platform with a focus on secure, accountable payout experiences for Nigerian users.</p>
            </div>
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  )
}

export default AboutPage

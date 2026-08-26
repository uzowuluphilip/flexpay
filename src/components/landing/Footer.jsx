import logo from '../../assets/brand/flexpay-logo.svg'
import { BadgeCheck, MessageCircle, Play } from 'lucide-react'

function Footer() {
  return (
    <footer className="border-t border-brand-border/70 bg-[rgba(11,7,20,0.95)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <img src={logo} alt="FlexPay logo" className="h-9 w-auto" />
          <p className="mt-4 max-w-md text-sm leading-7 text-brand-muted">
            Naira & Dollar based rewards, instant access, and a premium experience for everyday savings and earning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-brand-muted">
          <a href="#how-it-works" className="transition hover:text-brand-lime">How it works</a>
          <a href="#features" className="transition hover:text-brand-lime">Features</a>
          <a href="#faq" className="transition hover:text-brand-lime">FAQ</a>
          <a href="#" className="transition hover:text-brand-lime">Privacy</a>
        </div>

        <div className="flex items-center gap-3 text-brand-lime">
          <a href="#" aria-label="Verified" className="rounded-full border border-brand-border/70 p-2.5 transition hover:border-brand-lime/60">
            <BadgeCheck size={16} />
          </a>
          <a href="#" aria-label="Community" className="rounded-full border border-brand-border/70 p-2.5 transition hover:border-brand-lime/60">
            <MessageCircle size={16} />
          </a>
          <a href="#" aria-label="Watch" className="rounded-full border border-brand-border/70 p-2.5 transition hover:border-brand-lime/60">
            <Play size={16} />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-brand-border/50 pt-6 text-sm text-brand-muted sm:flex-row sm:justify-between">
        <p>© 2026 FlexPay. All rights reserved.</p>
        <p>Built for the modern Naira wallet experience.</p>
      </div>
    </footer>
  )
}

export default Footer

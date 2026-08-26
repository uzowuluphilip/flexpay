import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/brand/flexpay-logo.svg'

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8"
    >
      <div
        className={`mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-brand-border/80 px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-5 sm:py-3 ${
          scrolled
            ? 'bg-[rgba(11,7,20,0.94)] shadow-[0_20px_60px_rgba(0,0,0,0.28)]'
            : 'bg-[rgba(11,7,20,0.56)]'
        }`}
      >
        <a href="#top" className="flex min-h-[44px] items-center gap-3" aria-label="FlexPay home">
          <img src={logo} alt="FlexPay logo" className="h-8 w-auto sm:h-9" />
        </a>

        <nav className="hidden items-center gap-6 text-sm text-brand-muted md:flex">
          <a href="#how-it-works" className="transition hover:text-brand-lime">How it works</a>
          <a href="#features" className="transition hover:text-brand-lime">Features</a>
          <a href="#faq" className="transition hover:text-brand-lime">FAQ</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden min-h-[44px] items-center rounded-full px-3 py-2 text-sm text-brand-text transition hover:text-brand-lime sm:flex">
            Sign In
          </Link>
          <Link
            to="/register"
            className="flex min-h-[44px] items-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-2 text-sm font-semibold text-brand-base transition hover:brightness-110"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

export default Nav

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Coins } from 'lucide-react'
import gsap from 'gsap'
import { Link } from 'react-router-dom'
import HeroCoin from './HeroCoin'

function Hero() {
  const heroRef = useRef(null)
  const headlineRef = useRef(null)
  const subheadRef = useRef(null)
  const ctaRef = useRef(null)
  const coinWrapRef = useRef(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    return media.matches || window.innerWidth < 768
  })
  const [tilt, setTilt] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMode = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setReducedMotion(media.matches || mobile)
    }
    updateMode()
    media.addEventListener('change', updateMode)
    window.addEventListener('resize', updateMode)

    const onScroll = () => {
      const height = window.innerHeight
      const progress = Math.min(1, Math.max(0, window.scrollY / (height * 0.7)))
      setScrollProgress(progress)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      media.removeEventListener('change', updateMode)
      window.removeEventListener('resize', updateMode)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    if (!heroRef.current || reducedMotion) return

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(
      coinWrapRef.current,
      { opacity: 0, y: 32, scale: 0.96 },
      { duration: 1, opacity: 1, y: 0, scale: 1 }
    )
    tl.fromTo(
      headlineRef.current,
      { opacity: 0, y: 24 },
      { duration: 0.8, opacity: 1, y: 0 },
      '-=0.7'
    )
    tl.fromTo(
      subheadRef.current,
      { opacity: 0, y: 18 },
      { duration: 0.7, opacity: 1, y: 0 },
      '-=0.55'
    )
    tl.fromTo(
      ctaRef.current,
      { opacity: 0, y: 16 },
      { duration: 0.6, opacity: 1, y: 0 },
      '-=0.35'
    )

    return () => tl.kill()
  }, [reducedMotion])

  const onPointerMove = (event) => {
    if (reducedMotion || isMobile) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setTilt(y * 8)
  }

  const badge = useMemo(() => ({ label: 'Naira rewards • instant cash out' }), [])

  return (
    <section id="top" ref={heroRef} className="relative isolate overflow-x-hidden px-4 pb-16 pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-20 lg:px-8 lg:pb-28 lg:pt-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(198,241,53,0.14),_transparent_36%)]" />
      <div className="absolute left-[-5rem] top-16 hidden h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.18),_transparent_65%)] blur-3xl lg:block" />
      <div className="absolute right-[-4rem] bottom-10 hidden h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(198,241,53,0.16),_transparent_75%)] blur-3xl lg:block" />
      <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl items-center gap-8 sm:gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-border/80 bg-[rgba(21,15,46,0.9)] px-4 py-2 text-sm text-brand-muted"
          >
            <Coins size={16} className="text-brand-lime" />
            <span>{badge.label}</span>
          </motion.div>

          <h1
            ref={headlineRef}
            className="font-display text-4xl leading-[0.95] text-brand-text sm:text-5xl lg:text-7xl"
          >
            Turn everyday activity into instant{' '}
            <span className="text-brand-lime">₦ rewards</span>.
          </h1>

          <p ref={subheadRef} className="mt-6 max-w-xl text-lg leading-8 text-brand-muted sm:text-xl">
            FlexPay is a Naira-based wallet for referrals, daily check-ins, savings goals, spin & win, task rewards, and withdrawals that land fast when you need them.
          </p>

          <div ref={ctaRef} className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-start">
            <Link
              to="/register"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-6 py-3.5 text-base font-semibold text-brand-base transition hover:brightness-110"
            >
              Get started <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-border/80 bg-[rgba(21,15,46,0.8)] px-6 py-3.5 text-base font-semibold text-brand-text transition hover:border-brand-lime/60 hover:text-brand-lime"
            >
              See how it works
            </a>
          </div>
        </div>

        <div
          ref={coinWrapRef}
          className="relative mx-auto flex min-h-[280px] w-full max-w-[560px] min-w-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-brand-border/80 bg-[radial-gradient(circle_at_top,_rgba(198,241,53,0.14),_transparent_50%)] p-3 shadow-[0_30px_120px_rgba(0,0,0,0.32)] sm:min-h-[360px] sm:p-6 md:min-h-[420px]"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setTilt(0)}
        >
          <HeroCoin reducedMotion={reducedMotion} isMobile={isMobile} tilt={tilt} scrollProgress={scrollProgress} />
        </div>
      </div>
    </section>
  )
}

export default Hero

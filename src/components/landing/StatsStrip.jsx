import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: '₦1M+', label: 'paid to users' },
  { value: '100k+', label: 'active wallets' },
  { value: '200k+', label: 'average cash-out' },
  { value: '99%', label: 'repeat usage & trust' },
]

function StatsStrip() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    const numbers = element.querySelectorAll('[data-count]')
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        numbers,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
          },
        }
      )
    })

    return () => mm.revert()
  }, [])

  return (
    <section ref={sectionRef} className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 rounded-[1.5rem] border border-brand-border/80 bg-[rgba(21,15,46,0.82)] p-4 md:grid-cols-4 md:p-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[1rem] border border-brand-border/50 bg-[rgba(11,7,20,0.62)] p-6 text-center">
            <p data-count className="font-mono text-3xl font-semibold text-brand-lime sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm uppercase tracking-[0.24em] text-brand-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default StatsStrip

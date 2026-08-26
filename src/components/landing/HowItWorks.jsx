import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    title: 'Create your wallet',
    text: 'Sign up in minutes and open a Naira wallet that’s ready for everyday savings, withdrawals & rewards.',
  },
  {
    title: 'Verify and unlock',
    text: 'Complete your profile so your account can move from earning to instant payouts.',
  },
  {
    title: 'Earn in the flow',
    text: 'Collect referrals, check in daily, spin for prizes, and finish small tasks.',
  },
  {
    title: 'Withdraw instantly',
    text: 'Cash out when it suits you and get your funds moving without delay.',
  },
]

function HowItWorks() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    const cards = element.querySelectorAll('[data-step]')
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.8,
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
    <section id="how-it-works" ref={sectionRef} className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-lime">How it works</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text sm:text-4xl">A simple path from sign-up to real cash.</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} data-step className="rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.86)] p-7">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(198,241,53,0.12)] text-lg font-semibold text-brand-lime">
                {index + 1}
              </div>
              <h3 className="font-display text-xl text-brand-text">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-brand-muted">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'How do withdrawals work?',
    answer: 'Once your wallet is verified, you can request a cash-out and funds are processed quickly through the FlexPay payout flow.',
  },
  {
    question: 'How do referrals pay out?',
    answer: 'Referrals earn rewards when the invited account becomes active, and those earnings appear in your wallet automatically.',
  },
  {
    question: 'Is FlexPay free to join?',
    answer: 'Signing up and opening a wallet is free, while rewards and promotions depend on the activity you complete.',
  },
  {
    question: 'How fast is verification?',
    answer: 'Most verification steps are completed within minutes, so you can move from sign-up to earning sooner.',
  },
  {
    question: 'Can I earn without spending money?',
    answer: 'Yes. FlexPay is built around earning through referrals, check-ins, tasks, spins, and other reward-based activity.',
  },
  {
    question: 'What currencies are supported?',
    answer: 'The experience is focused on Naira & Dollar, with all reward figures and withdrawals presented in ₦&$.',
  },
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-lime">FAQ</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text sm:text-4xl">Questions new users ask first.</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, index) => {
            const active = openIndex === index
            return (
              <div key={item.question} className="rounded-[1.25rem] border border-brand-border/70 bg-[rgba(21,15,46,0.86)]">
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenIndex(active ? -1 : index)}
                >
                  <span className="font-display text-lg text-brand-text">{item.question}</span>
                  <ChevronDown className={`shrink-0 text-brand-lime transition ${active ? 'rotate-180' : ''}`} />
                </button>
                {active ? <p className="px-6 pb-6 text-sm leading-7 text-brand-muted">{item.answer}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ

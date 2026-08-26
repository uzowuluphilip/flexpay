import { Link } from 'react-router-dom'

function FinalCTA() {
  return (
    <section id="final-cta" className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[2rem] border border-brand-border/70 bg-gradient-to-r from-brand-lime via-[#f6c353] to-brand-lime-light p-8 text-brand-base sm:flex-row sm:items-center sm:p-10 lg:p-12">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em]">Ready to join?</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">Create your FlexPay wallet and start earning in minutes.</h2>
        </div>
        <Link
          to="/register"
          className="inline-flex items-center justify-center rounded-full border border-brand-base/20 bg-brand-base px-6 py-3.5 text-base font-semibold text-brand-text transition hover:opacity-90"
        >
          Get Started
        </Link>
      </div>
    </section>
  )
}

export default FinalCTA

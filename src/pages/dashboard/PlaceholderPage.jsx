import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'

function PlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-3 py-6 sm:px-5 lg:px-8">
        <div className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Coming soon</p>
          <h1 className="mt-3 text-2xl font-semibold text-brand-text">{title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-muted">{description}</p>
          <Link to="/home" className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] px-4 py-2.5 text-sm font-semibold text-brand-lime">
            <ArrowLeft size={16} /> Return home
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default PlaceholderPage

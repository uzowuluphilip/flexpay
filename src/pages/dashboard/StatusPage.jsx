import { ArrowDownLeft, ArrowLeft, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { getTransactionHistory } from '../../lib/api/wallet'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(iso) {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
  return `${date} · ${time}`
}

function isAllowedPayment(item) {
  const title = String(item.title || '').toLowerCase()
  return item.credit && Number(item.amount) > 0 && !title.includes('welcome bonus')
}

export default function StatusPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (new URLSearchParams(window.location.search).get('empty') === '1') {
      setItems([])
      return () => { mounted = false }
    }
    getTransactionHistory()
      .then((data) => {
        if (mounted) setItems(data.filter(isAllowedPayment))
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4 rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-base/80 text-brand-text transition hover:border-brand-lime"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-lg font-semibold text-brand-text">Payment Status</p>
            <p className="text-xs text-brand-muted">Completed payment activity</p>
          </div>
        </header>

        <main className="mt-6">
          {error ? (
            <div className="rounded-[1.25rem] border border-red-400/30 bg-red-400/10 p-6 text-center text-sm text-red-200">{error}</div>
          ) : items === null ? (
            <div className="text-center text-sm text-brand-muted">Loading...</div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-brand-border/70 bg-[rgba(11,7,20,0.3)] p-6 text-center text-sm text-brand-muted">No completed payments yet</div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 rounded-[1rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(198,241,53,0.08)] text-brand-lime">
                      <ArrowDownLeft size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-text">{item.title}</p>
                      <p className="mt-1 text-xs text-brand-muted">{formatDateTime(item.timestamp)}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-brand-lime">+{formatCurrency(item.amount)}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-brand-lime/25 bg-brand-lime/10 px-2 py-0.5 text-[11px] font-semibold text-brand-lime"><Check size={11} /> Completed</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

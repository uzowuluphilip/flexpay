import { ArrowLeft, Gift, CheckCircle, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { getTransactionHistory } from '../../lib/api/wallet'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

function formatDateTime(iso) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${sec}`
}

function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)

  useEffect(() => {
    let mounted = true
    const params = new URLSearchParams(window.location.search)
    if (params.get('empty') === '1') {
      // preview empty state
      setItems([])
      return () => (mounted = false)
    }
    getTransactionHistory().then((data) => {
      if (!mounted) return
      setItems(data)
    })
    return () => (mounted = false)
  }, [])

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4 rounded-[1.5rem] bg-brand-panel/90 px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)] border border-brand-border/60">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-base/80 text-brand-text transition hover:border-brand-lime"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="inline-flex rounded-2xl bg-[rgba(255,255,255,0.02)] p-2.5">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <p className="text-lg font-semibold text-brand-text">Transaction History</p>
          </div>
        </header>

        <main className="mt-6">
          {items === null ? (
            <div className="text-center text-sm text-brand-muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-brand-border/70 bg-[rgba(11,7,20,0.3)] p-6 text-center text-sm text-brand-muted">No transactions yet</div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[rgba(198,241,53,0.06)] p-2 text-brand-lime">
                      {iconForType(it.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-brand-text">{it.title}</p>
                      <p className="text-xs text-brand-muted">{formatDateTime(it.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {it.credit ? (
                      <p className="font-mono text-sm font-semibold text-brand-lime">+{formatCurrency(it.amount)}</p>
                    ) : (
                      <p className="font-mono text-sm font-semibold text-brand-muted">-{formatCurrency(it.amount)}</p>
                    )}
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

function iconForType(type) {
  switch (type) {
    case 'task':
      return <CheckCircle size={18} />
    case 'checkin':
      return <Gift size={18} />
    case 'referral':
      return <Users size={18} />
    case 'withdraw':
      return <ArrowDownLeft size={18} />
    default:
      return <CheckCircle size={18} />
  }
}

export default HistoryPage

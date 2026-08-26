import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BadgeDollarSign, CircleDollarSign, Landmark, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { getInvestLocks, lockFunds } from '../../lib/api/wallet'

const plans = [
  { name: 'Starter', tier: '30-day lock', icon: BadgeDollarSign, amount: 20000, bonus: 1000 },
  { name: 'Growth', tier: '30-day lock', icon: CircleDollarSign, amount: 50000, bonus: 2500 },
  { name: 'Balanced', tier: '30-day lock', icon: Landmark, amount: 100000, bonus: 5000 },
  { name: 'Premium', tier: '30-day lock', icon: Sparkles, amount: 200000, bonus: 10000 },
]

const sliderSteps = [20000, 50000, 100000, 200000]

function InvestPage() {
  const [selected, setSelected] = useState(1)
  const [deposit, setDeposit] = useState(sliderSteps[1])
  const [locks, setLocks] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadLocks() {
      const data = await getInvestLocks()
      setLocks(data)
    }

    loadLocks()
  }, [])

  const currentPlan = useMemo(() => plans[selected], [selected])

  const handleSliderChange = (value) => {
    const amount = Number(value)
    const index = sliderSteps.indexOf(amount)
    if (index >= 0) {
      setSelected(index)
      setDeposit(amount)
    }
  }

  const handleLock = async () => {
    setSubmitting(true)
    setMessage('')
    try {
      const result = await lockFunds(deposit)
      setMessage(`Lock created: ₦${result.amount.toLocaleString('en-NG')} + ₦${result.bonus.toLocaleString('en-NG')} bonus`)
      const refreshed = await getInvestLocks()
      setLocks(refreshed)
    } catch (error) {
      setMessage(error.message || 'Could not lock funds.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex items-center gap-3">
            <Link to="/home" className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Invest</p>
              <h1 className="mt-1 text-2xl font-semibold text-brand-text">Lock & Earn Bonus</h1>
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
                <CircleDollarSign size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-brand-text">FlexPay Lock & Earn Bonus</h2>
                <p className="mt-2 text-sm leading-7 text-brand-muted">Lock a real amount for 30 days and earn a fixed bonus when your lock matures.</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-brand-text">Choose a lock</h2>
              <p className="text-sm text-brand-muted">Fixed bonus • no percentage</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan, index) => {
                const Icon = plan.icon
                const active = index === selected
                return (
                  <div key={plan.name} className={`rounded-[1.25rem] border p-4 ${active ? 'border-brand-lime/70 bg-[rgba(198,241,53,0.1)]' : 'border-brand-border/70 bg-[rgba(11,7,20,0.4)]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${active ? 'bg-brand-lime/20 text-brand-lime' : 'bg-[rgba(198,241,53,0.08)] text-brand-lime'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">{plan.name}</h3>
                        <p className="text-sm text-brand-muted">{plan.tier}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-brand-muted">Lock</div>
                    <div className="mt-2 text-2xl font-semibold text-brand-text">₦{plan.amount.toLocaleString('en-NG')}</div>
                    <div className="mt-3 text-sm text-brand-lime">Bonus on unlock: ₦{plan.bonus.toLocaleString('en-NG')}</div>
                    <button onClick={() => { setSelected(index); setDeposit(plan.amount) }} className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold ${active ? 'bg-brand-lime text-brand-base' : 'border border-brand-border/70 bg-[rgba(11,7,20,0.4)] text-brand-lime'}`}>
                      {active ? 'Selected' : 'Choose'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">Choose an amount</h2>
                <p className="mt-2 text-sm leading-7 text-brand-muted">Pick the amount you want to hold for 30 days.</p>
              </div>
              <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] px-3 py-1 text-sm text-brand-lime">{deposit.toLocaleString('en-NG')} ₦</div>
            </div>

            <div className="mt-4">
              <input type="range" min="20000" max="200000" step="30000" value={deposit} onChange={(event) => handleSliderChange(event.target.value)} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(198,241,53,0.2)] accent-brand-lime" />
              <div className="mt-3 flex flex-wrap gap-2">
                {sliderSteps.map((step) => (
                  <button key={step} onClick={() => handleSliderChange(step)} className={`rounded-full px-3 py-1.5 text-sm ${deposit === step ? 'bg-brand-lime text-brand-base' : 'border border-brand-border/70 bg-[rgba(21,15,46,0.9)] text-brand-muted'}`}>
                    {step.toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(21,15,46,0.9)] p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Lock summary</p>
              <p className="mt-2 text-xl font-semibold text-brand-text">Lock ₦{deposit.toLocaleString('en-NG')} for 30 days</p>
              <p className="mt-2 text-sm text-brand-lime">Bonus on unlock: ₦{currentPlan.bonus.toLocaleString('en-NG')}</p>
              <button onClick={handleLock} disabled={submitting} className="mt-4 w-full rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3 text-sm font-semibold text-brand-base disabled:cursor-not-allowed disabled:opacity-75">
                {submitting ? 'Locking...' : 'Select Plan'}
              </button>
              {message ? <p className="mt-3 text-sm text-brand-lime">{message}</p> : null}
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-brand-text">Your Locked Funds</h2>
            {locks.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No active locks yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {locks.map((lock) => (
                  <div key={lock.id} className="rounded-[1rem] border border-brand-border/70 bg-[rgba(21,15,46,0.9)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-brand-text">₦{Number(lock.amount || 0).toLocaleString('en-NG')}</p>
                      <span className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-brand-lime">{lock.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-brand-muted">Bonus: ₦{Number(lock.bonus || 0).toLocaleString('en-NG')}</p>
                    <p className="mt-1 text-xs text-brand-muted">Unlocks: {new Date(lock.unlocks_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default InvestPage

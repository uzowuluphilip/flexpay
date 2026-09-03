import { ArrowLeft, Banknote, Clipboard, CreditCard, ListChecks, LockKeyhole, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import BottomNav from '../../components/dashboard/BottomNav'
import BankSelector from '../../components/BankSelector'
import { getWithdrawProgress, submitWithdrawal } from '../../lib/api/wallet'
import { useNavigate } from 'react-router-dom'

const initialProgress = { balance: 0, referrals: 0, tasks: 0, claims: 0 }

function clampPercent(value, target) {
  return Math.min(100, Math.round((value / target) * 100))
}

function WithdrawPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('referrals')
  const [progress, setProgress] = useState(initialProgress)
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getWithdrawProgress().then(setProgress).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const withReferralsComplete = progress.referrals >= 10 && progress.tasks >= 7 && progress.claims >= 5 && progress.balance >= 200000
  const noReferralsComplete = progress.tasks >= 15 && progress.claims >= 10 && progress.balance >= 200000
  const requirements = tab === 'referrals'
    ? [
      { icon: <Users size={18} />, title: 'Referrals invited', description: 'Invite 10 people with your referral link', value: progress.referrals, target: 10, text: `${progress.referrals} / 10` },
      { icon: <ListChecks size={18} />, title: 'Tasks completed', description: 'Complete 7 daily tasks', value: progress.tasks, target: 7, text: `${progress.tasks} / 7` },
      { icon: <Clipboard size={18} />, title: 'Claims made', description: 'Make 5 claims from your dashboard', value: progress.claims, target: 5, text: `${progress.claims} / 5` },
      { icon: <CreditCard size={18} />, title: 'Account balance', description: 'Reach a balance of ₦200,000', value: progress.balance, target: 200000, text: `₦${progress.balance.toLocaleString()} / ₦200,000` },
    ]
    : [
      { icon: <ListChecks size={18} />, title: 'Tasks completed', description: 'Complete 15 daily tasks (no referrals needed)', value: progress.tasks, target: 15, text: `${progress.tasks} / 15` },
      { icon: <Clipboard size={18} />, title: 'Claims made', description: 'Make 10 claims from your dashboard', value: progress.claims, target: 10, text: `${progress.claims} / 10` },
      { icon: <CreditCard size={18} />, title: 'Account balance', description: 'Reach a balance of ₦200,000', value: progress.balance, target: 200000, text: `₦${progress.balance.toLocaleString()} / ₦200,000` },
    ]
  const completedRequirements = requirements.filter((item) => item.value >= item.target).length
    const withdrawalUnlocked = withReferralsComplete || noReferralsComplete

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await submitWithdrawal({ amount, bank_name: bankName, account_number: accountNumber, account_name: accountName })
      window.dispatchEvent(new CustomEvent('flexpay-request-submitted', { detail: { type: 'withdrawal' } }))
      setMessage(`Withdrawal request submitted: ₦${Number(result.withdrawal?.amount ?? amount).toLocaleString()}`)
      setAmount('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4 rounded-[1.5rem] border border-brand-border/60 bg-brand-panel/90 px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
          <button type="button" onClick={() => navigate('/home')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-base/80 transition hover:border-brand-lime" aria-label="Go back"><ArrowLeft size={18} /></button>
          <div><p className="text-lg font-semibold">Withdraw</p><p className="text-xs text-brand-muted">Request a payout from your available balance</p></div>
        </header>

        <main className="mt-6 space-y-6">
          <section className="rounded-[1.25rem] border border-brand-border/60 bg-brand-panel/90 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Available balance</p>
            <p className="mt-2 font-mono text-3xl font-extrabold">{loading ? '...' : `₦${progress.balance.toLocaleString()}`}</p>
            <p className="mt-2 text-sm text-brand-muted">Your withdrawal amount is checked against this real available balance.</p>
          </section>

          <section className="rounded-[1.25rem] border border-brand-border/60 bg-brand-panel/90 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-5">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="text-brand-lime" size={20} /><h2 className="text-lg font-semibold">Unlock requirements</h2></div><p className="shrink-0 text-sm font-semibold text-brand-lime">{completedRequirements} of {requirements.length}</p></div>
            <p className="mt-1 text-sm text-brand-muted">Unlock badges as you go. These progress goals are informational and never block withdrawals.</p>
            <div className="mt-4 inline-flex rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.5)] p-1"><button type="button" onClick={() => setTab('referrals')} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${tab === 'referrals' ? 'bg-gradient-to-r from-brand-lime to-brand-lime-light text-brand-base' : 'text-brand-muted'}`}>With Referrals</button><button type="button" onClick={() => setTab('none')} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${tab === 'none' ? 'bg-gradient-to-r from-brand-lime to-brand-lime-light text-brand-base' : 'text-brand-muted'}`}>No Referrals</button></div>
            <div className="mt-4 rounded-[0.85rem] border border-brand-border/60 bg-[rgba(11,7,20,0.4)] p-4"><div className="space-y-5">{requirements.map((item) => <RequirementRow key={item.title} {...item} />)}</div></div>
            <div className="mt-4 flex gap-3"><button type="button" onClick={() => navigate('/tasks')} className="min-h-11 flex-1 rounded-full bg-[rgba(198,241,53,0.1)] px-4 py-2 text-sm font-semibold text-brand-lime">Do tasks</button><button type="button" onClick={() => navigate(tab === 'referrals' ? '/referrals' : '/spin')} className="min-h-11 flex-1 rounded-full border border-brand-border/70 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm font-semibold">{tab === 'referrals' ? 'Invite friends' : 'Earn more'}</button></div>
          </section>

          {withdrawalUnlocked ? <section className="rounded-[1.25rem] border border-brand-border/60 bg-brand-panel/90 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"><div className="flex items-center gap-3"><Banknote className="text-brand-lime" size={22} /><div><h2 className="text-lg font-semibold">Request withdrawal</h2><p className="text-sm text-brand-muted">Your request is evaluated by your real balance guard, not the progress panel.</p></div></div><form onSubmit={handleSubmit} className="mt-5 space-y-3"><input required type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount in ₦" className="min-h-11 w-full rounded-xl border border-brand-border/70 bg-brand-base px-3 text-brand-text outline-none focus:border-brand-lime" /><BankSelector value={bankName} onChange={setBankName} required /><input required value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" className="min-h-11 w-full rounded-xl border border-brand-border/70 bg-brand-base px-3 text-brand-text outline-none focus:border-brand-lime" /><input required value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Account name" className="min-h-11 w-full rounded-xl border border-brand-border/70 bg-brand-base px-3 text-brand-text outline-none focus:border-brand-lime" /><button type="submit" disabled={submitting} className="min-h-11 w-full rounded-xl bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3 font-semibold text-brand-base disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit withdrawal request'}</button></form>{message ? <p className="mt-3 rounded-xl border border-brand-lime/30 bg-brand-lime/10 p-3 text-sm text-brand-lime">{message}</p> : null}{error ? <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}</section> : <section className="flex min-h-[205px] flex-col items-center justify-center rounded-[1.25rem] border border-brand-border/60 bg-brand-panel/90 p-5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.18)]"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(198,241,53,0.12)] text-brand-lime"><LockKeyhole size={30} /></div><h2 className="mt-4 text-lg font-semibold">Withdrawal locked</h2><p className="mt-2 max-w-md text-sm leading-6 text-brand-muted">Invite 10 referrals, complete 7 tasks, make 5 claims and reach ₦200,000 to unlock.</p></section>}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

function RequirementRow({ icon, title, description, value, target, text }) {
  return <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)] text-brand-lime">{icon}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-brand-muted">{description}</p></div><p className="shrink-0 text-xs text-brand-muted">{text}</p></div><div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]"><div className="h-full rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light" style={{ width: `${clampPercent(value, target)}%` }} /></div></div></div>
}

export default WithdrawPage

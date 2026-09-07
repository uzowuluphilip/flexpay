import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Copy, FileUp, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getLoans, getTopupConfig, submitLoanRepayment, submitLoanRequest, submitLoanUnlockReceipt } from '../../lib/api/wallet'

const incomeOptions = ['Below ₦50,000', '₦50,000 - ₦149,999', '₦150,000 - ₦299,999', '₦300,000+']
const fileTypes = ['image/jpeg', 'image/png', 'application/pdf']

export default function LoanPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [data, setData] = useState({ requests: [], loans: [] })
  const [config, setConfig] = useState(null)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('employed')
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState(incomeOptions[0])
  const [idDocument, setIdDocument] = useState(null)
  const [proofOfAddress, setProofOfAddress] = useState(null)
  const [repaymentLoan, setRepaymentLoan] = useState(null)
  const [repaymentAmount, setRepaymentAmount] = useState('')
  const [repaymentReceipt, setRepaymentReceipt] = useState(null)
  const [unlockReceipt, setUnlockReceipt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const numericAmount = Number(amount) || 0
  const fee = Math.round(numericAmount * 0.05)
  const total = numericAmount + fee
  const formatted = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

  const load = async () => {
    try { setData(await getLoans(token)) } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => {
    getLoans(token).then(setData).catch((requestError) => setError(requestError.message))
    getTopupConfig(token).then(setConfig).catch(() => undefined)
  }, [token])

  const validateFile = (file, label) => {
    if (!file) return `${label} is required.`
    if (!fileTypes.includes(file.type)) return `${label} must be a JPG, PNG, or PDF file.`
    if (file.size > 5 * 1024 * 1024) return `${label} must be 5MB or smaller.`
    return ''
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const fileError = validateFile(idDocument, 'ID document') || validateFile(proofOfAddress, 'Proof of address')
    if (numericAmount < 1000 || numericAmount > 500000) return setError('Enter a loan amount from ₦1,000 to ₦500,000.')
    if (!purpose.trim()) return setError('Tell us what the loan is for.')
    if (fileError) return setError(fileError)
    try {
      setBusy(true)
      await submitLoanRequest({ amount: numericAmount, purpose, employmentStatus, monthlyIncomeRange, idDocument, proofOfAddress }, token)
      setNotice('Loan request submitted. It is now under review.')
      setAmount(''); setPurpose(''); setIdDocument(null); setProofOfAddress(null)
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  const submitRepayment = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const numericRepayment = Number(repaymentAmount) || 0
    const fileError = validateFile(repaymentReceipt, 'Repayment receipt')
    if (!repaymentLoan || numericRepayment <= 0 || numericRepayment > repaymentLoan.remainingBalance) return setError('Enter a repayment no higher than the remaining balance.')
    if (fileError) return setError(fileError)
    try {
      setBusy(true)
      await submitLoanRepayment(repaymentLoan.id, numericRepayment, repaymentReceipt, token)
      setNotice('Repayment submitted for review. Your loan balance changes after approval.')
      setRepaymentLoan(null); setRepaymentAmount(''); setRepaymentReceipt(null)
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  const activeLoan = data.loans.find((loan) => loan.status === 'active')
  const pendingRequest = data.requests.find((request) => request.status === 'pending')
  const loanAccessUnlocked = Boolean(data.loanAccessUnlocked)
  const canRequest = !activeLoan && !pendingRequest && loanAccessUnlocked
  const loanMath = useMemo(() => ({ fee, total }), [fee, total])

  const submitUnlock = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!unlockReceipt) {
      setError('Upload your payment proof to unlock the loan feature.')
      return
    }

    try {
      setBusy(true)
      await submitLoanUnlockReceipt(unlockReceipt, token)
      setNotice('Loan unlock payment submitted. Review is required within 1 hour before the loan feature opens.')
      setUnlockReceipt(null)
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const bankDetails = config ? [
    { label: 'Bank', value: config.bankName },
    { label: 'Account number', value: config.accountNumber },
    { label: 'Account name', value: config.accountName },
  ] : []

  if (!loanAccessUnlocked && !activeLoan && !pendingRequest) {
    return <div className="min-h-screen bg-brand-base px-4 py-6 pb-12 text-brand-text sm:px-6"><main className="mx-auto max-w-2xl"><button type="button" onClick={() => navigate('/home')} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-brand-muted hover:text-brand-text"><ArrowLeft size={18} /> Back to wallet</button><div className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 sm:p-8"><p className="text-xs uppercase tracking-[0.25em] text-brand-muted">FlexPay lending</p><h1 className="mt-2 text-3xl font-semibold">Unlock the loan feature</h1><p className="mt-3 text-brand-muted">Pay the ₦7,700 unlock fee to activate the loan request flow. This is reviewed by admin before the loan feature is enabled.</p><div className="mt-6 rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.5)] p-4"><div className="space-y-3 text-sm">{bankDetails.map((item) => <div key={item.label} className="flex items-center justify-between gap-3"><span className="text-brand-muted">{item.label}</span><span className="flex items-center gap-2 text-right font-medium">{item.value || 'Not configured'}{item.value ? <button type="button" aria-label={`Copy ${item.label}`} onClick={() => navigator.clipboard?.writeText(item.value)} className="text-brand-lime"><Copy size={15} /></button> : null}</span></div>)}</div></div><form onSubmit={submitUnlock} className="mt-6 space-y-5"><label className="block"><span className="text-sm text-brand-muted">Unlock amount</span><div className="mt-2 flex items-center rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.52)] px-4"><span className="text-2xl text-brand-muted">₦</span><input value="7,700" readOnly className="w-full bg-transparent px-3 py-4 text-3xl font-semibold outline-none" /></div></label><DocumentInput label="Upload transfer receipt" file={unlockReceipt} onChange={setUnlockReceipt} />{error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}{notice ? <p className="rounded-xl border border-brand-lime/30 bg-brand-lime/10 p-3 text-sm text-brand-lime">{notice}</p> : null}<button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-lime px-4 py-3 font-semibold text-brand-base disabled:opacity-60"><FileUp size={18} />{busy ? 'Submitting...' : 'Submit unlock payment proof'}</button></form></div></main></div>
  }

  return <div className="min-h-screen bg-brand-base px-4 py-5 pb-12 text-brand-text sm:px-6"><main className="mx-auto max-w-4xl"><button type="button" onClick={() => navigate('/home')} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-brand-muted hover:text-brand-text"><ArrowLeft size={18} /> Back to wallet</button><header className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 sm:p-8"><p className="text-xs uppercase tracking-[0.25em] text-brand-muted">FlexPay lending</p><h1 className="mt-2 text-3xl font-semibold">Loan</h1><p className="mt-2 text-brand-muted">Request funds with the 5% flat fee shown before you submit.</p></header>{error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}{notice ? <p className="mt-4 rounded-xl border border-brand-lime/30 bg-brand-lime/10 p-3 text-sm text-brand-lime">{notice}</p> : null}<section className="mt-5 rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-brand-muted">My loan</p><h2 className="mt-2 text-2xl font-semibold">{activeLoan ? 'Active loan' : pendingRequest ? 'Request under review' : 'No active loan'}</h2></div>{activeLoan ? <span className="rounded-full bg-brand-lime/10 px-3 py-2 text-sm text-brand-lime">Active</span> : null}</div>{activeLoan ? <div className="mt-5 grid gap-3 sm:grid-cols-4">{[['Principal', activeLoan.principal], ['Fee', activeLoan.fee], ['Repaid', activeLoan.amountRepaid], ['Remaining', activeLoan.remainingBalance]].map(([label, value]) => <div key={label} className="rounded-2xl border border-brand-border/70 bg-brand-base/50 p-4"><p className="text-xs text-brand-muted">{label}</p><p className="mt-2 text-xl font-semibold">{formatted(value)}</p></div>)}</div> : pendingRequest ? <p className="mt-4 text-brand-muted">{formatted(pendingRequest.amount)} requested · total repayable {formatted(pendingRequest.totalRepayable)}. No money moves until an admin approves it.</p> : <p className="mt-4 text-brand-muted">Submit a request below to begin.</p>}{activeLoan ? <button type="button" onClick={() => setRepaymentLoan(activeLoan)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-lime px-5 py-3 font-semibold text-brand-base"><FileUp size={17} /> Repay this loan</button> : null}</section>{canRequest ? <section className="mt-5 rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 sm:p-8"><h2 className="text-2xl font-semibold">Request a loan</h2><form onSubmit={submitRequest} className="mt-5 space-y-5"><label className="block"><span className="text-sm text-brand-muted">Amount</span><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="₦0" className="mt-2 w-full rounded-2xl border border-brand-border/70 bg-brand-base/50 px-4 py-4 text-2xl font-semibold text-brand-text placeholder:text-brand-muted outline-none" /></label><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-brand-border/70 bg-brand-base/50 p-4"><p className="text-sm text-brand-muted">Fee (5% flat)</p><p className="mt-2 text-xl font-semibold">{formatted(loanMath.fee)}</p></div><div className="rounded-2xl border border-brand-lime/30 bg-brand-lime/10 p-4"><p className="text-sm text-brand-muted">Total repayable</p><p className="mt-2 text-xl font-semibold text-brand-lime">{formatted(loanMath.total)}</p></div></div><label className="block"><span className="text-sm text-brand-muted">Purpose</span><input value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={255} placeholder="What will you use the loan for?" className="mt-2 w-full rounded-xl border border-brand-border/70 bg-brand-base/50 px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm text-brand-muted">Employment status</span><select value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border/70 bg-brand-base/50 px-4 py-3 text-brand-text"><option className="bg-brand-panel text-brand-text" value="employed">Employed</option><option className="bg-brand-panel text-brand-text" value="self-employed">Self-employed</option><option className="bg-brand-panel text-brand-text" value="student">Student</option><option className="bg-brand-panel text-brand-text" value="unemployed">Unemployed</option></select></label><label className="block"><span className="text-sm text-brand-muted">Monthly income range</span><select value={monthlyIncomeRange} onChange={(event) => setMonthlyIncomeRange(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border/70 bg-brand-base/50 px-4 py-3 text-brand-text">{incomeOptions.map((option) => <option className="bg-brand-panel text-brand-text" key={option}>{option}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-2"><DocumentInput label="ID document" file={idDocument} onChange={setIdDocument} /><DocumentInput label="Proof of address" file={proofOfAddress} onChange={setProofOfAddress} /></div><p className="text-xs leading-6 text-brand-muted">Upload a JPG, PNG, or PDF. Do not enter BVN, NIN, passport numbers, or other government ID numbers.</p><button disabled={busy} className="min-h-11 w-full rounded-xl bg-brand-lime px-4 py-3 font-semibold text-brand-base disabled:opacity-60">{busy ? 'Submitting...' : 'Submit loan request'}</button></form></section> : null}<section className="mt-5 rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 sm:p-8"><h2 className="text-xl font-semibold">Bank transfer details</h2><p className="mt-2 text-sm text-brand-muted">Use these details when repaying. Your repayment receipt is reviewed manually.</p><div className="mt-4 space-y-3 rounded-2xl border border-brand-lime/30 bg-brand-lime/5 p-4 text-sm"><CopyRow label="Bank" value={config?.bankName} /><CopyRow label="Account number" value={config?.accountNumber} /><CopyRow label="Account name" value={config?.accountName} /></div></section>{repaymentLoan ? <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4"><form onSubmit={submitRepayment} className="w-full max-w-lg rounded-2xl bg-brand-panel p-6"><h2 className="text-xl font-semibold">Repay loan</h2><p className="mt-2 text-sm text-brand-muted">Remaining balance: {formatted(repaymentLoan.remainingBalance)}</p><input value={repaymentAmount} onChange={(event) => setRepaymentAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Amount transferred" className="mt-5 w-full rounded-xl border border-brand-border bg-brand-base px-4 py-3 text-brand-text placeholder:text-brand-muted" /><DocumentInput label="Transfer receipt" file={repaymentReceipt} onChange={setRepaymentReceipt} /><div className="mt-5 flex gap-3"><button type="button" onClick={() => setRepaymentLoan(null)} className="min-h-11 flex-1 rounded-xl border border-brand-border">Cancel</button><button disabled={busy} className="min-h-11 flex-1 rounded-xl bg-brand-lime font-semibold text-brand-base">Submit repayment</button></div></form></div> : null}</main></div>
}

function DocumentInput({ label, file, onChange }) {
  return <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border/80 bg-brand-base/40 p-4 text-center"><UploadCloud className="text-brand-lime" size={24} /><span className="mt-2 text-sm font-semibold">{label}</span><span className="mt-1 text-xs text-brand-muted">JPG, PNG, or PDF · max 5MB</span>{file ? <span className="mt-2 max-w-full truncate text-xs text-brand-lime">{file.name}</span> : null}<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => onChange(event.target.files[0] || null)} className="hidden" /></label>
}

function CopyRow({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-brand-muted">{label}</span><span className="flex items-center gap-2 font-medium">{value || 'Not configured'}{value ? <button type="button" aria-label={`Copy ${label}`} onClick={() => navigator.clipboard?.writeText(value)} className="text-brand-lime"><Copy size={15} /></button> : null}</span></div>
}

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, FileUp, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTopupConfig, submitTopupReceipt } from '../../lib/api/wallet'
import { useAuth } from '../../hooks/useAuth'

const presets = [5000, 10000, 20000, 50000]

export default function TopUpPage() {
  const navigate = useNavigate()
  const { session, token, signOut } = useAuth()
  const [config, setConfig] = useState(null)
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [stage, setStage] = useState('amount')

  useEffect(() => {
    if (!token) return
    getTopupConfig(token).then(setConfig).catch((err) => {
      setError(err.message)
      if (err.message === 'Session not found or expired.') signOut()
    })
  }, [signOut, token])

  const numericAmount = Number(amount) || 0
  const fee = Math.round(numericAmount * 0.02)
  const total = numericAmount + fee
  const formatted = (value) => `₦${value.toLocaleString('en-NG')}`
  const displayName = config?.user?.name || session?.name || 'FlexPay member'
  const verified = config?.user?.verified ?? false
  const fileError = useMemo(() => {
    if (!file) return ''
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return 'Choose a JPG, PNG, or PDF receipt.'
    if (file.size > 5 * 1024 * 1024) return 'Receipt must be 5MB or smaller.'
    return ''
  }, [file])

  const copy = async (value) => {
    if (value) await navigator.clipboard?.writeText(value)
  }

  const chooseFile = (nextFile) => {
    setFile(nextFile)
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (numericAmount < 100 || numericAmount > 500000) return setError('Enter an amount from ₦100 to ₦500,000.')
    if (!file) return setError('Upload your transfer receipt to continue.')
    if (fileError) return setError(fileError)
    try {
      setBusy(true)
      await submitTopupReceipt(numericAmount, file, token)
      setSubmitted(true)
      window.setTimeout(() => navigate('/home'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return <div className="min-h-screen bg-brand-base px-4 py-12 text-brand-text"><div className="mx-auto max-w-lg rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-8 text-center"><Check className="mx-auto text-brand-lime" size={42} /><h1 className="mt-4 text-2xl font-semibold">Top-up request submitted</h1><p className="mt-2 text-brand-muted">Processing...</p></div></div>
  }

  if (stage === 'transition') {
    return <div className="flex min-h-screen items-center justify-center bg-brand-base px-5 text-center text-brand-text"><div className="max-w-sm rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-border border-t-brand-lime" /><p className="mt-5 text-xs uppercase tracking-[0.25em] text-brand-muted">Payment details</p><h1 className="mt-3 text-2xl font-semibold">Preparing your transfer details</h1><p className="mt-3 text-brand-muted">Amount selected: <span className="font-semibold text-brand-lime">{formatted(numericAmount)}</span></p></div></div>
  }

  if (stage === 'amount') {
    return <div className="min-h-screen bg-brand-base px-4 py-6 pb-12 text-brand-text sm:px-6"><main className="mx-auto max-w-2xl"><button onClick={() => navigate('/home')} className="mb-5 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text"><ArrowLeft size={18} /> Back to wallet</button><div className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8"><p className="text-xs uppercase tracking-[0.25em] text-brand-muted">Add balance</p><h1 className="mt-2 text-3xl font-semibold">How much do you want to add?</h1><div className="mt-6 rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.42)] p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-lime font-semibold text-brand-base">{displayName[0]}</div><div><p className="font-semibold">{displayName}</p><p className="text-sm text-brand-muted">{verified ? 'Verified profile' : 'Email verification pending'} · funds credit to this account</p></div></div></div><div className="mt-6 flex items-center rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.52)] px-4"><span className="text-2xl text-brand-muted">₦</span><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" aria-label="Amount to add" className="w-full bg-transparent px-3 py-4 text-3xl font-semibold outline-none" /></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{presets.map((preset) => <button type="button" key={preset} onClick={() => setAmount(String(preset))} className="rounded-xl border border-brand-border/70 px-3 py-3 text-sm hover:border-brand-lime hover:text-brand-lime">{formatted(preset)}</button>)}</div><div className="mt-5 space-y-2 rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.3)] p-4 text-sm"><div className="flex justify-between"><span className="text-brand-muted">Amount</span><span>{formatted(numericAmount)}</span></div><div className="flex justify-between"><span className="text-brand-muted">FlexPay service fee (2%)</span><span>{formatted(fee)}</span></div><div className="flex justify-between border-t border-brand-border/60 pt-3 text-base font-semibold"><span>Total to pay</span><span className="text-brand-lime">{formatted(total)}</span></div></div>{error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}<button type="button" onClick={() => { if (numericAmount < 100 || numericAmount > 500000) { setError('Enter an amount from ₦100 to ₦500,000.'); return } setError(''); setStage('transition'); window.setTimeout(() => setStage('payment'), 1200) }} className="mt-5 w-full rounded-xl bg-brand-lime px-4 py-3 font-semibold text-brand-base">Continue</button></div></main></div>
  }

  return (
    <div className="min-h-screen bg-brand-base px-4 py-6 pb-12 text-brand-text sm:px-6">
      <main className="mx-auto max-w-2xl">
        <button onClick={() => setStage('amount')} className="mb-5 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text"><ArrowLeft size={18} /> Change amount</button>
        <div className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.94)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-brand-muted">Add balance</p>
          <h1 className="mt-2 text-3xl font-semibold">Complete your payment</h1>
          <div className="mt-6 rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.42)] p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-lime font-semibold text-brand-base">{displayName[0]}</div><div><p className="font-semibold">Account ready for {displayName}</p><p className="text-sm text-brand-muted">{verified ? 'Verified profile' : 'Email verification pending'} · funds credit to this account</p></div></div></div>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block"><span className="text-sm text-brand-muted">AMOUNT TO TRANSFER</span><div className="mt-2 flex items-center rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.52)] px-4"><span className="text-2xl text-brand-muted">₦</span><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" className="w-full bg-transparent px-3 py-4 text-3xl font-semibold outline-none" /></div></label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{presets.map((preset) => <button type="button" key={preset} onClick={() => setAmount(String(preset))} className="rounded-xl border border-brand-border/70 px-3 py-3 text-sm hover:border-brand-lime hover:text-brand-lime">{formatted(preset)}</button>)}</div>
            <div className="space-y-2 rounded-2xl border border-brand-border/70 bg-[rgba(11,7,20,0.3)] p-4 text-sm"><div className="flex justify-between"><span className="text-brand-muted">Amount</span><span>{formatted(numericAmount)}</span></div><div className="flex justify-between"><span className="text-brand-muted">FlexPay service fee (2%)</span><span>{formatted(fee)}</span></div><div className="flex justify-between border-t border-brand-border/60 pt-3 text-base font-semibold"><span>Total to pay</span><span className="text-brand-lime">{formatted(total)}</span></div></div>
            <div className="rounded-2xl border border-brand-lime/30 bg-[rgba(198,241,53,0.06)] p-4"><p className="text-sm text-brand-muted">Transfer to this configured account</p><div className="mt-4 space-y-3 text-sm"><CopyRow label="Account number" value={config?.accountNumber} onCopy={copy} /><CopyRow label="Account name" value={config?.accountName} onCopy={copy} /><CopyRow label="Bank" value={config?.bankName} onCopy={copy} /></div></div>
            <label onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]) }} className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-7 text-center ${dragging ? 'border-brand-lime bg-brand-lime/10' : 'border-brand-border/80 bg-[rgba(11,7,20,0.3)]'}`}><UploadCloud className="text-brand-lime" size={28} /><span className="mt-3 font-semibold">Upload Receipt (Required)</span><span className="mt-1 text-xs text-brand-muted">JPG, PNG, or PDF · max 5MB</span>{file ? <span className="mt-3 text-sm text-brand-lime">{file.name}</span> : null}<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => chooseFile(event.target.files[0])} className="hidden" /></label>
            <p className="text-xs leading-6 text-brand-muted">A 2% fee is added to all top-ups. Transfers are manually verified, usually within {config?.verificationTimeframe || 'a few hours'}.</p>
            {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-lime px-4 py-3 font-semibold text-brand-base disabled:opacity-60"><FileUp size={18} />{busy ? 'Submitting...' : 'Submit payment receipt'}</button>
          </form>
        </div>
      </main>
    </div>
  )
}

function CopyRow({ label, value, onCopy }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-brand-muted">{label}</span><span className="flex items-center gap-2 text-right font-medium">{value || 'Not configured'}{value ? <button type="button" aria-label={`Copy ${label}`} onClick={() => onCopy(value)} className="text-brand-lime"><Copy size={15} /></button> : null}</span></div>
}

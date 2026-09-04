import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckSquare, Copy, Crown, FileUp, Gem, Landmark, Shield, Sparkles, TrendingUp, UploadCloud, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { getTopupConfig, getWalletSummary, submitUpgradeReceipt } from '../../lib/api/wallet'
import { useAuth } from '../../hooks/useAuth'
import coatOfArms from '../../assets/brand/nigerian-coat-of-arms-hBXqVrjF.png'

const tiers = [
  {
    name: 'Silver',
    label: 'STARTER',
    rate: 25000,
    upgradePrice: 25000,
    icon: Shield,
    iconClass: 'bg-gradient-to-br from-[#aeb8c8] to-[#657083] text-white',
    rateClass: 'text-[#cbd5e1]',
    benefits: ['₦25,000 per active referral', 'Priority reward updates'],
  },
  {
    name: 'Gold',
    label: 'POPULAR',
    rate: 30000,
    upgradePrice: 30000,
    icon: Sparkles,
    iconClass: 'bg-gradient-to-br from-[#ffd34e] to-[#d99400] text-white',
    rateClass: 'text-[#facc15]',
    benefits: ['₦30,000 per active referral', 'Priority reward updates', 'Gold tier profile accent'],
  },
  {
    name: 'Platinum',
    label: 'PRO',
    rate: 35000,
    upgradePrice: 50000,
    icon: Gem,
    iconClass: 'bg-gradient-to-br from-[#61a5ff] to-[#2563eb] text-white',
    rateClass: 'text-[#60a5fa]',
    benefits: ['₦35,000 per active referral', 'Priority reward updates', 'Platinum tier profile accent'],
  },
  {
    name: 'Diamond',
    label: 'ELITE',
    rate: 40000,
    upgradePrice: 40000,
    icon: Crown,
    iconClass: 'bg-gradient-to-br from-[#d08cff] to-[#9333ea] text-white',
    rateClass: 'text-[#c084fc]',
    benefits: ['₦40,000 per active referral', 'Priority reward updates', 'Diamond tier profile accent'],
  },
]

function formatNaira(amount) {
  return `₦${amount.toLocaleString('en-NG')}`
}

export default function UpgradePage() {
  const [selectedTier, setSelectedTier] = useState(null)
  const [stage, setStage] = useState('select')
  const [config, setConfig] = useState(null)
  const [currentReferral, setCurrentReferral] = useState({ amount: 15000, tier: 'STARTER' })
  const [file, setFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { token } = useAuth()

  useEffect(() => {
    getTopupConfig().then(setConfig).catch(() => setConfig(null))
    getWalletSummary().then((wallet) => setCurrentReferral({ amount: wallet.perReferral || 15000, tier: wallet.referralTier || 'STARTER' })).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (stage !== 'loading') return undefined
    const timer = window.setTimeout(() => setStage('notice'), 2000)
    return () => window.clearTimeout(timer)
  }, [stage])

  const selectedDetails = useMemo(() => selectedTier || tiers[0], [selectedTier])

  const beginPayment = () => {
    if (!selectedTier) return
    setError('')
    setStage('loading')
  }

  const chooseFile = (nextFile) => {
    setFile(nextFile)
    setError('')
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Upload your transfer receipt to continue.')
      return
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or PDF receipt up to 5MB.')
      return
    }
    try {
      await submitUpgradeReceipt(selectedDetails.upgradePrice ?? selectedDetails.rate, selectedDetails.name, file, token)
      window.dispatchEvent(new CustomEvent('flexpay-request-submitted', { detail: { type: 'upgrade' } }))
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message || 'Could not submit upgrade receipt.')
    }
  }

  if (stage === 'loading') {
    return <LoadingStage tier={selectedDetails} />
  }

  if (stage === 'notice') {
    return <PaymentNotice tier={selectedDetails} onUnderstand={() => setStage('payment')} onClose={() => setStage('select')} />
  }

  if (stage === 'payment') {
    return <PaymentStage tier={selectedDetails} config={config} file={file} error={error} submitted={submitted} onBack={() => setStage('select')} onFile={chooseFile} onSubmit={submitPayment} onHome={() => navigate('/home')} />
  }

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text">
      <div className="mx-auto min-h-screen w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-6">
        <header className="flex items-center gap-3 border-b border-brand-border/60 bg-[rgba(21,15,46,0.92)] px-3 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)] sm:rounded-[1.5rem] sm:px-5">
          <Link to="/home" aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-muted transition hover:bg-brand-lime/10 hover:text-brand-lime">
            <ArrowLeft size={22} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.14)] text-emerald-400">
            <TrendingUp size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-brand-text">Referral Upgrades</h1>
        </header>

        <main className="relative overflow-hidden px-1 pb-8 pt-7 sm:px-2">
          <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 -rotate-45 bg-gradient-to-br from-emerald-400/10 to-transparent blur-2xl" />
          <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-[#123d3b] to-[#10263a] p-6 shadow-[0_18px_50px_rgba(16,185,129,0.12)] sm:p-7">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Current earnings per referral</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-sky-400 sm:text-5xl">{formatNaira(currentReferral.amount)}</p>
            <p className="mt-3 text-sm text-brand-muted">{currentReferral.tier} tier · Pick a tier below to raise this rate for life.</p>
          </section>

          <section className="relative mt-7 grid grid-cols-2 gap-3 sm:gap-4">
            {tiers.map((tier) => {
              const Icon = tier.icon
              const selected = selectedTier?.name === tier.name
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`min-h-[166px] rounded-[1.5rem] border p-4 text-left transition sm:min-h-[184px] sm:p-5 ${selected ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.22)]' : 'border-brand-border/55 bg-[rgba(15,29,34,0.88)] hover:border-brand-border'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tier.iconClass}`}>
                      <Icon size={22} />
                    </div>
                    <span className="pt-1 text-[10px] font-medium tracking-[0.14em] text-brand-muted">{tier.label}</span>
                  </div>
                  <p className={`mt-4 text-lg font-bold ${tier.rateClass}`}>{tier.name}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-brand-text">{formatNaira(tier.rate)}</p>
                  <p className="mt-1 text-xs text-brand-muted">per referral</p>
                </button>
              )
            })}
          </section>

          <section className="relative mt-7 min-h-[168px] rounded-[1.5rem] border border-brand-border/60 bg-[rgba(21,15,46,0.72)] p-6 sm:p-7">
            {selectedTier ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-brand-muted">{selectedTier.name} tier</p>
                    <h2 className={`mt-2 text-2xl font-bold ${selectedTier.rateClass}`}>{formatNaira(selectedTier.rate)} per referral</h2>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedTier.iconClass}`}><selectedTier.icon size={21} /></div>
                </div>
                <ul className="mt-5 space-y-2">
                  {selectedTier.benefits.map((benefit) => <li key={benefit} className="flex items-center gap-2 text-sm text-brand-muted"><Check size={15} className="text-emerald-400" />{benefit}</li>)}
                </ul>
                <button type="button" onClick={beginPayment} className={`mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-brand-base ${selectedTier.name === 'Silver' ? 'bg-gradient-to-r from-[#aeb8c8] to-[#657083]' : selectedTier.name === 'Gold' ? 'bg-gradient-to-r from-[#ffd11a] to-[#d89400]' : selectedTier.name === 'Platinum' ? 'bg-gradient-to-r from-[#61a5ff] to-[#2563eb]' : 'bg-gradient-to-r from-[#d08cff] to-[#9333ea]'}`}>
                  Continue to payment <ArrowRight size={19} />
                </button>
              </div>
            ) : (
              <div className="flex min-h-[116px] flex-col items-center justify-center text-center">
                <Sparkles className="text-emerald-400" size={32} />
                <p className="mt-5 text-sm text-brand-muted">Select a tier above to see its benefits and price.</p>
              </div>
            )}
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

function LoadingStage({ tier }) {
  const upgradePrice = tier.upgradePrice ?? tier.rate
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setProgress(100))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-base px-4 pb-24 text-brand-text">
      <section className="w-full max-w-md rounded-[1.75rem] border border-emerald-400/35 bg-[rgba(21,15,46,0.94)] p-7 text-center shadow-[0_24px_70px_rgba(16,185,129,0.14)] sm:p-10">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-400/40 text-emerald-400 shadow-[0_0_0_7px_rgba(16,185,129,0.06)]"><Landmark size={48} /></div>
        <h1 className="mt-8 bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-2xl font-bold text-transparent">Generating Account<br />Number</h1>
        <p className="mt-4 text-sm text-brand-muted">Preparing a secure payment account for<br /><span className="font-semibold text-brand-text">{formatNaira(upgradePrice)}</span></p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-brand-panel"><div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-[2000ms] linear" style={{ width: `${progress}%` }} /></div>
        <p className="mt-3 text-xs text-brand-muted">Generating account number...</p>
        <p className="mt-7 text-xs text-emerald-400">Manual payment review applies after receipt upload.</p>
      </section>
    </div>
  )
}

function LegacyPaymentStage({ tier, config, file, error, submitted, onBack, onFile, onSubmit, onHome }) {
  if (submitted) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-base px-4 pb-24 text-brand-text"><section className="w-full max-w-md rounded-[1.75rem] border border-brand-border/70 bg-brand-panel/95 p-8 text-center"><Check className="mx-auto text-brand-lime" size={48} /><h1 className="mt-5 text-2xl font-bold">Payment submitted</h1><p className="mt-3 text-sm text-brand-muted">Your receipt is ready for manual review.</p><button type="button" onClick={onHome} className="mt-7 w-full rounded-2xl bg-brand-lime px-4 py-3 font-semibold text-brand-base">Return home</button></section></div>
  }

  return (
    <div className="min-h-screen bg-brand-base pb-24 text-brand-text">
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-6">
        <header className="flex items-center gap-3 border-b border-brand-border/60 bg-[rgba(21,15,46,0.92)] px-3 py-4 sm:rounded-[1.5rem] sm:px-5"><button type="button" onClick={onBack} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:text-brand-lime"><ArrowLeft size={22} /></button><h1 className="text-lg font-bold">Complete Payment</h1></header>
        <main className="mt-6 space-y-5">
          <section className="rounded-[1.5rem] border border-brand-border/60 bg-[rgba(21,15,46,0.82)] p-6"><h2 className={`text-2xl font-bold ${tier.rateClass}`}>{tier.name} Upgrade</h2><div className="mt-5 flex justify-between gap-4 text-sm"><span className="text-brand-muted">Earnings per referral:</span><strong>{formatNaira(tier.rate)}</strong></div><div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-brand-muted">Upgrade price:</span><strong className="text-brand-lime">{formatNaira(tier.rate)}</strong></div></section>
          <section className="rounded-[1.5rem] border border-brand-border/60 bg-[rgba(21,15,46,0.72)] p-6"><h2 className="text-lg font-bold">Payment Instructions</h2><div className="mt-5 rounded-[1.25rem] border border-emerald-400/30 bg-emerald-400/5 p-4"><p className="font-semibold text-emerald-300">Transfer the exact amount shown below</p><p className="mt-2 text-sm leading-6 text-brand-muted">Payments are manually reviewed after you upload a clear receipt.</p></div><ol className="mt-6 space-y-5 pl-5 text-sm leading-6"><li>Transfer <strong>{formatNaira(tier.rate)}</strong> to the account details below.</li><li>Upload your payment receipt below.</li><li>Wait for confirmation, usually within 24 hours.</li></ol><div className="mt-6 rounded-[1.25rem] bg-[rgba(11,7,20,0.42)] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">Bank Details</h3><button type="button" onClick={() => navigator.clipboard?.writeText(config?.accountNumber || '')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-lime/10 px-3 text-sm font-semibold text-brand-lime"><Copy size={15} /> Copy</button></div><p className="mt-4 text-sm">Account: <strong className="ml-2 font-mono">{config?.accountNumber || 'Not configured'}</strong></p><p className="mt-2 text-sm">Name: <strong className="ml-2">{config?.accountName || 'Not configured'}</strong></p><p className="mt-2 text-sm">Bank: <strong className="ml-2">{config?.bankName || 'Not configured'}</strong></p></div><div className="mt-6 rounded-[1.25rem] border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"><AlertTriangle className="mr-2 inline" size={17} />Only submit a genuine receipt for this upgrade request.</div><form onSubmit={onSubmit} className="mt-6"><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-brand-border/80 bg-[rgba(11,7,20,0.3)] p-5 text-center"><UploadCloud className="text-brand-lime" size={28} /><span className="mt-3 font-semibold">Upload Payment Receipt</span><span className="mt-1 text-xs text-brand-muted">JPG, PNG, or PDF · max 5MB</span>{file ? <span className="mt-3 text-sm text-brand-lime">{file.name}</span> : null}<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => onFile(event.target.files[0])} className="hidden" /></label>{error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}<button type="submit" className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-lime to-sky-400 px-4 py-3 font-semibold text-brand-base"><FileUp size={18} /> Submit Payment</button></form></section>
        </main>
      </div><BottomNav />
    </div>
  )
}

function PaymentNotice({ tier, onUnderstand, onClose }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-base px-4 pb-24 text-brand-text">
      <section className="w-full max-w-md rounded-[1.5rem] border border-brand-border/70 bg-[rgba(21,15,46,0.98)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><AlertTriangle size={23} /></div><h1 className="text-xl font-bold">Important Payment Notice</h1></div><button type="button" onClick={onClose} aria-label="Close notice" className="text-brand-muted hover:text-brand-text"><X size={20} /></button></div>
        <ul className="mt-7 space-y-4 pl-5 text-sm leading-6 text-brand-muted"><li>Transfer the <strong className="text-brand-text">exact amount</strong> shown on the payment page.</li><li>Upload a clear <strong className="text-brand-text">payment screenshot</strong> immediately after transfer.</li></ul>
        <div className="mt-6 rounded-[1.25rem] border border-amber-400/30 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200"><AlertTriangle className="mr-2 inline" size={17} />Use a Nigerian bank account that can complete the transfer successfully. Payments are manually reviewed.</div>
        <div className="mt-4 rounded-[1.25rem] border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-200"><CheckSquare className="mr-2 inline" size={17} />Payments from other banks are reviewed after the receipt is submitted.</div>
        <div className="mt-4 rounded-[1.25rem] border border-red-400/30 bg-red-400/5 p-4 text-sm leading-6 text-red-200"><X className="mr-2 inline" size={17} />Do not dispute a transfer while it is under review; contact support if there is a problem.</div>
        <button type="button" onClick={onUnderstand} className="mt-7 flex min-h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-lime to-sky-400 px-4 py-3 font-semibold text-brand-base">I Understand</button>
        <p className="mt-3 text-center text-xs text-brand-muted">Selected tier: {tier.name} · {formatNaira(tier.rate)}</p>
      </section>
    </div>
  )
}

function PaymentStage({ tier, config, file, error, submitted, onBack, onFile, onSubmit, onHome }) {
  const upgradePrice = tier.upgradePrice ?? tier.rate

  if (submitted) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-base px-4 pb-24 text-brand-text"><section className="w-full max-w-md rounded-[1.75rem] border border-brand-border/70 bg-brand-panel/95 p-8 text-center"><Check className="mx-auto text-brand-lime" size={48} /><h1 className="mt-5 text-2xl font-bold">Payment submitted</h1><p className="mt-3 text-sm text-brand-muted">Your receipt is ready for manual review.</p><button type="button" onClick={onHome} className="mt-7 w-full rounded-2xl bg-brand-lime px-4 py-3 font-semibold text-brand-base">Return home</button></section></div>
  }

  return (
    <div className="min-h-screen bg-brand-base pb-24 text-brand-text">
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-6">
        <header className="flex items-center gap-3 border-b border-brand-border/60 bg-[rgba(21,15,46,0.92)] px-3 py-4 sm:rounded-[1.5rem] sm:px-5">
          <button type="button" onClick={onBack} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:text-brand-lime"><ArrowLeft size={22} /></button>
          <h1 className="text-lg font-bold">Complete Payment</h1>
        </header>

        <main className="mt-6 space-y-5">
          <section className="rounded-[1.5rem] border border-brand-border/60 bg-[rgba(21,15,46,0.82)] p-6">
            <h2 className={`text-2xl font-bold ${tier.rateClass}`}>{tier.name} Upgrade</h2>
            <div className="mt-5 flex justify-between gap-4 text-sm"><span className="text-brand-muted">Earnings per referral:</span><strong>{formatNaira(tier.rate)}</strong></div>
            <div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-brand-muted">Upgrade price:</span><strong className="text-brand-lime">{formatNaira(upgradePrice)}</strong></div>
          </section>

          <section className="rounded-[1.5rem] border border-brand-border/60 bg-[rgba(21,15,46,0.72)] p-6 sm:p-7">
            <h2 className="text-lg font-bold">Payment Instructions</h2>
            <div className="mt-5 rounded-[1.25rem] border border-emerald-400/30 bg-emerald-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/90 p-1">
                  <img src={coatOfArms} alt="Nigerian coat of arms" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-300">Payment verification</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">Your transfer will be checked manually against the selected upgrade request.</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-brand-text">Transfer exactly <strong className="text-emerald-300">{formatNaira(upgradePrice)}</strong> to the account below. A clear receipt helps us match your payment.</div>
            </div>

            <ol className="mt-6 space-y-4 pl-5 text-sm leading-6">
              <li>Transfer <strong>{formatNaira(upgradePrice)}</strong> to the account details below.</li>
              <li>Upload a clear payment screenshot below.</li>
              <li>Wait for confirmation, usually within 24 hours.</li>
            </ol>

            <div className="mt-6 rounded-[1.25rem] bg-[rgba(11,7,20,0.42)] p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Bank Details</h3><button type="button" onClick={() => navigator.clipboard?.writeText(config?.accountNumber || '')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-lime/10 px-3 text-sm font-semibold text-brand-lime"><Copy size={15} /> Copy</button></div>
              <p className="mt-4 text-sm">Account: <strong className="ml-2 font-mono">{config?.accountNumber || 'Not configured'}</strong></p>
              <p className="mt-2 text-sm">Name: <strong className="ml-2">{config?.accountName || 'Not configured'}</strong></p>
              <p className="mt-2 text-sm">Bank: <strong className="ml-2">{config?.bankName || 'Not configured'}</strong></p>
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-amber-400/30 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200"><AlertTriangle className="mr-2 inline" size={17} />Only submit a genuine receipt for this upgrade request.</div>
            <form onSubmit={onSubmit} className="mt-6">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-brand-border/80 bg-[rgba(11,7,20,0.3)] p-5 text-center"><UploadCloud className="text-brand-lime" size={28} /><span className="mt-3 font-semibold">Upload Payment Receipt</span><span className="mt-1 text-xs text-brand-muted">JPG, PNG, or PDF · max 5MB</span>{file ? <span className="mt-3 text-sm text-brand-lime">{file.name}</span> : null}<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => onFile(event.target.files[0])} className="hidden" /></label>
              {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
              <button type="submit" className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-lime to-sky-400 px-4 py-3 font-semibold text-brand-base"><FileUp size={18} /> Submit Payment</button>
            </form>
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
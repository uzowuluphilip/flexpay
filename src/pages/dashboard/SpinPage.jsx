import { ArrowLeft, ChevronRight, Clock3, Crown, Gem, History, Sparkles, Trophy, Wallet2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'
import { getWalletSummary, playSpin } from '../../lib/api/wallet'

const tiers = [
  { name: 'Starter', amount: 25000, icon: Zap, accent: 'from-[#6ee7b7] to-[#34d399]' },
  { name: 'Bronze', amount: 50000, icon: Trophy, accent: 'from-[#fbbf7b] to-[#f97316]' },
  { name: 'Silver', amount: 100000, icon: Gem, accent: 'from-[#c4b5fd] to-[#818cf8]' },
]
const wheelSegments = [
  { label: 'WIN', colors: ['#0f766e', '#34a58d'] }, { label: 'LOSE', colors: ['#7f1d3a', '#c45b70'] },
  { label: 'TRY AGAIN', colors: ['#8a5a10', '#d39a36'] }, { label: 'WIN x2', colors: ['#1e477d', '#4f83bb'] },
  { label: 'LOSE', colors: ['#572268', '#9b4eaa'] }, { label: 'TRY AGAIN', colors: ['#11616a', '#3ea9a1'] },
  { label: 'WIN x1.5', colors: ['#8f3948', '#d26d78'] }, { label: 'LOSE', colors: ['#245247', '#4c8d78'] },
]
const wheelCenter = 200
const wheelRadius = 184
const segmentAngle = 360 / wheelSegments.length

function wheelPoint(angle, radius) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: wheelCenter + radius * Math.cos(radians), y: wheelCenter + radius * Math.sin(radians) }
}

function wheelSegmentPath(startAngle, endAngle) {
  const start = wheelPoint(startAngle, wheelRadius)
  const end = wheelPoint(endAngle, wheelRadius)
  return `M ${wheelCenter} ${wheelCenter} L ${start.x} ${start.y} A ${wheelRadius} ${wheelRadius} 0 0 1 ${end.x} ${end.y} Z`
}

export default function SpinPage() {
  const navigate = useNavigate()
  const [selectedTier, setSelectedTier] = useState(tiers[0])
  const [tab, setTab] = useState('play')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState('')
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getWalletSummary().then((wallet) => setBalance(wallet.balance)).catch((err) => setError(err.message))
  }, [])

  const spin = () => {
    if (spinning) return
    setResult('')
    setError('')
    setSpinning(true)
    setRotation((current) => current + 1440 + Math.floor(Math.random() * 360))
    playSpin(selectedTier.amount).then((spinResult) => {
      window.setTimeout(() => {
        setSpinning(false)
        setResult(spinResult.message)
        setBalance(spinResult.balance)
      }, 2200)
    }).catch((err) => {
      setSpinning(false)
      setError(err.message)
    })
  }

  return <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]"><div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8"><header className="flex items-center gap-3 rounded-[1.5rem] border border-brand-border/70 bg-brand-panel/90 px-3 py-3"><button type="button" onClick={() => navigate('/home')} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 hover:border-brand-lime"><ArrowLeft size={18} /></button><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-lime text-brand-base"><Sparkles size={20} /></div><div className="flex-1"><p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Play space</p><h1 className="text-lg font-semibold">SPIN ARENA</h1></div><span className="rounded-full border border-brand-lime/30 bg-brand-lime/10 px-3 py-1 text-xs font-semibold text-brand-lime">0%</span></header>

  {tab === 'play' ? <><section className="mt-5 rounded-[1.5rem] border border-brand-border/70 bg-[linear-gradient(135deg,rgba(198,241,53,0.12),rgba(21,15,46,0.94))] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Play balance</p><p className="mt-2 font-mono text-3xl font-semibold">{balance === null ? '...' : `₦${balance.toLocaleString()}`}</p><p className="mt-1 text-xs text-brand-muted">Real available wallet balance</p></div><button type="button" onClick={() => navigate('/top-up')} className="min-h-11 rounded-full bg-brand-lime px-4 py-2 text-sm font-semibold text-brand-base"><Wallet2 className="mr-2 inline" size={16} />Top Up</button></div></section><div className="mt-4 grid grid-cols-3 gap-3">{[['Spins','0'],['Wins','0'],['Win Rate','0%']].map(([label,value]) => <div key={label} className="rounded-2xl border border-brand-border/70 bg-brand-panel/90 p-3 text-center"><p className="text-xs text-brand-muted">{label}</p><p className="mt-2 font-mono text-xl font-semibold">{value}</p></div>)}</div><div className="mt-5 flex items-center gap-2 border-b border-brand-border/70 pb-2">{[['play','Play',Sparkles],['leaders','Leaders',Crown],['history','History',History]].map(([key,label,Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${tab === key ? 'bg-brand-lime text-brand-base' : 'text-brand-muted'}`}><Icon className="mr-1 inline" size={15} />{label}</button>)}</div><section className="mt-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Stake</p><h2 className="mt-1 text-xl font-semibold">Choose your arena tier</h2></div><span className="text-xs text-brand-muted">Server-authoritative stake</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{tiers.map((tier) => { const Icon = tier.icon; return <button type="button" key={tier.name} onClick={() => setSelectedTier(tier)} className={`rounded-2xl border p-4 text-left transition ${selectedTier.name === tier.name ? 'border-brand-lime bg-brand-lime/10' : 'border-brand-border/70 bg-brand-panel/90'}`}><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tier.accent} text-brand-base`}><Icon size={19} /></div><p className="mt-4 text-sm text-brand-muted">{tier.name}</p><p className="mt-1 font-mono text-xl font-semibold">₦{tier.amount.toLocaleString()}</p></button> })}</div><button type="button" onClick={spin} disabled={spinning} className="mt-5 min-h-14 w-full rounded-2xl bg-gradient-to-r from-brand-lime to-brand-lime-light px-5 text-lg font-bold text-brand-base disabled:opacity-70">{spinning ? 'Spinning...' : `SPIN ₦${selectedTier.amount.toLocaleString()}`}</button>{error ? <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}</section></> : <section className="mt-12 rounded-[1.5rem] border border-dashed border-brand-border/70 bg-brand-panel/70 p-10 text-center"><Clock3 className="mx-auto text-brand-lime" size={32} /><h2 className="mt-4 text-xl font-semibold">{tab === 'leaders' ? 'Leaders coming soon' : 'Spin history coming soon'}</h2><p className="mt-2 text-sm text-brand-muted">This step is not built yet.</p><button type="button" onClick={() => setTab('play')} className="mt-5 rounded-full bg-brand-lime px-4 py-2 text-sm font-semibold text-brand-base">Back to Play</button></section>}

  <section className="mt-6 rounded-[1.5rem] border border-brand-border/70 bg-brand-panel/90 p-5 text-center"><div className="relative mx-auto w-full max-w-[22rem] rounded-full p-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] before:absolute before:inset-[-2rem] before:-z-10 before:rounded-full before:bg-[radial-gradient(circle,rgba(198,241,53,0.18),rgba(124,58,237,0.1)_42%,transparent_72%)] sm:max-w-[26rem]"><div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 text-brand-lime drop-shadow-[0_4px_8px_rgba(198,241,53,0.55)]"><ChevronRight className="rotate-90 fill-brand-lime" size={30} /></div><div className="relative aspect-square" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 2.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}><svg viewBox="0 0 400 400" className="h-full w-full overflow-visible" role="img" aria-label="Prize wheel with win, lose, and try again segments"><defs>{wheelSegments.map((segment, index) => <linearGradient key={segment.label + index} id={`wheel-gradient-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={segment.colors[0]} /><stop offset="100%" stopColor={segment.colors[1]} /></linearGradient>)}<radialGradient id="wheel-hub-gradient" cx="35%" cy="30%"><stop offset="0%" stopColor="#31274f" /><stop offset="70%" stopColor="#17112d" /><stop offset="100%" stopColor="#090711" /></radialGradient><linearGradient id="wheel-rim-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f8fafc" /><stop offset="35%" stopColor="#94a3b8" /><stop offset="60%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#64748b" /></linearGradient></defs><circle cx="200" cy="200" r="190" fill="#080611" opacity="0.8" />{wheelSegments.map((segment, index) => { const startAngle = index * segmentAngle; const labelAngle = startAngle + segmentAngle / 2; const labelRotation = labelAngle > 90 && labelAngle < 270 ? 180 : 0; return <g key={segment.label + index}><path d={wheelSegmentPath(startAngle, startAngle + segmentAngle)} fill={`url(#wheel-gradient-${index})`} stroke="#100b1c" strokeWidth="2" /><g transform={`rotate(${labelAngle} 200 200)`}><text x="200" y="93" transform={labelRotation ? 'rotate(180 200 93)' : undefined} fill="#fff" fontSize={segment.label.length > 8 ? 13 : 15} fontWeight="800" letterSpacing="0.5" textAnchor="middle" dominantBaseline="middle" style={{ paintOrder: 'stroke', stroke: 'rgba(9, 7, 17, 0.72)', strokeWidth: 4 }}>{segment.label}</text></g></g> })}<circle cx="200" cy="200" r="190" fill="none" stroke="url(#wheel-rim-gradient)" strokeWidth="9" />{Array.from({ length: 24 }, (_, index) => { const point = wheelPoint(index * 15, 190); return <circle key={index} cx={point.x} cy={point.y} r="3.5" fill={index % 2 === 0 ? '#f8fafc' : '#c6f135'} style={{ filter: `drop-shadow(0 0 4px ${index % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(198,241,53,0.9)'})` }} /> })}<circle cx="200" cy="200" r="47" fill="#080611" opacity="0.65" /><circle cx="200" cy="200" r="41" fill="url(#wheel-hub-gradient)" stroke="#b8c1cf" strokeOpacity="0.7" strokeWidth="3" /><circle cx="200" cy="200" r="9" fill="#c6f135" style={{ filter: 'drop-shadow(0 0 7px rgba(198,241,53,0.9))' }} /><circle cx="197" cy="197" r="3" fill="#f4f1ff" opacity="0.9" /></svg></div></div><p className="mt-5 min-h-7 text-lg font-semibold">{spinning ? 'Spinning...' : result || 'Ready to spin'}</p><p className="mt-3 text-xs text-brand-muted">Win 70% · Retry 10% · Lose 20% — server-authoritative odds</p></section>
  </div><BottomNav /></div>
}

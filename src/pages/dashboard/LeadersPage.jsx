import { ArrowLeft, Crown, Medal, RefreshCw, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/dashboard/BottomNav'

const leaders = [
  { name: 'Mr a***n', wins: 25, total: 13700000, rank: 1 },
  { name: 'S***l A***y S***m', wins: 7, total: 5400000, rank: 2 },
  { name: 'Mr M****k', wins: 6, total: 5100000, rank: 3 },
  { name: 'A***o E***l A***a', wins: 14, total: 4400000, rank: 4 },
  { name: 'I***O J***E H***F', wins: 5, total: 3500000, rank: 5 },
  { name: 'D***i O***a', wins: 4, total: 2800000, rank: 6 },
]

const rankStyles = {
  1: 'border-[#c49a19] bg-[linear-gradient(110deg,rgba(196,154,25,0.24),rgba(78,59,17,0.54))]',
  2: 'border-slate-500 bg-[linear-gradient(110deg,rgba(148,163,184,0.17),rgba(44,52,64,0.82))]',
  3: 'border-[#a96808] bg-[linear-gradient(110deg,rgba(169,104,8,0.22),rgba(75,46,17,0.58))]',
}

function LeaderIcon({ rank }) {
  if (rank === 1) return <Crown size={24} />
  if (rank === 2) return <Trophy size={24} />
  if (rank === 3) return <Medal size={24} />
  return <span className="text-base font-semibold text-brand-muted">#{rank}</span>
}

export default function LeadersPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-brand-base pb-[7.5rem] text-brand-text sm:pb-[8.5rem]">
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center gap-3 rounded-[1.5rem] border border-brand-border/70 bg-brand-panel/90 px-3 py-3">
          <button type="button" onClick={() => navigate('/spin')} aria-label="Back to Play Space" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 hover:border-brand-lime">
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,208,255,0.12)] text-[#2dd0ff]"><Trophy size={21} /></div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Play space</p>
            <h1 className="text-lg font-semibold">LEADERBOARD</h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-muted"><span className="h-2 w-2 rounded-full bg-emerald-400" />Live standings</p>
          </div>
          <button type="button" aria-label="Refresh leaderboard" className="flex h-11 w-11 items-center justify-center rounded-2xl text-brand-text hover:bg-brand-raised hover:text-brand-lime"><RefreshCw size={19} /></button>
        </header>

        <section className="mt-5 space-y-3" aria-label="Player rankings">
          {leaders.map((leader) => (
            <article key={leader.rank} className={`flex min-h-[88px] items-center gap-3 rounded-2xl border px-4 py-3 sm:px-5 ${rankStyles[leader.rank] || 'border-brand-border/60 bg-brand-panel/65'}`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${leader.rank <= 3 ? 'bg-black/25' : 'bg-brand-base/70'} ${leader.rank === 1 ? 'text-[#ffd21f]' : leader.rank === 3 ? 'text-[#f59e0b]' : 'text-brand-text'}`}>
                <LeaderIcon rank={leader.rank} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold sm:text-lg">{leader.name}</h2>
                <p className="mt-1 text-sm text-brand-muted">{leader.wins} wins</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-semibold text-[#2dd0ff] sm:text-lg">₦{leader.total.toLocaleString()}</p>
                <p className="mt-1 text-xs text-brand-muted">Total won</p>
              </div>
            </article>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  )
}

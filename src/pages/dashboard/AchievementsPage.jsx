import { Award, Banknote, Check, Flame, Lock, Megaphone, Sparkles, Star, Trophy, Users, Wallet, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAchievements } from '../../lib/api/wallet'

const iconMap = { users: Users, megaphone: Megaphone, trophy: Trophy, wallet: Wallet, banknote: Banknote, sparkles: Sparkles, star: Star, check: Check, flame: Flame }

export default function AchievementsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState({ unlocked: 0, total: 10, list: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    getAchievements().then(setData).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(11,7,20,0.88)] px-3 py-5 text-brand-text sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl rounded-[1.75rem] border border-brand-border/70 bg-brand-panel p-4 shadow-[0_30px_100px_rgba(0,0,0,0.48)] sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-lime text-brand-base"><Award size={22} /></div>
            <div><h1 className="text-2xl font-semibold">Achievements</h1><p className="text-sm text-brand-muted">{data.unlocked}/{data.total} unlocked</p></div>
          </div>
          <button type="button" onClick={() => navigate('/home')} aria-label="Close achievements" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border/70 text-brand-muted hover:border-brand-lime hover:text-brand-text"><X size={20} /></button>
        </header>

        <main className="mt-6">
          {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p> : data.list.length === 0 ? <p className="text-center text-sm text-brand-muted">Loading achievements...</p> : <div className="grid gap-3 sm:grid-cols-2">{data.list.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} />)}</div>}
        </main>
      </div>
    </div>
  )
}

function AchievementCard({ achievement }) {
  const Icon = iconMap[achievement.icon] || Trophy
  const percent = Math.min(100, Math.round((achievement.current / Math.max(1, achievement.target)) * 100))
  return <article className={`rounded-2xl border p-4 transition ${achievement.unlocked ? 'border-brand-lime/60 bg-[linear-gradient(135deg,rgba(198,241,53,0.16),rgba(27,20,64,0.94))] shadow-[0_10px_30px_rgba(198,241,53,0.08)]' : 'border-brand-border/70 bg-[rgba(11,7,20,0.38)]'}`}><div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${achievement.unlocked ? 'bg-brand-lime text-brand-base' : 'bg-[rgba(255,255,255,0.05)] text-brand-muted'}`}>{achievement.unlocked ? <Check size={20} /> : <Lock size={18} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{achievement.title}</h2><p className="mt-1 text-sm text-brand-muted">{achievement.description}</p></div>{achievement.unlocked ? <span className="shrink-0 rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2 py-1 text-[11px] font-semibold text-brand-lime">Unlocked</span> : null}</div><div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-base"><div className="h-full rounded-full bg-brand-lime transition-all" style={{ width: `${percent}%` }} /></div><span className="font-mono text-xs text-brand-muted">{achievement.current}/{achievement.target}</span></div></div></div></article>
}

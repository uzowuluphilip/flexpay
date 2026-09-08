import { Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const firstNames = ['Aisha', 'Chiamaka', 'Folarin', 'Kelechi', 'Fatima', 'Adewale', 'Zainab', 'Michael', 'Morenike', 'Sade', 'Esther', 'Yetunde', 'Salisu', 'Uduak', 'Nafisa', 'Muktar', 'Lara', 'Pere', 'Obinna', 'Haruna', 'Bode', 'Doyin', 'Abiola', 'Ahmed', 'Timi', 'Bilkisu', 'Mustapha', 'Daniel', 'Idongesit', 'Emmanuel', 'Favour', 'Umar', 'Nasiru', 'Olumide', 'Hauwa', 'Rahma', 'Deji', 'Mercy', 'Lanre', 'Damilola', 'Ibrahim', 'Wisdom', 'Ifunanya', 'Chinonso', 'Ubong', 'Ronke', 'Bashir', 'Ayodeji', 'Abdulrahman', 'Deborah']
const lastNames = ['Mohammed', 'Lawal', 'Adeola', 'Okafor', 'Afolabi', 'Essien', 'Nwankwo', 'Usman', 'Bello', 'Oladipo', 'George', 'Okiemute', 'Ibrahim', 'Adebayo', 'Okoro', 'Abdullahi', 'Olawale', 'Yusuf', 'Ogunleye', 'Adeyinka', 'Garba', 'Inengite', 'Umeh', 'Sani', 'Aliyu', 'Eze', 'Udo', 'Nwosu', 'Okeke', 'Odukoya', 'Farouk', 'Nwachukwu', 'Adesanya', 'Edewor', 'Iorfa', 'Alali', 'Terna', 'Ibe', 'Akinyemi', 'Musa', 'Urhobo', 'Adebisi', 'Udoh', 'Obi', 'Adekunle', 'Aigbe', 'Kpamor', 'Adeyemi', 'Erekpore', 'Ovwigho']

const names = Array.from({ length: 200 }, (_, index) => `${firstNames[index % firstNames.length]} ${lastNames[(index * 7) % lastNames.length]}`)
const delays = [10 * 1000, 25 * 1000, 40 * 1000]
const visibleDuration = 5000
const popupChannel = 'flexpay-withdrawal-win-popup'

function makeActivity(index) {
  const amount = 15000 + ((index * 17391) % 185000)
  return { id: index, name: names[index % names.length], amount: Math.round(amount / 1000) * 1000 }
}

const activities = names.map((_, index) => makeActivity(index))

function formatAmount(amount) {
  return `₦${amount.toLocaleString('en-NG')}`
}

function broadcastVisibility(visible) {
  window.dispatchEvent(new CustomEvent(popupChannel, { detail: { visible, source: 'spin-win' } }))
}

export default function SpinWinActivityToast() {
  const [activityIndex, setActivityIndex] = useState(() => Math.floor(Math.random() * activities.length))
  const [visible, setVisible] = useState(false)
  const activity = useMemo(() => activities[activityIndex], [activityIndex])

  useEffect(() => {
    let showTimer
    let hideTimer
    let active = true

    const hideForWithdrawal = (event) => {
      if (event.detail?.source !== 'spin-win') setVisible(false)
    }
    window.addEventListener(popupChannel, hideForWithdrawal)

    const withdrawalIsVisible = () => {
      const withdrawalToast = document.querySelector('[aria-label="Development withdrawal activity"]')
      return withdrawalToast && window.getComputedStyle(withdrawalToast).opacity !== '0'
    }

    const observer = new MutationObserver(() => {
      if (withdrawalIsVisible()) {
        setVisible(false)
        broadcastVisibility(false)
      }
    })
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] })

    const scheduleNext = () => {
      showTimer = window.setTimeout(() => {
        if (!active) return
        if (withdrawalIsVisible()) {
          scheduleNext()
          return
        }
        setActivityIndex((current) => (current + 1) % activities.length)
        setVisible(true)
        broadcastVisibility(true)
        hideTimer = window.setTimeout(() => {
          setVisible(false)
          broadcastVisibility(false)
          scheduleNext()
        }, visibleDuration)
      }, delays[Math.floor(Math.random() * delays.length)])
    }

    scheduleNext()
    return () => {
      active = false
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
      window.removeEventListener(popupChannel, hideForWithdrawal)
      observer.disconnect()
      broadcastVisibility(false)
    }
  }, [])

  return <aside aria-live="polite" aria-label="Spin Arena win activity" className={`pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[59] flex justify-center transition-all duration-500 sm:inset-x-6 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-5 opacity-0'}`}><div className="flex w-full max-w-[365px] items-center gap-2.5 rounded-[1.25rem] border border-brand-lime/35 bg-[linear-gradient(110deg,rgba(21,15,46,0.98),rgba(38,62,19,0.97))] px-2.5 py-2 shadow-[0_14px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:max-w-[410px] sm:gap-3 sm:px-3 sm:py-2.5"><div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-base shadow-[0_0_18px_rgba(198,241,53,0.35)] sm:h-11 sm:w-11"><Trophy size={22} strokeWidth={2.5} /><Sparkles className="absolute -right-1 -top-1 text-brand-text" size={12} fill="currentColor" /></div><div className="min-w-0 flex-1 leading-tight"><p className="truncate text-[13px] font-bold text-brand-text sm:text-sm">{activity.name}</p><p className="mt-1 truncate text-[11px] text-brand-muted sm:text-xs">just won <span className="font-mono font-bold text-brand-lime">{formatAmount(activity.amount)}</span> in Spin Arena</p></div><span className="shrink-0 rounded-full border border-brand-lime/35 bg-brand-lime/10 px-2.5 py-1 text-[11px] font-semibold text-brand-lime sm:text-xs">✦ Won</span></div></aside>
}

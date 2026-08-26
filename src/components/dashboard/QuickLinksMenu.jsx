import { useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, CircleDollarSign, Compass, Grip, MessageCircleQuestion, Sparkles, UsersRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const menuItems = [
  { label: 'Tasks', to: '/tasks', icon: CircleDollarSign },
  { label: 'History', to: '/history', icon: Compass },
  { label: 'Referrals', to: '/referrals', icon: UsersRound },
  { label: 'Profile', to: '/profile', icon: BriefcaseBusiness },
  { label: 'Withdraw', to: '/withdraw', icon: CircleDollarSign },
  { label: 'Community', to: '/community', icon: Sparkles },
  { label: 'Support', to: '/support', icon: MessageCircleQuestion },
]

function QuickLinksMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (to) => {
    setOpen(false)
    if (to.startsWith('/home#')) {
      navigate('/home')
      setTimeout(() => {
        const section = document.getElementById(to.replace('/home#', ''))
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return
    }

    navigate(to)
  }

  return (
    <div ref={containerRef} className="fixed bottom-24 right-4 z-[60] sm:bottom-24 sm:right-6">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-lime to-brand-lime-light text-brand-base shadow-[0_16px_38px_rgba(0,0,0,0.28)]"
        aria-label="Open quick links"
      >
        {open ? <X size={20} /> : <Grip size={20} />}
      </button>

      {open ? (
        <div className="absolute bottom-16 right-0 w-[min(88vw,18rem)] rounded-[1.25rem] border border-brand-border/70 bg-[rgba(21,15,46,0.98)] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.28)]">
          <div className="mb-2 px-2 py-1 text-[10px] uppercase tracking-[0.28em] text-brand-muted">Quick links</div>
          <div className="space-y-1">
            {menuItems.map(({ label, to, icon: Icon }) => (
              <button key={label} onClick={() => handleSelect(to)} className="flex w-full items-center justify-between rounded-[0.95rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-3 py-2.5 text-left text-sm font-semibold text-brand-text">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-[rgba(198,241,53,0.08)] p-1.5 text-brand-lime">
                    <Icon size={15} />
                  </span>
                  {label}
                </span>
                <span className="text-brand-lime">→</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default QuickLinksMenu

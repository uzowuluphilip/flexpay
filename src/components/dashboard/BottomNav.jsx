import { Home, Info, Landmark, MoreHorizontal } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import QuickMenu from './QuickMenu'

const navItems = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/about', label: 'About', icon: Info },
  { to: '/invest', label: 'Invest', icon: Landmark },
]

function BottomNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border/70 bg-[rgba(11,7,20,0.95)] backdrop-blur supports-[backdrop-filter]:bg-[rgba(11,7,20,0.9)]">
        <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-5 lg:px-8">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  isActive ? 'bg-[rgba(198,241,53,0.16)] text-brand-lime' : 'text-brand-muted hover:text-brand-text'
                }`
              }
            >
              <Icon size={18} className="mb-1" />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition text-brand-muted hover:text-brand-text"
            aria-label="Open more menu"
          >
            <MoreHorizontal size={18} className="mb-1" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <QuickMenu open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default BottomNav

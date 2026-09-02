import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Users, ListChecks, History, CreditCard, User, MessageSquare, ShieldCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../../styles/wave-bounce.css'

const items = [
  { title: 'Tasks', subtitle: 'Daily earning tasks', to: '/tasks', icon: ListChecks },
  { title: 'History', subtitle: 'Transaction history', to: '/history', icon: History },
  { title: 'Referrals', subtitle: 'Invite & earn', to: '/referrals', icon: Users },
  { title: 'Withdraw', subtitle: 'Cash out earnings', to: '/withdraw', icon: CreditCard },
  { title: 'Profile', subtitle: 'Account settings', to: '/profile', icon: User },
  { title: 'Community', subtitle: 'Join the network', to: '/community', icon: Users },
  { title: 'Support', subtitle: 'Get help fast', to: '/support', icon: MessageSquare },
  { title: 'Trust', subtitle: 'Verification dossier', to: '/about', icon: ShieldCheck },
]

function QuickMenu({ open, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSelect = (to) => {
    onClose()
    if (to.startsWith('/home#')) {
      navigate('/home')
      setTimeout(() => {
        const id = to.replace('/home#', '')
        const el = document.getElementById(id)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return
    }

    navigate(to)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full sm:max-w-xl"
            initial={{ y: '100vh' }}
            animate={{ y: 0 }}
            exit={{ y: '100vh' }}
            transition={{ type: 'spring', damping: 22, stiffness: 260, mass: 0.95 }}
          >
            <div className="mx-auto mb-0 w-full sm:mb-0">
              <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[rgba(11,7,20,0.96)] p-4 sm:rounded-2xl sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="hidden sm:block" />
                  <div className="mx-auto text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[rgba(198,241,53,0.95)]">Quick Menu</div>
                    <div className="mt-1 text-xs text-[rgba(167,159,146,0.85)]">Everything you need, one tap away.</div>
                  </div>
                  <button onClick={onClose} className="text-brand-muted">
                    <X size={18} />
                  </button>
                </div>

                <motion.div
                  className="mt-4 grid grid-cols-2 gap-3"
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
                  }}
                >
                  {items.map((item, index) => (
                    <motion.button
                      key={item.title}
                      onClick={() => handleSelect(item.to)}
                      style={{ '--wave-delay': `${index * 0.15}s` }}
                      className="wave-bounce-item flex h-24 flex-col items-start justify-center gap-2 rounded-xl border border-[rgba(198,241,53,0.06)] bg-[rgba(198,241,53,0.02)] p-3 text-left"
                      variants={{
                        hidden: { opacity: 0, scale: 0.6 },
                        show: { opacity: 1, scale: [1.05, 0.98, 1], transition: { type: 'spring', stiffness: 320, damping: 18 } },
                        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.16 } },
                      }}
                    >
                      <div className="rounded-lg bg-[rgba(198,241,53,0.06)] p-2 text-[rgba(198,241,53,0.95)]">
                        <item.icon size={16} />
                      </div>
                      <div className="mt-1 text-sm font-semibold text-brand-text">{item.title}</div>
                      <div className="text-xs text-brand-muted">{item.subtitle}</div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default QuickMenu

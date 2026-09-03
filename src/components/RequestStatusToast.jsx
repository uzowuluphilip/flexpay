import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'

const requestMessages = {
  withdrawal: 'Your withdrawal request will be approved within 24 hours.',
  topup: 'Your top-up request will be approved within 24 hours.',
  upgrade: 'Your upgrade request will be approved within 24 hours.',
}

function RequestStatusToast() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timer

    const showMessage = (event) => {
      const nextMessage = requestMessages[event.detail?.type]
      if (!nextMessage) return

      setMessage(nextMessage)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(''), 5000)
    }

    window.addEventListener('flexpay-request-submitted', showMessage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('flexpay-request-submitted', showMessage)
    }
  }, [])

  return (
    <aside
      aria-live="polite"
      aria-label="Request status"
      className={`pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center transition-all duration-300 sm:inset-x-6 ${message ? 'translate-y-0 opacity-100' : '-translate-y-5 opacity-0'}`}
    >
      <div className="flex w-full max-w-[390px] items-center gap-2.5 rounded-xl border border-slate-700/80 bg-[#090d14]/95 px-3 py-2.5 text-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Info size={18} className="shrink-0 text-slate-200" />
        <p className="text-xs font-semibold leading-5 sm:text-sm">{message}</p>
      </div>
    </aside>
  )
}

export default RequestStatusToast

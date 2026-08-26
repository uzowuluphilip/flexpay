import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import telegramLogo from '../../assets/brand/telegram.png'

function SupportPage() {
  const navigate = useNavigate()
  const telegramHandle = 'FlexPaySupport'
  const telegramUrl = `https://t.me/${telegramHandle}`

  return (
    <div className="min-h-screen bg-brand-base text-brand-text">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4 rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 px-4 py-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)] sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-base/80 text-brand-text transition hover:border-brand-lime"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-brand-lime/10 text-brand-lime shadow-[0_12px_28px_rgba(198,241,53,0.18)]">
            <img src={telegramLogo} alt="Telegram" className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xl font-semibold text-brand-text">Support</p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 rounded-[2rem] border border-brand-border/60 bg-brand-panel/90 px-6 py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:px-8">
          <div className="flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-[rgba(29,155,240,0.12)] text-[#0088cc] shadow-[0_12px_28px_rgba(0,136,204,0.18)]">
            <img src={telegramLogo} alt="Telegram" className="h-12 w-12" />
          </div>

          <div className="flex items-center justify-center gap-2 text-3xl font-semibold text-brand-text sm:text-4xl">
            <span>Need Help?</span>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0088cc]/15 text-[#0088cc]">
              <img src={telegramLogo} alt="Telegram" className="h-5 w-5" />
            </span>
          </div>

          <p className="max-w-sm text-sm text-brand-muted">Our support team is ready to assist you on Telegram.</p>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0088cc] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#007ab8]"
          >
            Contact on Telegram
          </a>

          <div className="rounded-full border border-brand-border/60 bg-brand-base/90 px-4 py-2 text-sm text-brand-text">
            @{telegramHandle}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SupportPage

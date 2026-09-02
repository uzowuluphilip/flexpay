import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, BriefcaseBusiness, Camera, Copy, Link2, MessageCircle, Music2, Share2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getReferralInfo } from '../../lib/api/wallet'
import telegramLogo from '../../assets/brand/telegram.png'

function ReferralProgram() {
  const { session } = useAuth()
  const [referralInfo, setReferralInfo] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    async function loadReferralInfo() {
      const data = await getReferralInfo()
      setReferralInfo(data)
    }

    loadReferralInfo()
  }, [])

  const referralCode = referralInfo?.code || session?.referralCode || 'FLEXPAY'
  const referralLink = referralInfo?.link || `https://flexpay-theta.vercel.app/register?ref=${encodeURIComponent(referralCode)}`

  const shareMessage = useMemo(() => {
    return referralInfo?.message || `🚨🔥 STOP SCROLLING — THIS IS YOUR SIGN! 💸\n\n💰 I'm cashing out HUGE on Flexpay and YOU'RE next!\n🎁 Grab a FREE ₦60,000 welcome bonus the second you sign up\n⚡ Earn ₦15,000 for EVERY friend you bring in\n🏦 Withdraw straight to your bank — fast, real, no stress\n🎯 Daily rewards, spins & bonuses waiting for you\n\n🔗 Tap my link NOW: ${referralLink}\n🆔 Referral Code: ${referralCode}\n\n🚀 Don't watch others get rich — JOIN ME TODAY!`
  }, [referralCode, referralInfo, referralLink])

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      if (text === shareMessage) {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 1200)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.prompt('Copy this link manually:', text)
      }
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FlexPay referral', text: shareMessage })
        return
      } catch {
        // fall back
      }
    }
    await copyText(shareMessage)
  }

  return (
    <section id="referrals" className="rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.92)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Referral Program</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-text">Your referral link</h2>
        </div>
        <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
          <BadgeCheck size={18} />
        </div>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Your Link</p>
            <p className="mt-2 break-all font-mono text-sm text-brand-text">{referralLink}</p>
          </div>
          <button onClick={() => copyText(referralLink)} className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2.5 text-brand-lime">
            <Copy size={16} />
          </button>
        </div>
        {copied ? <p className="mt-3 text-sm text-brand-lime">Copied!</p> : null}
      </div>

      <button onClick={() => copyText(shareMessage)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3 text-sm font-semibold text-brand-base">
        <Link2 size={16} /> Copy link, code & message
      </button>
      {shareCopied ? <p className="mt-3 text-center text-sm text-brand-lime">Copied!</p> : null}

      <div className="mt-5 rounded-[1.25rem] border border-brand-border/70 bg-[rgba(11,7,20,0.4)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-brand-muted">Share</p>
            <h3 className="mt-1 text-lg font-semibold text-brand-text">Share with multiple friends</h3>
          </div>
          <div className="rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] p-2 text-brand-lime">
            <Share2 size={18} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Telegram', color: 'bg-[#24A1DE]', icon: telegramLogo, href: 'https://t.me/OFFICIALFLEXPAY' },
            { label: 'WhatsApp', color: 'bg-[#25D366]', icon: MessageCircle, href: 'https://whatsapp.com/channel/0029VbDqaE5HAdNNxVvH1d1V' },
            { label: 'Instagram', color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]', icon: Camera },
            { label: 'LinkedIn', color: 'bg-[#0A66C2]', icon: BriefcaseBusiness },
            { label: 'TikTok', color: 'bg-[#111111]', icon: Music2 },
          ].map(({ label, color, icon, href }) => {
            const Icon = icon
            const content = (
              <>
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${color} text-brand-base`}>
                  {typeof Icon === 'string' ? (
                    <img src={Icon} alt="Telegram" className="h-5 w-5" />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                <span className="mt-3 text-[11px] uppercase tracking-[0.2em] text-brand-muted">{label}</span>
              </>
            )

            return href ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Open official FlexPay ${label} channel`} className="flex flex-col items-center justify-center rounded-[1.25rem] border border-brand-border/70 bg-[rgba(21,15,46,0.9)] p-3 text-center text-sm text-brand-text">
                {content}
              </a>
            ) : (
              <button key={label} type="button" className="flex flex-col items-center justify-center rounded-[1.25rem] border border-brand-border/70 bg-[rgba(21,15,46,0.9)] p-3 text-center text-sm text-brand-text">
                {content}
              </button>
            )
          })}
        </div>

        <button onClick={handleNativeShare} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.4)] px-4 py-3 text-sm font-semibold text-brand-lime">
          <Share2 size={16} /> More
        </button>
      </div>
    </section>
  )
}

export default ReferralProgram

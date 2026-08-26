import { Link, useSearchParams } from 'react-router-dom'

function VerifyEmailNotice() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || 'your inbox'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2d6b4a] bg-[rgba(46,107,74,0.14)] p-4 text-sm text-[#a7f0c4]">
        We’ve sent a verification link to <span className="font-semibold text-white">{email}</span>. Open it to activate your account.
      </div>
      <div className="rounded-2xl border border-brand-border/60 bg-[rgba(11,7,20,0.4)] p-4 text-sm leading-7 text-brand-muted">
        <p>Need the email again? The stub flow will continue without a real mailbox, so you can proceed to the next step.</p>
      </div>
      <Link to="/login" className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3.5 text-sm font-semibold text-brand-base transition">
        Continue to sign in
      </Link>
    </div>
  )
}

export default VerifyEmailNotice

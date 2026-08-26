import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/brand/flexpay-logo.svg'

function AuthLayout({ children, title, subtitle, footerLink, footerHref }) {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-brand-base px-4 py-6 text-brand-text sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-center">
        <div className="mx-auto w-full max-w-[480px] rounded-[1.75rem] border border-brand-border/70 bg-[rgba(21,15,46,0.88)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="mb-6 text-center">
            <Link to="/" className="inline-flex items-center justify-center">
              <img src={logo} alt="FlexPay logo" className="h-9 w-auto" />
            </Link>
            <div className="mt-5 rounded-full border border-brand-border/70 bg-[rgba(198,241,53,0.08)] px-3 py-1.5 text-sm text-brand-lime">
              Secure access • no phone OTP
            </div>
            <h1 className="mt-5 font-display text-2xl text-brand-text sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-7 text-brand-muted">{subtitle}</p>
          </div>

          <div className="rounded-[1.25rem] border border-brand-border/60 bg-[rgba(11,7,20,0.4)] p-3 sm:p-5">
            {children}
          </div>

          {footerLink ? (
            <div className="mt-5 text-center text-sm text-brand-muted">
              <Link to={footerHref} className="font-semibold text-brand-lime transition hover:text-[#f6c353]">
                {footerLink}
              </Link>
            </div>
          ) : null}

          <div className="mt-4 text-center text-sm text-brand-muted">
            <Link to={location.pathname === '/login' ? '/register' : '/login'} className="font-semibold text-brand-lime transition hover:text-[#f6c353]">
              {location.pathname === '/login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout

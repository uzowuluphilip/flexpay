import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../../lib/api/auth'
import { useAuth } from '../../hooks/useAuth'
import { hasCompletedOnboarding } from '../../pages/auth/OnboardingPage'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})

function SignInForm() {
  const navigate = useNavigate()
  const { signIn: setSession } = useAuth()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setLoading(true)
    setServerError('')
    try {
      const result = await signIn(values.email, values.password)
      setSession(result.user)
      navigate(hasCompletedOnboarding(result.user?.id) ? '/home' : '/onboarding')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Email</label>
        <input type="email" {...register('email')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" placeholder="you@example.com" />
        {errors.email ? <p className="mt-2 text-sm text-brand-danger">{errors.email.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Password</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} {...register('password')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 pr-14 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" placeholder="••••••••" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted transition hover:text-brand-lime" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {errors.password ? <p className="mt-2 text-sm text-brand-danger">{errors.password.message}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-brand-muted">
          <input type="checkbox" {...register('remember')} className="h-4 w-4 rounded border-brand-border bg-transparent" />
          Remember me
        </label>
        <Link to="/forgot-password" className="font-semibold text-brand-lime transition hover:text-[#f6c353]">Forgot password?</Link>
      </div>

      {serverError ? <div className="rounded-2xl border border-brand-danger/60 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{serverError}</div> : null}

      <button type="submit" disabled={loading} className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3.5 text-sm font-semibold text-brand-base transition disabled:cursor-not-allowed disabled:opacity-75">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

export default SignInForm

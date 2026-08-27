import { useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signUp } from '../../lib/api/auth'
import PasswordStrengthMeter from './PasswordStrengthMeter'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must include at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  referralCode: z.string().optional(),
  terms: z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function SignUpForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      referralCode: searchParams.get('ref') || '',
      terms: false,
    },
  })
  const password = watch('password', '')

  const onSubmit = async (values) => {
    setLoading(true)
    setServerError('')
    try {
      const result = await signUp({ fullName: values.fullName, email: values.email, password: values.password, referralCode: values.referralCode })
      navigate('/login')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const strength = useMemo(() => {
    if (password.length >= 8 && /\d/.test(password)) return 'Strong'
    if (password.length >= 8) return 'Good'
    if (password.length >= 6) return 'Fair'
    return 'Too weak'
  }, [password])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Full name</label>
        <input type="text" {...register('fullName')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
        {errors.fullName ? <p className="mt-2 text-sm text-brand-danger">{errors.fullName.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Email</label>
        <input type="email" {...register('email')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
        {errors.email ? <p className="mt-2 text-sm text-brand-danger">{errors.email.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Password</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} {...register('password')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 pr-14 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted transition hover:text-brand-lime" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
        {errors.password ? <p className="mt-2 text-sm text-brand-danger">{errors.password.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Confirm password</label>
        <div className="relative">
          <input type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 pr-14 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
          <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted transition hover:text-brand-lime" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
            {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {errors.confirmPassword ? <p className="mt-2 text-sm text-brand-danger">{errors.confirmPassword.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Referral code</label>
        <input type="text" {...register('referralCode')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" placeholder="Optional" />
      </div>
      <div className="rounded-2xl border border-brand-border/60 bg-[rgba(198,241,53,0.05)] p-3 text-sm text-brand-muted">
        <label className="flex items-start gap-2">
          <input type="checkbox" {...register('terms')} className="mt-1 h-4 w-4 rounded border-brand-border bg-transparent" />
          <span>I agree to the <Link to="/terms" className="font-semibold text-brand-lime">terms</Link> and <Link to="/privacy" className="font-semibold text-brand-lime">privacy policy</Link>.</span>
        </label>
        {errors.terms ? <p className="mt-2 text-sm text-brand-danger">{errors.terms.message}</p> : null}
      </div>
      {serverError ? <div className="rounded-2xl border border-brand-danger/60 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{serverError}</div> : null}
      <button type="submit" disabled={loading} className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3.5 text-sm font-semibold text-brand-base transition disabled:cursor-not-allowed disabled:opacity-75">
        {loading ? 'Creating account…' : 'Sign Up & Get ₦60,000 Bonus'}
      </button>
      <p className="text-center text-xs text-brand-muted">Password strength: <span className="font-semibold text-brand-lime">{strength}</span></p>
    </form>
  )
}

export default SignUpForm

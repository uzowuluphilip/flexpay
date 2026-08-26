import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../lib/api/auth'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must include at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function ResetPasswordForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setLoading(true)
    setServerError('')
    setSuccess('')
    try {
      await resetPassword({ email: searchParams.get('email') || '', token: searchParams.get('token') || '', password: values.password })
      setSuccess('Password reset successfully. You can sign in with your new password.')
      navigate('/login')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-brand-muted">New password</label>
        <input type="password" {...register('password')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
        {errors.password ? <p className="mt-2 text-sm text-brand-danger">{errors.password.message}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-brand-muted">Confirm password</label>
        <input type="password" {...register('confirmPassword')} className="w-full rounded-full border border-brand-border/70 bg-[rgba(11,7,20,0.72)] px-4 py-3 text-sm text-brand-text outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" />
        {errors.confirmPassword ? <p className="mt-2 text-sm text-brand-danger">{errors.confirmPassword.message}</p> : null}
      </div>
      {serverError ? <div className="rounded-2xl border border-brand-danger/60 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{serverError}</div> : null}
      {success ? <div className="rounded-2xl border border-brand-success/60 bg-brand-success/10 px-4 py-3 text-sm text-brand-success">{success}</div> : null}
      <button type="submit" disabled={loading} className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3.5 text-sm font-semibold text-brand-base transition disabled:cursor-not-allowed disabled:opacity-75">
        {loading ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  )
}

export default ResetPasswordForm

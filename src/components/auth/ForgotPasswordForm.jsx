import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { forgotPassword } from '../../lib/api/auth'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

function ForgotPasswordForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setLoading(true)
    setServerError('')
    setSuccess('')
    try {
      await forgotPassword(values.email)
      setSuccess('Magic link sent. Check your inbox for the reset link.')
      navigate('/reset-password?email=' + encodeURIComponent(values.email))
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
      {serverError ? <div className="rounded-2xl border border-brand-danger/60 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">{serverError}</div> : null}
      {success ? <div className="rounded-2xl border border-brand-success/60 bg-brand-success/10 px-4 py-3 text-sm text-brand-success">{success}</div> : null}
      <button type="submit" disabled={loading} className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-lime to-brand-lime-light px-4 py-3.5 text-sm font-semibold text-brand-base transition disabled:cursor-not-allowed disabled:opacity-75">
        {loading ? 'Sending link…' : 'Send reset link'}
      </button>
    </form>
  )
}

export default ForgotPasswordForm

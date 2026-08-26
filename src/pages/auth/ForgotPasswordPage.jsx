import AuthLayout from '../../layouts/AuthLayout'
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm'

function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email linked to your account, and we’ll send a secure reset link."
      footerLink="Back to sign in"
      footerHref="/login"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  )
}

export default ForgotPasswordPage

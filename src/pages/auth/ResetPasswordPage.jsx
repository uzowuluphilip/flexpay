import AuthLayout from '../../layouts/AuthLayout'
import ResetPasswordForm from '../../components/auth/ResetPasswordForm'

function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Set a strong password for your FlexPay account and continue securely."
      footerLink="Back to sign in"
      footerHref="/login"
    >
      <ResetPasswordForm />
    </AuthLayout>
  )
}

export default ResetPasswordPage

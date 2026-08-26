import AuthLayout from '../../layouts/AuthLayout'
import VerifyEmailNotice from '../../components/auth/VerifyEmailNotice'

function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Check your email"
      subtitle="Verify your address to unlock full account access."
      footerLink="Back to sign in"
      footerHref="/login"
    >
      <VerifyEmailNotice />
    </AuthLayout>
  )
}

export default VerifyEmailPage

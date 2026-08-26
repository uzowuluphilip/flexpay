import AuthLayout from '../../layouts/AuthLayout'
import SignInForm from '../../components/auth/SignInForm'

function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to view your FlexPay wallet, transfer funds, and manage your next payout."
      footerLink=""
      footerHref="/register"
    >
      <SignInForm />
    </AuthLayout>
  )
}

export default LoginPage

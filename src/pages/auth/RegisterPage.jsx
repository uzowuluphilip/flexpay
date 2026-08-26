import AuthLayout from '../../layouts/AuthLayout'
import SignUpForm from '../../components/auth/SignUpForm'

function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join FlexPay in minutes with a simple, secure setup designed for modern teams."
      footerLink=""
      footerHref="/login"
    >
      <SignUpForm />
    </AuthLayout>
  )
}

export default RegisterPage

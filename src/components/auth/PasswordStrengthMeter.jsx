function PasswordStrengthMeter({ password }) {
  const score = password?.length >= 8 && /\d/.test(password) ? 3 : password?.length >= 8 ? 2 : password?.length >= 6 ? 1 : 0

  const labels = ['Too weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-[#4d4031]', 'bg-[#8c6131]', 'bg-[#c0892f]', 'bg-brand-lime']

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        {[0, 1, 2].map((step) => (
          <div key={step} className={`h-2 flex-1 rounded-full ${step < score ? colors[score - 1] || colors[0] : 'bg-[rgba(255,255,255,0.14)]'}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-brand-muted">{password ? `Strength: ${labels[score]}` : 'Use at least 8 characters and one number.'}</p>
    </div>
  )
}

export default PasswordStrengthMeter

import { useEffect, useState } from 'react'
import '../styles/lightning-waves.css'

function LightningWaveBackground() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className="lightning-wave-background" data-reduced-motion={prefersReducedMotion}>
      {/* Radial glow layer */}
      <div className="lightning-glow-layer" />

      {/* SVG Wave layers */}
      <svg className="lightning-wave-svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
        {/* Back wave - violet, slowest */}
        <defs>
          <linearGradient id="grad-violet" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#7C3AED', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 0.1 }} />
          </linearGradient>

          <linearGradient id="grad-lime" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#C6F135', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#C6F135', stopOpacity: 0.2 }} />
          </linearGradient>

          <linearGradient id="grad-lime-light" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#E1FF6B', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#E1FF6B', stopOpacity: 0.25 }} />
          </linearGradient>
        </defs>

        {/* Back wave - violet */}
        <path
          className="wave wave-back"
          d="M0,160 Q360,100 720,160 T1440,160 L1440,320 L0,320 Z"
          fill="url(#grad-violet)"
        />

        {/* Middle wave - lime */}
        <path
          className="wave wave-middle"
          d="M0,200 Q360,140 720,200 T1440,200 L1440,320 L0,320 Z"
          fill="url(#grad-lime)"
        />

        {/* Front wave - light lime with flicker */}
        <path
          className="wave wave-front"
          d="M0,240 Q360,180 720,240 T1440,240 L1440,320 L0,320 Z"
          fill="url(#grad-lime-light)"
        />
      </svg>
    </div>
  )
}

export default LightningWaveBackground

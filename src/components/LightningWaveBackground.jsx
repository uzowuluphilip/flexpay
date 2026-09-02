import '../styles/lightning-waves.css'

function LightningWaveBackground() {
  return (
    <div className="lightning-wave-background">
      <div className="lightning-glow-layer" />
      <div className="lightning-wave-layer">
        <svg viewBox="0 0 1600 400" preserveAspectRatio="none">
          <path className="wave-path wave-1" d="M0,120 C100,40 200,200 300,120 C400,40 500,200 600,120 C700,40 800,200 900,120 C1000,40 1100,200 1200,120 C1300,40 1400,200 1500,120 C1600,40 1700,200 1800,120" />
          <path className="wave-path wave-2" d="M0,180 C120,260 220,100 340,180 C460,260 560,100 680,180 C800,260 900,100 1020,180 C1140,260 1240,100 1360,180 C1480,260 1580,100 1700,180" />
          <path className="wave-path wave-3" d="M0,260 C150,330 250,190 400,260 C550,330 650,190 800,260 C950,330 1050,190 1200,260 C1350,330 1450,190 1600,260" />
        </svg>
      </div>
    </div>
  )
}

export default LightningWaveBackground

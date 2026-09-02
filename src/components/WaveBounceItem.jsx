import '../styles/wave-bounce.css'

function WaveBounceItem({ children, className = '', subtle = false }) {
  return (
    <div className={`wave-bounce-item ${subtle ? 'subtle' : ''} ${className}`}>
      {children}
    </div>
  )
}

export default WaveBounceItem

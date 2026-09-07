const SOUND_KEY = 'flexpay-sounds-enabled'
const audioState = { context: null }

function ensureAudioContext() {
  if (typeof window === 'undefined') return null

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  if (!audioState.context) {
    audioState.context = new AudioContext()
  }

  if (audioState.context.state === 'suspended') {
    audioState.context.resume().catch(() => {})
  }

  return audioState.context
}

export function getSoundsEnabled() {
  if (typeof window === 'undefined') return true
  const saved = window.localStorage.getItem(SOUND_KEY)
  return saved === null ? true : saved !== 'false'
}

export function setSoundsEnabled(nextValue) {
  const enabled = Boolean(nextValue)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('flexpay-sounds-changed', { detail: { enabled } }))
  }

  return enabled
}

function playTone({ frequency = 440, duration = 0.12, type = 'sine', volume = 0.04 }) {
  if (!getSoundsEnabled() || typeof window === 'undefined') return false

  const audioContext = ensureAudioContext()
  if (!audioContext) return false

  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const start = audioContext.currentTime

  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(start)
  oscillator.stop(start + duration)

  return true
}

export function playSound(type = 'tap') {
  if (!getSoundsEnabled() || typeof window === 'undefined') return false

  const patterns = {
    tap: [{ frequency: 440, duration: 0.06, type: 'sine', volume: 0.028 }],
    toggle: [
      { frequency: 300, duration: 0.05, type: 'triangle', volume: 0.025 },
      { frequency: 540, duration: 0.08, type: 'triangle', volume: 0.03 },
    ],
    success: [
      { frequency: 420, duration: 0.07, type: 'sine', volume: 0.03 },
      { frequency: 620, duration: 0.09, type: 'sine', volume: 0.036 },
      { frequency: 820, duration: 0.12, type: 'triangle', volume: 0.04 },
    ],
    reward: [
      { frequency: 540, duration: 0.08, type: 'triangle', volume: 0.032 },
      { frequency: 700, duration: 0.08, type: 'triangle', volume: 0.036 },
      { frequency: 980, duration: 0.14, type: 'sine', volume: 0.04 },
    ],
    error: [{ frequency: 180, duration: 0.12, type: 'sawtooth', volume: 0.03 }],
    warning: [{ frequency: 260, duration: 0.1, type: 'square', volume: 0.025 }],
  }

  const chosen = patterns[type] || patterns.tap

  chosen.forEach((tone, index) => {
    const delayMs = index * 55
    window.setTimeout(() => {
      playTone(tone)
    }, delayMs)
  })

  return true
}

export function installGlobalSoundCues() {
  if (typeof window === 'undefined') return

  if (document.documentElement.dataset.flexpaySoundInstalled === 'true') return
  document.documentElement.dataset.flexpaySoundInstalled = 'true'

  const unlockAudio = () => {
    ensureAudioContext()
  }

  const triggerFromEvent = (event) => {
    unlockAudio()
    if (!getSoundsEnabled() || event.defaultPrevented) return

    const target = event.target
    if (!(target instanceof Element)) return

    const interactive = target.closest('button, a, input, select, textarea, [role="button"], [data-sound-trigger]')
    if (!interactive) return

    const customType = interactive.dataset.soundType || 'tap'
    playSound(customType)
  }

  document.addEventListener('pointerdown', unlockAudio, { once: true })
  document.addEventListener('click', triggerFromEvent, true)
  document.addEventListener('keydown', (event) => {
    unlockAudio()
    if (!['Enter', ' ', 'Spacebar'].includes(event.key)) return
    if (!getSoundsEnabled()) return

    const activeElement = document.activeElement
    if (!(activeElement instanceof HTMLElement)) return

    const interactive = activeElement.closest('button, a, input, select, textarea, [role="button"], [data-sound-trigger]')
    if (!interactive) return

    playSound(interactive.dataset.soundType || 'tap')
  }, true)
}

// Web Audio API synthesizer for subtle wooden chess piece acoustics (zero external audio files)

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      audioCtx = new AudioCtx()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function createNoiseBurst(ctx: AudioContext, durationSec: number, filterFreq: number, gainValue: number, startTime: number) {
  const sampleCount = Math.floor(ctx.sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < sampleCount; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.25))
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(filterFreq, startTime)
  filter.Q.setValueAtTime(1.8, startTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(gainValue, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(startTime)
  noise.stop(startTime + durationSec)
}

export function playWoodenMove(muted = false): void {
  if (muted) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  // Warm wooden body thump
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(210, now)
  osc.frequency.exponentialRampToValueAtTime(88, now + 0.055)

  gain.gain.setValueAtTime(0.24, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.07)

  // Crisp wood surface tap
  createNoiseBurst(ctx, 0.04, 1150, 0.16, now)
}

export function playWoodenCapture(muted = false): void {
  if (muted) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  // Double-layered wood clack
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(280, now)
  osc.frequency.exponentialRampToValueAtTime(95, now + 0.075)

  gain.gain.setValueAtTime(0.32, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.09)

  createNoiseBurst(ctx, 0.055, 1650, 0.25, now)
  createNoiseBurst(ctx, 0.04, 820, 0.14, now + 0.015)
}

export function playCheckSound(muted = false): void {
  if (muted) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  playWoodenCapture(false)

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, now + 0.02)
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.18)

  gain.gain.setValueAtTime(0.11, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now + 0.02)
  osc.stop(now + 0.21)
}

export function playErrorSound(muted = false): void {
  if (muted) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(175, now)
  osc.frequency.exponentialRampToValueAtTime(125, now + 0.14)

  gain.gain.setValueAtTime(0.14, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.17)
}

export function playSuccessChime(muted = false): void {
  if (muted) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [392.0, 493.88, 587.33] // G4, B4, D5 warm triad
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    const t = now + idx * 0.075
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.35)
  })
}

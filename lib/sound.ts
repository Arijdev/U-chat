// Synthetic audio tones using Web Audio API for call ringing and ringback
let audioCtx: AudioContext | null = null
let ringInterval: NodeJS.Timeout | null = null
let activeOscillators: OscillatorNode[] = []

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch (e) {
    return null
  }
}

/**
 * Play WhatsApp-style incoming call melody pattern
 */
export function playIncomingRingtone(): () => void {
  stopCallSounds()
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  const playChimeSequence = () => {
    if (!ctx || ctx.state === "closed") return
    try {
      const notes = [
        { freq: 523.25, time: 0, dur: 0.18 },    // C5
        { freq: 659.25, time: 0.2, dur: 0.18 },  // E5
        { freq: 783.99, time: 0.4, dur: 0.25 },  // G5
        { freq: 1046.5, time: 0.7, dur: 0.35 },  // C6
      ]

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time)

        gain.gain.setValueAtTime(0, ctx.currentTime + time)
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + time + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime + time)
        osc.stop(ctx.currentTime + time + dur)

        activeOscillators.push(osc)
      })
    } catch (e) {}
  }

  playChimeSequence()
  ringInterval = setInterval(playChimeSequence, 2400)

  return stopCallSounds
}

/**
 * Play outgoing ringback tone (soft double pulse)
 */
export function playOutgoingRingback(): () => void {
  stopCallSounds()
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  const playPulse = () => {
    if (!ctx || ctx.state === "closed") return
    try {
      const pulses = [0, 0.22]
      pulses.forEach((offset) => {
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = "sine"
        osc1.frequency.setValueAtTime(440, ctx.currentTime + offset)
        osc2.type = "sine"
        osc2.frequency.setValueAtTime(480, ctx.currentTime + offset)

        gain.gain.setValueAtTime(0, ctx.currentTime + offset)
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.16)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(ctx.currentTime + offset)
        osc2.start(ctx.currentTime + offset)
        osc1.stop(ctx.currentTime + offset + 0.16)
        osc2.stop(ctx.currentTime + offset + 0.16)

        activeOscillators.push(osc1, osc2)
      })
    } catch (e) {}
  }

  playPulse()
  ringInterval = setInterval(playPulse, 2000)

  return stopCallSounds
}

/**
 * Stop all active call sounds
 */
export function stopCallSounds() {
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
  activeOscillators.forEach((osc) => {
    try {
      osc.stop()
    } catch (e) {}
  })
  activeOscillators = []
}

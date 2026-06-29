let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!sharedCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return null
      sharedCtx = new Ctor()
    }
    return sharedCtx
  } catch {
    return null
  }
}

export function primeAudio() {
  const ctx = getCtx()
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => { })
}

function playTone(
  type: OscillatorType,
  f1: number,
  f2: number,
  gain0: number,
  duration: number
) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === "suspended") ctx.resume().catch(() => { })
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(f1, t)
    osc.frequency.setValueAtTime(f2, t + 0.1)
    gain.gain.setValueAtTime(gain0, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.start(t)
    osc.stop(t + duration)
    osc.onended = () => {
      try {
        osc.disconnect()
        gain.disconnect()
      } catch { }
    }
  } catch { }
}

export function playSuccessSound() {
  playTone("sine", 880, 1320, 0.2, 0.35)
}

export function playErrorSound() {
  playTone("sawtooth", 220, 110, 0.3, 0.4)
}

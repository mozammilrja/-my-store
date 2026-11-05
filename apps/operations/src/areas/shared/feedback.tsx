import { CheckCircle2, XCircle } from "lucide-react"
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { cn } from "./ui"

/*
 * Scan feedback for a noisy floor: a toast, plus a short tone and a buzz
 * (where the device allows) so the operator knows without looking. Errors
 * stay until dismissed or replaced; successes clear themselves.
 */

type Toast = { id: number; tone: "ok" | "bad"; text: string }
const Ctx = createContext<{ ok: (text: string) => void; bad: (text: string) => void } | null>(null)

let audio: AudioContext | null = null
function beep(tone: "ok" | "bad") {
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = tone === "ok" ? 1320 : 220
    osc.type = tone === "ok" ? "sine" : "square"
    gain.gain.value = 0.06
    osc.connect(gain).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + (tone === "ok" ? 0.08 : 0.35))
  } catch {
    // No audio on this device.
  }
  if ("vibrate" in navigator) navigator.vibrate(tone === "ok" ? 30 : [80, 60, 80])
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = ++seq.current
    beep(tone)
    setToasts((t) => [...t.filter((x) => x.tone !== tone), { id, tone, text }].slice(-3))
    if (tone === "ok") setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500)
  }, [])
  const value = { ok: useCallback((t: string) => push("ok", t), [push]), bad: useCallback((t: string) => push("bad", t), [push]) }
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "bad" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-panel border px-4 py-3 text-sm font-medium shadow-lg",
              t.tone === "ok" ? "border-ok/30 bg-ok-bg text-ok" : "border-bad/30 bg-bad-bg text-bad"
            )}
          >
            {t.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            {t.tone === "bad" ? (
              <button className="text-xs underline" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                Dismiss
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useFeedback() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useFeedback outside FeedbackProvider")
  return v
}

import { Camera, ScanLine, X } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Button, cn, Dialog } from "./ui"

/*
 * The scanner input. Handheld and ring scanners type the code and press
 * Enter, so this is a text field that submits on Enter and keeps focus for
 * the next scan. On devices whose browser has the Barcode Detection API
 * (Chrome on Android, ChromeOS, macOS) a camera button scans with the
 * device camera; elsewhere the button isn't shown.
 */

type Props = {
  label: string
  placeholder?: string
  onScan: (code: string) => void | Promise<void>
  disabled?: boolean
  autoFocus?: boolean
  /** Format hints for the camera (Code 128 by default, plus QR). */
  formats?: string[]
  className?: string
}

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (opts: { formats: string[] }) => Detector

const detectorCtor = () => (typeof window !== "undefined" ? ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null) : null)

export function ScanField({ label, placeholder = "Scan or type, then Enter", onScan, disabled, autoFocus = true, formats = ["code_128", "qr_code"], className }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [camera, setCamera] = useState(false)
  const canUseCamera = !!detectorCtor() && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

  const submit = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onScan(trimmed)
    } finally {
      setBusy(false)
      setValue("")
      requestAnimationFrame(() => input.current?.focus())
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(value)
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id={id}
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={placeholder}
            className="h-12 w-full rounded-control border border-line-strong bg-panel pr-3 pl-10 font-mono text-base text-ink placeholder:font-sans placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none disabled:opacity-50"
          />
        </div>
        <Button type="submit" size="lg" busy={busy} disabled={disabled || !value.trim()}>
          Enter
        </Button>
        {canUseCamera ? (
          <Button type="button" size="lg" variant="secondary" onClick={() => setCamera(true)} disabled={disabled} aria-label="Scan with camera">
            <Camera className="size-5" aria-hidden />
          </Button>
        ) : null}
      </div>
      {canUseCamera ? (
        <Dialog open={camera} onClose={() => setCamera(false)} title="Scan with camera">
          <CameraScanner
            formats={formats}
            onResult={(code) => {
              setCamera(false)
              void submit(code)
            }}
            onCancel={() => setCamera(false)}
          />
        </Dialog>
      ) : null}
    </form>
  )
}

/** Reads one barcode from the rear camera. The camera runs only while this is open, and is released on close. */
function CameraScanner({ formats, onResult, onCancel }: { formats: string[]; onResult: (code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  // The latest callback, so a re-render of the parent doesn't restart the camera.
  const result = useRef(onResult)
  result.current = onResult
  const formatKey = formats.join(",")

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0
    const Ctor = detectorCtor()
    if (!Ctor) return
    const detector = new Ctor({ formats: formatKey.split(",") })
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const [hit] = await detector.detect(video.current)
            if (hit?.rawValue) return result.current(hit.rawValue)
          } catch {
            // Frame not ready yet.
          }
          timer = window.setTimeout(tick, 150)
        }
        void tick()
      } catch (e) {
        setError((e as Error).name === "NotAllowedError" ? "Camera access was refused. Allow it in the browser's site settings, or use the scanner." : "The camera couldn't be started.")
      }
    })()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [formatKey])

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-bad">{error}</p> : <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-control bg-black object-cover" />}
      <Button variant="secondary" className="w-full" onClick={onCancel}>
        <X className="size-4" aria-hidden /> Cancel
      </Button>
    </div>
  )
}

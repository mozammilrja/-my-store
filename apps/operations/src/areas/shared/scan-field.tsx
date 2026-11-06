import { Camera, Loader2, ScanLine, X } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Button, cn, Dialog } from "./ui"

/*
 * The scanner input. Handheld and ring scanners type the code and press
 * Enter, so this is a text field that submits on Enter and keeps focus for
 * the next scan. A camera button scans with the device camera wherever the
 * browser can open it: with the built-in Barcode Detection API (Chrome on
 * Android, ChromeOS, macOS), or else with the same API from the
 * `barcode-detector` polyfill (ZXing compiled to WebAssembly, served from
 * this app, loaded only when the camera is first opened). That is how
 * iPhones and iPads scan.
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

const nativeDetector = () => (typeof window !== "undefined" ? ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null) : null)

/** The browser's own detector, or the WebAssembly one, fetched on first use. */
async function loadDetector(): Promise<DetectorCtor> {
  const native = nativeDetector()
  if (native) return native
  const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([import("barcode-detector/ponyfill"), import("zxing-wasm/reader/zxing_reader.wasm?url")])
  setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) })
  return BarcodeDetector as unknown as DetectorCtor
}

export function ScanField({ label, placeholder = "Scan or type, then Enter", onScan, disabled, autoFocus = true, formats = ["code_128", "qr_code"], className }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [camera, setCamera] = useState(false)
  // Any browser that can open the camera (a secure page: https or localhost).
  const canUseCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

  // Scanners fire codes back to back: each one is queued and handled in order,
  // never dropped because the previous one is still being processed.
  const queue = useRef<string[]>([])
  const running = useRef(false)
  const drain = async () => {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      while (queue.current.length) {
        const next = queue.current.shift()!
        try {
          await onScan(next)
        } catch {
          // onScan reports its own errors; the next scan still runs.
        }
      }
    } finally {
      running.current = false
      setBusy(false)
      requestAnimationFrame(() => input.current?.focus())
    }
  }
  const submit = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    queue.current.push(trimmed)
    // Cleared now, so the next scan can be typed in while this one is handled.
    setValue("")
    void drain()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(value)
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <label htmlFor={id} className="mb-1.5 block text-body font-medium text-secondary">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          {busy ? <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="Processing scan" /> : null}
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
            className="h-12 w-full rounded-lg border border-strong bg-surface-container-lowest pr-3 pl-10 font-mono text-base text-primary placeholder:font-sans placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none disabled:opacity-50"
          />
        </div>
        <Button type="submit" size="lg" disabled={disabled}>
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
              submit(code)
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
    ;(async () => {
      try {
        const Ctor = await loadDetector()
        if (stopped) return
        const detector = new Ctor({ formats: formatKey.split(",") })
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
        const name = (e as Error).name
        setError(
          name === "NotAllowedError"
            ? "Camera access was refused. Allow it in the browser's site settings, or type the code."
            : name === "NotFoundError"
              ? "This device has no camera we can use. Type the code, or use a scanner."
              : "The camera couldn't be started. Type the code, or use a scanner."
        )
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
      {error ? <p className="text-body text-danger">{error}</p> : <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-lg bg-black object-cover" />}
      <Button variant="secondary" className="w-full" onClick={onCancel}>
        <X className="size-4" aria-hidden /> Cancel
      </Button>
    </div>
  )
}

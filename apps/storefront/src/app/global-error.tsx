"use client"

/** Last-resort boundary when the root layout itself fails; keeps to plain HTML. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f3ec", color: "#16171b", padding: "15vh 24px" }}>
        <main style={{ maxWidth: 560, margin: "0 auto" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2440d6" }}>Everwear</p>
          <h1 style={{ fontSize: 40, margin: "12px 0" }}>The store is having a problem.</h1>
          <p style={{ color: "#5e5c57" }}>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{ marginTop: 24, background: "#2440d6", color: "#fff", border: 0, padding: "12px 24px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}

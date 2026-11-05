/**
 * Material Symbols glyph for checkout's client components (same markup as
 * MIcon in @modules/stitch/shell, which is a server module).
 */
export function MIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

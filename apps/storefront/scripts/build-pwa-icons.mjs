import { createRequire } from "node:module"
import { mkdirSync, readFileSync } from "node:fs"
// Builds the PWA icons for the storefront and the operations portal from the
// brand mark. Run from the repo root: node apps/storefront/scripts/build-pwa-icons.mjs
const require = createRequire(new URL("../../../package.json", import.meta.url))
const sharp = require("sharp")
const root = new URL("../../", import.meta.url).pathname.replace(/\/$/, "")
const mark = readFileSync(`${root}/storefront/public/brand/favicon.svg`, "utf8").replace(/<title>.*?<\/title>/, "")
const VB = { w: 257.1, h: 310.02 }
async function icon(out, size, bg, fg, markHeight) {
  const svg = mark.replace(/currentColor/g, fg)
  // The SVG carries padding around the letters: trim it, then fit the letters in the box.
  const trimmed = await sharp(Buffer.from(svg), { density: 1200 }).trim().png().toBuffer()
  const box = Math.round(size * markHeight)
  const glyph = await sharp(trimmed).resize(box, box, { fit: "inside" }).png().toBuffer()
  const base = bg ? { r: parseInt(bg.slice(1, 3), 16), g: parseInt(bg.slice(3, 5), 16), b: parseInt(bg.slice(5, 7), 16), alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 }
  await sharp({ create: { width: size, height: size, channels: 4, background: base } }).composite([{ input: glyph, gravity: "center" }]).png({ compressionLevel: 9 }).toFile(out)
}
for (const [app, bg, fg] of [["storefront", "#F5F1E9", "#171717"], ["operations", "#4F46E5", "#FFFFFF"]]) {
  const dir = `${root}/${app}/public/icons`
  mkdirSync(dir, { recursive: true })
  await icon(`${dir}/icon-192.png`, 192, bg, fg, 0.62)
  await icon(`${dir}/icon-512.png`, 512, bg, fg, 0.62)
  // Maskable: launchers crop to a circle or squircle; keep the mark inside the 80% safe zone.
  await icon(`${dir}/maskable-192.png`, 192, bg, fg, 0.48)
  await icon(`${dir}/maskable-512.png`, 512, bg, fg, 0.48)
  await icon(`${dir}/apple-touch-icon.png`, 180, bg, fg, 0.58)
  // Notification badge: Android shows only the alpha channel.
  await icon(`${dir}/badge-96.png`, 96, null, "#FFFFFF", 0.78)
}
console.log("ok")

import { test as setup } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { code128Widths } from "../../src/areas/warehouse/lib/code128.ts"

/*
 * A fake rear camera for Chrome (--use-file-for-fake-video-capture): one
 * Y4M frame showing a Code 128 pick slip, drawn with the floor's own encoder.
 */
import { SLIP } from "./slip.ts"
const CAMERA_FILE = new URL("../../test-results/pwa-camera/slip.y4m", import.meta.url).pathname

setup("draw the pick slip the camera will see", () => {
  const W = 640
  const H = 480
  const module = 3
  const widths = code128Widths(SLIP)
  const total = widths.reduce((a, b) => a + b, 0) * module
  const y = Buffer.alloc(W * H, 235)
  let x = Math.round((W - total) / 2)
  widths.forEach((w, i) => {
    if (i % 2 === 0) for (let row = 140; row < 340; row++) y.fill(16, row * W + x, row * W + x + w * module)
    x += w * module
  })
  const chroma = Buffer.alloc((W / 2) * (H / 2), 128)
  mkdirSync(dirname(CAMERA_FILE), { recursive: true })
  writeFileSync(CAMERA_FILE, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\nFRAME\n`), y, chroma, chroma]))
})

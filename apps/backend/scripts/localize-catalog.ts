/**
 * Makes the catalog self-contained: downloads product images that still
 * point at outside hosts into UPLOADS_DIR/products and stores them as
 * `/uploads/products/<file>`, and renames the starter's "Medusa ..." titles
 * to "Everwear ...". Safe to re-run.
 *
 *   npm run catalog:localize
 */
import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { connect, disconnect } from "../src/db/client.js"
import { db } from "../src/db/schema.js"
import { env } from "../src/env.js"

const ALLOWED_TYPES = new Map([["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"]])
const isRemote = (u: string) => /^https?:\/\//.test(u)

async function download(url: string, dir: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const type = res.headers.get("content-type")?.split(";")[0] ?? ""
  const ext = ALLOWED_TYPES.get(type) ?? (ALLOWED_TYPES.has(`image/${extname(url).slice(1)}`) ? extname(url) : null)
  if (!ext) throw new Error(`${url}: unsupported content type ${type}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  // Content-addressed name: same file, same name; changed file, new name.
  const name = `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}${ext}`
  await writeFile(join(dir, name), bytes)
  return `/uploads/products/${name}`
}

try {
  await connect()
  const dir = join(env.UPLOADS_DIR, "products")
  await mkdir(dir, { recursive: true })

  const products = await db.products().find().toArray()
  const remote = new Set<string>()
  for (const p of products) {
    for (const u of [...p.images, ...(p.thumbnail ? [p.thumbnail] : []), ...p.variants.flatMap((v) => v.images ?? [])]) {
      if (isRemote(u)) remote.add(u)
    }
  }

  const local = new Map<string, string>()
  for (const url of remote) local.set(url, await download(url, dir))
  const swap = (u: string) => local.get(u) ?? u

  let renamed = 0
  for (const p of products) {
    const title = p.title.replace(/^Medusa\b/, "Everwear")
    if (title !== p.title) renamed++
    await db.products().updateOne(
      { _id: p._id },
      {
        $set: {
          title,
          images: p.images.map(swap),
          ...(p.thumbnail ? { thumbnail: swap(p.thumbnail) } : {}),
          variants: p.variants.map((v) => (v.images ? { ...v, images: v.images.map(swap) } : v)),
          updatedAt: new Date(),
        },
      }
    )
  }
  console.log(`Downloaded ${local.size} images to ${dir}; renamed ${renamed} products.`)
} finally {
  await disconnect()
}

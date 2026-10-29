import { randomBytes } from "node:crypto"

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"

/** Prefixed, URL-safe random id, e.g. `prod_8f3k2m9q7x1v4c6b`. */
export function newId(prefix: string, length = 16) {
  const bytes = randomBytes(length)
  let out = ""
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return `${prefix}_${out}`
}

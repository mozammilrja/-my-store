import assert from "node:assert/strict"
import { test } from "node:test"
import { code128Values, code128Widths, patterns } from "./code128.ts"

test("every symbol is 11 modules wide (the stop is 13)", () => {
  assert.equal(patterns.length, 107)
  patterns.forEach((p, i) => assert.equal([...p].reduce((s, d) => s + Number(d), 0), i === 106 ? 13 : 11, `symbol ${i}`))
  assert.equal(new Set(patterns).size, 107, "no two symbols share a pattern")
})

test("start B, data, mod-103 checksum, stop", () => {
  // 104 + 48*1 + 42*2 + 42*3 + 17*4 + 18*5 + 19*6 + 35*7 = 879; 879 mod 103 = 55.
  assert.deepEqual(code128Values("PJJ123C"), [104, 48, 42, 42, 17, 18, 19, 35, 55, 106])
})

test("widths alternate bar/space and end with the stop's bar", () => {
  const w = code128Widths("FUL-1042-1")
  assert.equal(w.length, (10 + 3) * 6 + 1)
  assert.equal(w.reduce((a, b) => a + b, 0), (10 + 3) * 11 + 2)
})

test("refuses what set B can't carry", () => {
  assert.throws(() => code128Values(""))
  assert.throws(() => code128Values("café"))
})

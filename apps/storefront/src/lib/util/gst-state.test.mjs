// Run: node --import tsx --test src/lib/util/gst-state.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { formatIndianPhone, resolveGstState, stateByName, stateByPin } from "./gst-state.ts"

test("a recognised province wins, with aliases", () => {
  assert.deepEqual(resolveGstState({ province: "Karnataka", city: "Mumbai" }), { name: "Karnataka", code: "29" })
  assert.equal(stateByName("Orissa")?.code, "21")
  assert.equal(stateByName("NCT of Delhi")?.code, "07")
  assert.equal(stateByName("pondicherry")?.name, "Puducherry")
  assert.equal(stateByName("Jammu & Kashmir")?.code, "01")
})

test("an unrecognised province falls back to the city", () => {
  // The user's test order: province "Gurgown", city "Gurgaon".
  assert.deepEqual(resolveGstState({ province: "Gurgown", city: "Gurgaon", postalCode: "555552" }), { name: "Haryana", code: "06" })
  assert.equal(resolveGstState({ city: "Navi Mumbai" })?.code, "27")
})

test("then the PIN code, only where it maps to one state", () => {
  assert.equal(resolveGstState({ city: "Somewhere", postalCode: "560001" })?.code, "29")
  assert.equal(stateByPin("122001")?.code, "06")
  assert.equal(stateByPin("403001")?.name, "Goa")
  assert.equal(stateByPin("160017"), null, "14-16 covers Punjab and Chandigarh: ambiguous")
  assert.equal(stateByPin("555552"), null, "not an Indian postal circle")
  assert.equal(resolveGstState({ city: "Nowhere", postalCode: "12" }), null)
})

test("non-Indian addresses get no GST state", () => {
  assert.equal(resolveGstState({ province: "Karnataka", countryCode: "us" }), null)
})

test("Indian phone numbers are grouped, others left alone", () => {
  assert.equal(formatIndianPhone("9994959595"), "+91 99949 59595")
  assert.equal(formatIndianPhone("+91-99949 59595"), "+91 99949 59595")
  assert.equal(formatIndianPhone("09994959595"), "+91 99949 59595")
  assert.equal(formatIndianPhone("+44 20 7946 0958"), "+44 20 7946 0958")
})

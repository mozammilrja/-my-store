/*
 * Runs the operations specs one area at a time, each against a fresh API
 * seeded with only that area's records (OPS_SEEDS), because each spec
 * checks exact counts in its own data. Extra arguments go to Playwright.
 *   node e2e/ops/run.mjs              every area
 *   node e2e/ops/run.mjs fleet        one area
 */
import { spawnSync } from "node:child_process"

const AREAS = { smoke: "", warehouses: "warehouses", fleet: "fleet", notifications: "notifications", marketplace: "marketplace", logistics: "logistics" }
const asked = process.argv.slice(2).filter((a) => !a.startsWith("-"))
const extra = process.argv.slice(2).filter((a) => a.startsWith("-"))
const areas = asked.length ? asked : Object.keys(AREAS)
const failed = []
for (const area of areas) {
  if (!(area in AREAS)) throw new Error(`Unknown area ${area}; one of ${Object.keys(AREAS).join(", ")}`)
  console.log(`\n=== ${area} ===`)
  const r = spawnSync("npx", ["playwright", "test", "-c", "playwright.ops.config.js", `e2e/ops/${area}.ops.js`, ...extra], {
    stdio: "inherit",
    env: { ...process.env, OPS_SEEDS: AREAS[area] || "none" },
  })
  if (r.status !== 0) failed.push(area)
}
if (failed.length) {
  console.error(`\nFailed: ${failed.join(", ")}`)
  process.exit(1)
}
console.log(`\nAll ${areas.length} areas passed.`)

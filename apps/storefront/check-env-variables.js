const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "EVERWEAR_API_URL",
    description: "Address of the Everwear API (apps/backend), e.g. http://localhost:9100",
  },
]

/** Stops `next dev/build/start` early with a clear message when settings are missing. */
function checkEnvVariables() {
  const missing = requiredEnvs.filter((env) => !process.env[env.key])
  if (missing.length === 0) return

  console.error(c.red.bold("\nError: missing required environment variables\n"))
  for (const env of missing) {
    console.error(c.yellow(`  ${c.bold(env.key)}`))
    if (env.description) console.error(c.dim(`    ${env.description}\n`))
  }
  console.error(c.yellow("\nSet them in apps/storefront/.env.local before starting the app.\n"))
  process.exit(1)
}

module.exports = checkEnvVariables

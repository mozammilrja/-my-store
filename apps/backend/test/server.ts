import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import type { Express } from "express"

/** Runs the app on a free port so tests can call it over real HTTP. */
export async function startTestServer(app: Express) {
  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()))
  const { port } = server.address() as AddressInfo
  return {
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init),
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  }
}

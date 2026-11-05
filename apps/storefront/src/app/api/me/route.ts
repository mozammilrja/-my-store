import { retrieveCustomer } from "@lib/data/account"
import { NextResponse } from "next/server"

/** Who is signed in, for the header account menu; null for a guest. */
export async function GET() {
  const customer = await retrieveCustomer().catch(() => null)
  return NextResponse.json({ customer }, { headers: { "cache-control": "private, no-store" } })
}

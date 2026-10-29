import { getProduct } from "@lib/data/catalog"
import { addToCart } from "@lib/data/shop"
import { getRequestOrigin } from "@lib/util/site"
import { NextRequest, NextResponse } from "next/server"

const MAX_QUANTITY = 10

/**
 * No-JavaScript add to bag: the product page form posts here. The chosen
 * option radios decide the variant; the hidden variant_id is the fallback.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const form = await request.formData()
  const origin = getRequestOrigin(request)
  const quantity = Math.min(Math.max(Number.parseInt(form.get("quantity")?.toString() ?? "1", 10) || 1, 1), MAX_QUANTITY)

  const chosen: Record<string, string> = {}
  form.forEach((value, key) => {
    const match = key.match(/^options\[(.+)\]$/)
    if (match?.[1]) chosen[match[1]] = value.toString()
  })

  let variantId = form.get("variant_id")?.toString() || undefined
  const handle = form.get("handle")?.toString()
  if (handle && Object.keys(chosen).length) {
    const product = await getProduct(handle, countryCode).catch(() => null)
    variantId = product?.variants.find((v) => Object.entries(chosen).every(([k, val]) => v.options[k] === val))?.id ?? variantId
  }
  if (!variantId) return NextResponse.redirect(`${origin}/${countryCode}/cart?error=add_failed`, 303)

  try {
    await addToCart({ variantId, quantity, countryCode })
  } catch {
    return NextResponse.redirect(`${origin}/${countryCode}/cart?error=add_failed`, 303)
  }
  return NextResponse.redirect(`${origin}/${countryCode}/cart`, 303)
}

import { getProduct } from "@lib/data/catalog"
import { renderProductMarkdown } from "@lib/util/product-markdown"
import { getRequestOrigin } from "@lib/util/site"

const HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
  Vary: "Accept",
}

/** Served for `<product-url>.md` and `Accept: text/markdown` via rewrites in next.config.js. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ countryCode: string; handle: string }> }
) {
  const { countryCode, handle } = await params
  const product = await getProduct(handle, countryCode).catch(() => null)

  if (!product) {
    return new Response("# Product not found\n", { status: 404, headers: HEADERS })
  }

  return new Response(
    renderProductMarkdown(product, `${getRequestOrigin(request)}/${countryCode}/products/${product.handle}`),
    { headers: HEADERS }
  )
}

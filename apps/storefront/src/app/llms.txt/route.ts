import { listCategories, listCollections, listRegions } from "@lib/data/catalog"
import { getDefaultCountryCode, getRequestOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"

/** A plain-text map of the store for AI assistants (llmstxt.org). */
export async function GET(request: Request) {
  const origin = getRequestOrigin(request)
  const [regions, categories, collections] = await Promise.all([listRegions(), listCategories(), listCollections()])
  const base = `${origin}/${getDefaultCountryCode(regions)}`
  const currencies = [...new Set(regions.map((r) => r.currency.toUpperCase()))]

  const body = `# ${STORE_NAME}

> Clothing and everyday essentials. Prices in ${currencies.join(", ")}; delivery to ${listCountryCodes(regions).map((c) => c.toUpperCase()).join(", ")}.

## Shop

- [All products](${base}/store)
${categories.filter((c) => !c.parentId).map((c) => `- [${c.name}](${base}/categories/${c.handle})`).join("\n")}

## Collections

${collections.map((c) => `- [${c.title}](${base}/collections/${c.handle})`).join("\n")}

## Product pages

Every product page is also available as Markdown: append \`.md\` to its URL, or send \`Accept: text/markdown\`.

## Help

- [Shipping](${base}/shipping)
- [Returns](${base}/returns)
- [Contact](${base}/contact)
`
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } })
}

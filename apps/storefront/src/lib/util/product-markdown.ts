import type { Product } from "@lib/api/types"
import { formatMoney } from "@lib/money"

/** Plain-text product page for AI agents and `Accept: text/markdown` clients. */
export function renderProductMarkdown(product: Product, productUrl: string) {
  const lines = [`# ${product.title}`, ""]
  if (product.subtitle) lines.push(product.subtitle, "")
  if (product.description) lines.push(product.description, "")
  if (product.priceRange) {
    const { min, max } = product.priceRange
    lines.push(`Price: ${min === max ? formatMoney(min, product.currency) : `${formatMoney(min, product.currency)} to ${formatMoney(max, product.currency)}`}`, "")
  }
  if (product.options.length) {
    lines.push("## Options", "")
    for (const o of product.options) lines.push(`- ${o.title}: ${o.values.join(", ")}`)
    lines.push("")
  }
  lines.push("## Variants", "", "| Variant | Price | Available |", "| --- | --- | --- |")
  for (const v of product.variants) {
    lines.push(`| ${v.title} | ${v.price === null ? "n/a" : formatMoney(v.price, product.currency)} | ${v.inStock ? "Yes" : "No"} |`)
  }
  lines.push("", `Product page: ${productUrl}`)
  return lines.join("\n")
}

import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import { listCategories, listCollections, listRegions } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { RegionSelect } from "./region-select"

const help = [
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Your account" },
]

const legal = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
]

function Column({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
}) {
  if (links.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <LocalizedClientLink href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function Footer() {
  const [regions, categories, collections] = await Promise.all([
    listRegions().catch(() => []),
    listCategories().catch(() => []),
    listCollections().catch(() => []),
  ])

  return (
    <footer className="mt-24 bg-invert text-invert-foreground [--border:#2a2a2c] [--foreground:#ffffff] [--input:#3a3a3c] [--muted-foreground:#a3a3a3]">
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Wordmark className="text-5xl" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Clothing and everyday essentials, chosen with care.
          </p>
          <RegionSelect regions={regions} id="footer-region-select" />
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
          <Column
            title="Shop"
            links={[
              { href: "/store", label: "Shop all" },
              ...categories
                .filter((c) => !c.parentId)
                .map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
            ]}
          />
          <Column
            title="Collections"
            links={collections.map((c) => ({ href: `/collections/${c.handle}`, label: c.title }))}
          />
          <Column title="Help" links={help} />
          <Column title="Legal" links={legal} />
        </div>
      </Container>
      <Container className="flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>&copy; {new Date().getFullYear()} Everwear. All rights reserved.</span>
        <span>Prices are shown in your region&apos;s currency.</span>
      </Container>
    </footer>
  )
}

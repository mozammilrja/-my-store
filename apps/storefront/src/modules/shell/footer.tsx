import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import { listRegions } from "@lib/data/regions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { LanguageSelect } from "./language-select"
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
            <LocalizedClientLink href={link.href} className="hover:text-primary">
              {link.label}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function Footer() {
  const [regions, categories, { collections }, locales, currentLocale] = await Promise.all([
    listRegions().catch(() => []),
    listCategories({ fields: "id,name,handle,parent_category_id" }).catch(() => []),
    listCollections({ fields: "id,handle,title" }).catch(() => ({ collections: [], count: 0 })),
    listLocales().catch(() => null),
    getLocale().catch(() => null),
  ])

  return (
    <footer className="mt-24 border-t bg-card">
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Wordmark className="text-3xl" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Clothing and everyday essentials, chosen with care.
          </p>
          <RegionSelect regions={regions} id="footer-region-select" />
          {locales && locales.length > 1 && <LanguageSelect locales={locales} current={currentLocale} />}
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
          <Column
            title="Shop"
            links={[
              { href: "/store", label: "Shop all" },
              ...categories
                .filter((c) => !c.parent_category_id)
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

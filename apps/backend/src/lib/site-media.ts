import { db } from "../db/schema.js"

/**
 * Every storefront image that isn't a product or category photo: the home
 * banner and category panel, the women's edit, concierge imagery, the
 * default avatar. Only images the storefront actually renders are listed.
 *
 * The key is the image's original path under the storefront's /images/, so
 * one upload replaces that picture everywhere it appears (the home panel,
 * the wardrobe strip and the women landing share four). Each slot is seeded pointing at the file the
 * storefront ships with; replacing it in the admin stores an /uploads/ path.
 */
export type SiteMediaSlot = { key: string; label: string; group: string; usedOn: string[] }

const slot = (key: string, label: string, group: string, ...usedOn: string[]): SiteMediaSlot => ({ key, label, group, usedOn })

export const SITE_MEDIA_SLOTS: SiteMediaSlot[] = [
  slot("editorial/hero-editorial.jpg", "Welcome banner", "Home", "Home welcome banner", "Home category panel: Contemporary RTW feature"),
  slot("women/monsoon-capsule.jpg", "Women's Atelier feature", "Home category panel", "Home category panel: Women's Atelier", "Women landing banner"),
  slot("men/hero.jpg", "Men's Wardrobe feature", "Home category panel", "Home category panel: Men's Wardrobe"),
  slot("men/atelier-2-jaipur.jpg", "Ethnic & Heritage feature", "Home category panel", "Home category panel: Ethnic & Heritage"),
  slot("men/subcat-1-linen-shirts.jpg", "Linen & Overshirts", "Home category panel", "Home category panel: Men's Wardrobe"),
  slot("men/subcat-3-trousers.jpg", "Trousers & Selvedge Denim", "Home category panel", "Home category panel: Men's Wardrobe"),
  slot("men/subcat-4-kurtas.jpg", "Festive Kurtas & Bundis", "Home category panel", "Home category panel: Men's Wardrobe"),
  slot("men/subcat-5-loafers.jpg", "Loafers & Leather Accessories", "Home category panel", "Home category panel: Men's Wardrobe"),
  slot("editorial/cat-kurta.jpg", "Festive Co-ord & Anarkalis", "Home category panel", "Home category panel: Ethnic & Heritage"),
  slot("editorial/cat-pants.jpg", "Silk Tops & Trousers", "Home category panel", "Home category panel: Contemporary RTW"),
  slot("editorial/cat-accessories.jpg", "Minimalist Leather Bags", "Home category panel", "Home category panel: Contemporary RTW"),
  slot("editorial/cat-sweatshirts.jpg", "Cashmere & Fine Gauge Knits", "Home category panel", "Home category panel: Contemporary RTW"),
  slot("women/product-1-sculpted-linen-blazer.jpg", "Sculpted linen blazer", "Women's edit", "Home category panel", "Modern heritage wardrobe", "Women landing"),
  slot("women/product-2-emerald-zari-kurta.jpg", "Emerald zari kurta", "Women's edit", "Home category panel", "Modern heritage wardrobe", "Women landing"),
  slot("women/product-3-woven-kolhapuri-mule.jpg", "Woven Kolhapuri mule", "Women's edit", "Home category panel", "Modern heritage wardrobe", "Women landing"),
  slot("women/product-4-baroque-tourmaline-choker.jpg", "Baroque tourmaline choker", "Women's edit", "Home category panel", "Modern heritage wardrobe", "Women landing"),
  slot("concierge/hero-salon.jpg", "Concierge salon", "Concierge", "Concierge page hero", "Sign-in page"),
  slot("concierge/suite-virtual.jpg", "Service: virtual styling", "Concierge", "Concierge booking"),
  slot("concierge/suite-home.jpg", "Service: at-home styling", "Concierge", "Concierge booking"),
  slot("concierge/suite-flagship.jpg", "Service: flagship appointment", "Concierge", "Concierge booking"),
  slot("concierge/stylist-curation.jpg", "Stylist: curation", "Concierge", "Concierge stylists"),
  slot("concierge/stylist-menswear.jpg", "Stylist: menswear", "Concierge", "Concierge stylists"),
  slot("concierge/stylist-accessories.jpg", "Stylist: accessories", "Concierge", "Concierge stylists"),
  slot("default-avatar.svg", "Default profile picture", "Account", "Account sidebar", "Profile page"),
]

export const defaultMediaUrl = (key: string) => `/images/${key}`

/**
 * Makes sure every slot has a record. Safe to run on each start: existing
 * choices are kept, and only the descriptive fields follow the code.
 */
export async function ensureSiteMedia() {
  const now = new Date()
  await db.siteMedia().deleteMany({ _id: { $nin: SITE_MEDIA_SLOTS.map((s) => s.key) } })
  await db.siteMedia().bulkWrite(
    SITE_MEDIA_SLOTS.map((s, order) => ({
      updateOne: {
        filter: { _id: s.key },
        update: {
          $set: { label: s.label, group: s.group, usedOn: s.usedOn, order },
          $setOnInsert: { url: defaultMediaUrl(s.key), createdAt: now, updatedAt: now },
        },
        upsert: true,
      },
    }))
  )
}

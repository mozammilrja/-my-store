import { connect, disconnect } from "../src/db/client.js"
import { db, ensureIndexes, type ProductDoc, type VariantDoc } from "../src/db/schema.js"
import { newId } from "../src/lib/ids.js"

interface CategorySeed {
  handle: string
  name: string
  description: string
  rank: number
}

const CATEGORIES: CategorySeed[] = [
  { handle: "men", name: "Men", description: "Contemporary masculine tailoring, structured blazers, linen shirts, and heirloom essentials.", rank: 0 },
  { handle: "women", name: "Women", description: "Heirloom weaves, fine Chanderi, contemporary silhouettes, and sculpted tailoring.", rank: 1 },
  { handle: "kids", name: "Kids", description: "Playful everyday staples crafted in soft breathable organic cotton.", rank: 2 },
  { handle: "home", name: "Home & Living", description: "Artisanal home decor, handcrafted ceramics, and fine linen accents.", rank: 3 },
  { handle: "beauty", name: "Beauty & Personal Care", description: "Laboratory tested botanicals, cold-pressed seed oils, and restorative clean formulations.", rank: 4 },
  { handle: "footwear", name: "Footwear", description: "Handcrafted loafers, minimalist leather sneakers, and artisan block mules.", rank: 5 },
  { handle: "accessories", name: "Accessories", description: "Full-grain leather holdalls, handcrafted belts, and titanium eyewear.", rank: 6 },
  { handle: "sports", name: "Sports & Activewear", description: "Technical performance garments and breathable activewear.", rank: 7 },
  { handle: "jewellery", name: "Jewellery", description: "925 sterling silver cuffs, baroque pearls, and tourmaline jewelry.", rank: 8 },
  { handle: "shirts", name: "Shirts", description: "Refined oxfords, breezy linen shirts, and versatile overshirts.", rank: 9 },
  { handle: "sweatshirts", name: "Sweatshirts", description: "Heavyweight organic cotton fleece hoodies and crewneck sweatshirts.", rank: 10 },
  { handle: "pants", name: "Pants", description: "Tailored trousers, relaxed linen shorts, and comfortable joggers.", rank: 11 },
  { handle: "t-shirts", name: "T-Shirts", description: "Heavyweight organic tees, relaxed supima cotton tops, and waffle knit polo shirts.", rank: 12 },
  { handle: "tshirts", name: "T-Shirts", description: "Heavyweight organic tees, relaxed supima cotton tops, and waffle knit polo shirts.", rank: 12 },
  { handle: "merch", name: "Merch", description: "Everwear caps, organic cotton totes, and branded artifacts.", rank: 13 },
]

async function seed() {
  await connect()
  await ensureIndexes()
  const now = new Date()

  console.log("Upserting categories...")
  const catMap: Record<string, string> = {}
  for (const cat of CATEGORIES) {
    const existing = await db.categories().findOne({ handle: cat.handle })
    if (existing) {
      catMap[cat.handle] = existing._id
      await db.categories().updateOne(
        { _id: existing._id },
        { $set: { name: cat.name, description: cat.description, rank: cat.rank, updatedAt: now } }
      )
    } else {
      const _id = newId("category")
      catMap[cat.handle] = _id
      await db.categories().insertOne({
        _id,
        handle: cat.handle,
        name: cat.name,
        description: cat.description,
        parentId: null,
        rank: cat.rank,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  console.log("Seeding Stitch featured products...")
  const stitchProducts = [
    {
      handle: "sculpted-linen-boyfriend-blazer",
      title: "Sculpted Linen Boyfriend Blazer",
      subtitle: "Ecru Raw Flax / Single-breasted horn buttons",
      brand: "Everwear Atelier",
      description: "Ecru Raw Flax. Single-breasted horn buttons with a modern architectural silhouette. Includes complimentary bespoke alterations.",
      status: "published" as const,
      thumbnail: "/images/women/linen-blazer/01-hero.jpg",
      images: [
        "/images/women/linen-blazer/01-hero.jpg",
        "/images/women/linen-blazer/02-detail.jpg",
        "/images/women/linen-blazer/03-angle.jpg",
        "/images/women/linen-blazer/04-close.jpg",
      ],
      categoryHandles: ["women", "shirts"],
      tags: ["new-arrival", "bestseller", "tailoring", "linen"],
      priceInr: 549000,
      compareAtPriceInr: 749000,
      priceEur: 6500,
      compareAtPriceEur: 8900,
      priceUsd: 7500,
      compareAtPriceUsd: 9900,
      reviews: [
        { customerName: "Ananya S.", rating: 5, title: "Architectural perfection", comment: "The cut of this blazer is stunning. Beautiful linen texture." },
        { customerName: "Priya M.", rating: 4, title: "Great tailored fit", comment: "Slightly oversized boyfriend cut, exactly as photographed." },
      ],
    },
    {
      handle: "emerald-zari-chanderi-kurta-set",
      title: "Emerald Zari Chanderi Kurta Set",
      subtitle: "3-piece ensemble with Scalloped Organza Dupatta",
      brand: "Heritage Loom",
      description: "3-piece ensemble featuring handspun Chanderi silk with delicate gold zari borders, paired with a scalloped organza dupatta.",
      status: "published" as const,
      thumbnail: "/images/women/emerald-kurta/01-hero.jpg",
      images: [
        "/images/women/emerald-kurta/01-hero.jpg",
        "/images/women/emerald-kurta/02-detail.jpg",
        "/images/women/emerald-kurta/03-angle.jpg",
        "/images/women/emerald-kurta/04-close.jpg",
      ],
      categoryHandles: ["women"],
      tags: ["festive", "ethnic", "silk", "handloom", "new-arrival"],
      priceInr: 899000,
      compareAtPriceInr: 1199000,
      priceEur: 9900,
      compareAtPriceEur: 13900,
      priceUsd: 11500,
      compareAtPriceUsd: 15500,
      reviews: [
        { customerName: "Meera D.", rating: 5, title: "Gorgeous Festive Set", comment: "The gold zari borders on Chanderi silk feel opulent and weightless." },
        { customerName: "Ishita R.", rating: 5, title: "Heirloom Quality", comment: "The scalloped organza dupatta completes this look wonderfully." },
      ],
    },
    {
      handle: "woven-kolhapuri-block-mule",
      title: "Woven Kolhapuri Block Mule",
      subtitle: "Full Grain Saddle Leather / 45mm Block Heel",
      brand: "Aurum Footwear",
      description: "Full grain saddle leather handcrafted by master cobblers. Features a comfortable 45mm stacked block heel and woven upper.",
      status: "published" as const,
      thumbnail: "/images/women/kolhapuri-mule/01-hero.jpg",
      images: [
        "/images/women/kolhapuri-mule/01-hero.jpg",
        "/images/women/kolhapuri-mule/02-detail.jpg",
        "/images/women/kolhapuri-mule/03-angle.jpg",
        "/images/women/kolhapuri-mule/04-close.jpg",
        "/images/women/kolhapuri-mule/05-pair.jpg",
        "/images/women/kolhapuri-mule/06-texture.jpg",
      ],
      categoryHandles: ["women", "footwear"],
      tags: ["footwear", "leather", "handmade"],
      priceInr: 385000,
      compareAtPriceInr: 499000,
      priceEur: 4500,
      compareAtPriceEur: 5900,
      priceUsd: 5000,
      compareAtPriceUsd: 6500,
      reviews: [
        { customerName: "Diya K.", rating: 4, title: "Very comfortable block heel", comment: "Wore these all evening with zero break-in discomfort. 10/10." },
      ],
    },
    {
      handle: "baroque-tourmaline-silver-choker",
      title: "Baroque Tourmaline Silver Choker",
      subtitle: "925 Sterling Silver / Hand-beaten filigree",
      brand: "Atelier Silvercraft",
      description: "925 Sterling Silver hand-beaten filigree choker set with natural raw baroque tourmaline gemstones. Certified authentic hallmark.",
      status: "published" as const,
      thumbnail: "/images/women/tourmaline-choker/01-hero.jpg",
      images: [
        "/images/women/tourmaline-choker/01-hero.jpg",
        "/images/women/tourmaline-choker/02-detail.jpg",
        "/images/women/tourmaline-choker/03-angle.jpg",
        "/images/women/tourmaline-choker/04-close.jpg",
      ],
      categoryHandles: ["women", "jewellery", "accessories"],
      tags: ["jewellery", "silver", "limited-edition"],
      priceInr: 720000,
      compareAtPriceInr: 899000,
      priceEur: 8000,
      compareAtPriceEur: 9900,
      priceUsd: 9000,
      compareAtPriceUsd: 11000,
      reviews: [
        { customerName: "Tara N.", rating: 5, title: "True Wearable Art", comment: "Hand-beaten sterling silver filigree with genuine raw tourmaline." },
      ],
    },
    {
      handle: "normandy-pure-linen-resort-shirt",
      title: "Normandy Pure Linen Resort Shirt",
      subtitle: "French Flax Linen / Camp collar / Mother of pearl buttons",
      brand: "Everwear Atelier",
      description: "Crafted from Normandy-harvested pure flax linen with airy breathability and a relaxed camp collar silhouette.",
      status: "published" as const,
      thumbnail: "/images/men/product-1-linen-shirt.jpg",
      images: [
        "/images/men/product-1-linen-shirt.jpg",
        "/images/men/subcat-1-linen-shirts.jpg",
        "/images/men/product-6-blazer.jpg",
      ],
      categoryHandles: ["men", "shirts"],
      tags: ["bestseller", "linen", "summer", "new-arrival"],
      priceInr: 249000,
      compareAtPriceInr: 349000,
      priceEur: 3200,
      compareAtPriceEur: 4500,
      priceUsd: 3500,
      compareAtPriceUsd: 4900,
      reviews: [
        { customerName: "Aarav S.", rating: 5, title: "Best summer shirt", comment: "Airy, soft, drape is effortless. Wore it throughout Goa." },
        { customerName: "Vikram R.", rating: 4, title: "Quality linen", comment: "Genuine breathable flax linen that gets softer with every wash." },
      ],
    },
    {
      handle: "double-pleated-wool-blend-trouser",
      title: "Double-Pleated Wool Blend Trouser",
      subtitle: "Italian Wool Drape / Relaxed tapered leg / Internal curtain waistband",
      brand: "Studio Craft",
      description: "Fine double-pleated sartorial trousers featuring an Italian tropical wool blend with fluid drape and clean front creases.",
      status: "published" as const,
      thumbnail: "/images/men/product-2-wool-trouser.jpg",
      images: [
        "/images/men/product-2-wool-trouser.jpg",
        "/images/men/subcat-3-trousers.jpg",
      ],
      categoryHandles: ["men", "pants"],
      tags: ["tailoring", "bestseller", "formal"],
      priceInr: 289000,
      compareAtPriceInr: 399000,
      priceEur: 3600,
      compareAtPriceEur: 4900,
      priceUsd: 4200,
      compareAtPriceUsd: 5500,
      reviews: [
        { customerName: "Karan M.", rating: 5, title: "Sharply tailored", comment: "The double pleat drape sits perfectly over loafers." },
      ],
    },
    {
      handle: "boxy-heavyweight-organic-tee",
      title: "Boxy Heavyweight Organic Tee",
      subtitle: "280 GSM Combed Cotton / Drop shoulder / Ribbed collar",
      brand: "Everwear Studio",
      description: "Substantial 280 GSM heavyweight organic cotton tee cut with dropped shoulders, wide sleeves, and a structured ribbed collar.",
      status: "published" as const,
      thumbnail: "/images/men/product-3-boxy-tee.jpg",
      images: [
        "/images/men/product-3-boxy-tee.jpg",
        "/images/editorial/promo-tee.jpg",
        "/images/men/subcat-2-casual-tees.jpg",
        "/images/men/product-8-waffle-polo.jpg",
      ],
      categoryHandles: ["men", "t-shirts", "tshirts"],
      tags: ["tshirt", "casual", "heavyweight", "bestseller", "new-arrival"],
      priceInr: 149000,
      compareAtPriceInr: 249000,
      priceEur: 1900,
      compareAtPriceEur: 3200,
      priceUsd: 2200,
      compareAtPriceUsd: 3500,
      reviews: [
        { customerName: "Rohan P.", rating: 5, title: "Substantial 280 GSM weight", comment: "Holds its boxy shape wash after wash. Doesn't cling." },
        { customerName: "Arjun N.", rating: 4, title: "Clean minimalist silhouette", comment: "Best daily tee in this price bracket." },
      ],
    },
    {
      handle: "waffle-knit-resort-polo-tee",
      title: "Waffle Knit Resort Polo Tee",
      subtitle: "Textured Honeycomb Cotton / Johnny collar / Vintage wash",
      brand: "Everwear Atelier",
      description: "Breathable honeycomb waffle knit polo tee with an open Johnny collar and ribbed micro-cuffs.",
      status: "published" as const,
      thumbnail: "/images/men/product-8-waffle-polo.jpg",
      images: [
        "/images/men/product-8-waffle-polo.jpg",
        "/images/men/product-3-boxy-tee.jpg",
        "/images/men/product-1-linen-shirt.jpg",
      ],
      categoryHandles: ["men", "t-shirts", "tshirts", "shirts"],
      tags: ["tshirt", "polo", "knitwear", "summer"],
      priceInr: 189000,
      compareAtPriceInr: 299000,
      priceEur: 2400,
      compareAtPriceEur: 3800,
      priceUsd: 2800,
      compareAtPriceUsd: 4200,
      reviews: [
        { customerName: "Siddharth V.", rating: 5, title: "Unreal texture", comment: "The honeycomb waffle knit is breathable and looks elevated." },
      ],
    },
    {
      handle: "artisanal-mandarin-linen-kurta",
      title: "Artisanal Mandarin Linen Kurta",
      subtitle: "Pure Handloom Linen / Concealed placket / Side pockets",
      brand: "Heritage Loom",
      description: "Clean contemporary silhouette featuring pure handloom linen, bandhgala mandarin collar, and hidden mother-of-pearl buttons.",
      status: "published" as const,
      thumbnail: "/images/men/product-4-mandarin-kurta.jpg",
      images: [
        "/images/men/product-4-mandarin-kurta.jpg",
        "/images/men/subcat-4-kurtas.jpg",
      ],
      categoryHandles: ["men"],
      tags: ["ethnic", "kurta", "linen", "festive"],
      priceInr: 329000,
      compareAtPriceInr: 449000,
      priceEur: 4200,
      compareAtPriceEur: 5500,
      priceUsd: 4800,
      compareAtPriceUsd: 6200,
      reviews: [
        { customerName: "Aditya G.", rating: 5, title: "Graceful elegance", comment: "Comfortable organic handloom linen with a clean bandhgala collar." },
      ],
    },
    {
      handle: "handcrafted-suede-penny-loafer",
      title: "Handcrafted Suede Penny Loafer",
      subtitle: "Calfskin Suede / Blake stitched / Stacked leather heel",
      brand: "Aurum Footwear",
      description: "Artisan calfskin suede penny loafers built with traditional Blake stitch construction and cushioned arch support.",
      status: "published" as const,
      thumbnail: "/images/men/product-5-suede-loafer.jpg",
      images: [
        "/images/men/product-5-suede-loafer.jpg",
        "/images/men/subcat-5-loafers.jpg",
      ],
      categoryHandles: ["men", "footwear"],
      tags: ["footwear", "shoes", "leather", "handmade"],
      priceInr: 449000,
      compareAtPriceInr: 599000,
      priceEur: 5800,
      compareAtPriceEur: 7500,
      priceUsd: 6500,
      compareAtPriceUsd: 8500,
      reviews: [
        { customerName: "Nikhil K.", rating: 4, title: "Incredibly soft suede", comment: "Blake stitched sole and cushioned arch support make this comfortable all day." },
      ],
    },
    {
      handle: "relaxed-supima-crewneck-tee",
      title: "Relaxed Supima Crewneck Tee",
      subtitle: "Long-staple American Supima Cotton / Mercerised finish / Micro-rib neckline",
      brand: "Everwear Studio",
      description: "Ultra-fine American Supima cotton tee with a liquid-soft hand feel, mercerised luster, and relaxed boxy cut.",
      status: "published" as const,
      thumbnail: "/images/editorial/promo-tee.jpg",
      images: [
        "/images/editorial/promo-tee.jpg",
        "/images/women/linen-blazer/01-hero.jpg",
        "/images/women/linen-blazer/02-detail.jpg",
      ],
      categoryHandles: ["women", "t-shirts", "tshirts"],
      tags: ["tshirt", "cotton", "essentials", "new-arrival"],
      priceInr: 129000,
      compareAtPriceInr: 199000,
      priceEur: 1600,
      compareAtPriceEur: 2600,
      priceUsd: 1900,
      compareAtPriceUsd: 2900,
      reviews: [
        { customerName: "Shreya T.", rating: 5, title: "Silky soft feel", comment: "Mercerised Supima cotton feels like silk. Doesn't lose shape in the wash." },
      ],
    },
    {
      handle: "heavyweight-fleece-hooded-sweatshirt",
      title: "Heavyweight Fleece Hooded Sweatshirt",
      subtitle: "450 GSM French Terry / Double-layered hood / Nickel eyelets",
      brand: "Everwear Studio",
      description: "Dense 450 GSM custom-milled French terry fleece with ribbed side gussets and a double-walled crossover hood.",
      status: "published" as const,
      thumbnail: "/images/editorial/promo-hoodie.jpg",
      images: [
        "/images/editorial/promo-hoodie.jpg",
        "/images/editorial/cat-sweatshirts.jpg",
      ],
      categoryHandles: ["men", "sweatshirts"],
      tags: ["sweatshirt", "hoodie", "winter", "casual"],
      priceInr: 279000,
      compareAtPriceInr: 399000,
      priceEur: 3500,
      compareAtPriceEur: 4900,
      priceUsd: 3900,
      compareAtPriceUsd: 5500,
      reviews: [
        { customerName: "Kabir S.", rating: 5, title: "Dense, cozy fleece", comment: "True 450 GSM weight. The hood stands structured." },
      ],
    },
  ]

  for (const sp of stitchProducts) {
    const existing = await db.products().findOne({ handle: sp.handle })
    const categoryIds = sp.categoryHandles.map((h) => catMap[h]).filter((id): id is string => Boolean(id))
    const sizes = ["S", "M", "L", "XL"]
    const variants: VariantDoc[] = sizes.map((sz, idx) => ({
      _id: `variant_${sp.handle.replace(/-/g, "").substring(0, 8)}_${sz.toLowerCase()}_${idx}`,
      sku: `${sp.handle.toUpperCase().substring(0, 10)}-${sz}`,
      title: sz,
      options: { Size: sz },
      prices: { inr: sp.priceInr, eur: sp.priceEur, usd: sp.priceUsd },
      compareAtPrices: sp.compareAtPriceInr
        ? { inr: sp.compareAtPriceInr, eur: sp.compareAtPriceEur, usd: sp.compareAtPriceUsd }
        : undefined,
      manageInventory: true,
      allowBackorder: false,
      stock: 50,
    }))

    const doc: Omit<ProductDoc, "_id" | "createdAt"> = {
      handle: sp.handle,
      title: sp.title,
      subtitle: sp.subtitle,
      brand: sp.brand,
      description: sp.description,
      status: sp.status,
      thumbnail: sp.thumbnail,
      images: sp.images,
      categoryIds,
      collectionId: null,
      tags: sp.tags,
      options: [{ title: "Size", values: sizes }],
      variants,
      weight: 500,
      updatedAt: now,
    }

    let productId: string
    if (existing) {
      productId = existing._id
      await db.products().updateOne({ _id: existing._id }, { $set: doc })
    } else {
      productId = newId("product")
      await db.products().insertOne({
        _id: productId,
        ...doc,
        createdAt: now,
      })
    }

    if (sp.reviews?.length) {
      for (const rev of sp.reviews) {
        const revExists = await db.productReviews().findOne({
          productId,
          customerName: rev.customerName,
        })
        if (!revExists) {
          await db.productReviews().insertOne({
            _id: newId("rev"),
            productId,
            customerId: "seed_customer_demo",
            customerName: rev.customerName,
            rating: rev.rating,
            title: rev.title,
            comment: rev.comment,
            verifiedPurchase: true,
            status: "approved",
            createdAt: now,
          })
        }
      }
    }
  }

  // Also distribute some demo products into men, kids, sports, accessories, beauty
  console.log("Distributing categories across demo products...")
  const allProds = await db.products().find({}).toArray()
  for (let i = 0; i < allProds.length; i++) {
    const p = allProds[i]
    if (!p) continue
    if (stitchProducts.some((sp) => sp.handle === p.handle)) continue

    const currentCatIds = p.categoryIds || []
    const newCatIds = new Set<string>(currentCatIds)

    // Evenly map items to departments
    if (i % 2 === 0 && catMap["men"]) newCatIds.add(catMap["men"])
    if (i % 3 === 0 && catMap["women"]) newCatIds.add(catMap["women"])
    if (i % 5 === 0 && catMap["sports"]) newCatIds.add(catMap["sports"])
    if (i % 7 === 0 && catMap["accessories"]) newCatIds.add(catMap["accessories"])
    if (i % 9 === 0 && catMap["kids"]) newCatIds.add(catMap["kids"])
    if (i % 11 === 0 && catMap["beauty"]) newCatIds.add(catMap["beauty"])
    if (i % 13 === 0 && catMap["home"]) newCatIds.add(catMap["home"])

    await db.products().updateOne(
      { _id: p._id },
      { $set: { categoryIds: Array.from(newCatIds) } }
    )
  }

  console.log("Categories and products successfully synced in MongoDB!")
}

try {
  await seed()
} catch (err) {
  console.error("Seeding failed:", err)
  process.exit(1)
} finally {
  await disconnect()
}

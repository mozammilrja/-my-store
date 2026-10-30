import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/everwear"

const CATEGORIES = [
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
  { handle: "merch", name: "Merch", description: "Everwear caps, organic cotton totes, and branded artifacts.", rank: 12 },
]

async function seed() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  console.log("Upserting categories...")
  const catMap = {}
  for (const cat of CATEGORIES) {
    const existing = await db.collection("categories").findOne({ handle: cat.handle })
    if (existing) {
      catMap[cat.handle] = existing._id
      await db.collection("categories").updateOne(
        { _id: existing._id },
        { $set: { name: cat.name, description: cat.description, rank: cat.rank, updatedAt: new Date() } }
      )
    } else {
      const _id = `pcat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      catMap[cat.handle] = _id
      await db.collection("categories").insertOne({
        _id,
        handle: cat.handle,
        name: cat.name,
        description: cat.description,
        parentId: null,
        rank: cat.rank,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  console.log("Seeding Stitch featured products...")
  const stitchProducts = [
    {
      handle: "sculpted-linen-boyfriend-blazer",
      title: "Sculpted Linen Boyfriend Blazer",
      subtitle: "Ecru Raw Flax / Single-breasted horn buttons",
      description: "Ecru Raw Flax. Single-breasted horn buttons with a modern architectural silhouette. Includes complimentary bespoke alterations.",
      status: "published",
      thumbnail: "/images/women/product-1-sculpted-linen-blazer.jpg",
      images: [
        "/images/women/product-1-sculpted-linen-blazer.jpg",
        "/images/women/monsoon-capsule.jpg",
      ],
      categoryHandles: ["women", "shirts"],
      tags: ["new-arrival", "bestseller", "tailoring", "linen"],
      priceInr: 549000,
      priceEur: 6500,
      priceUsd: 7500,
    },
    {
      handle: "emerald-zari-chanderi-kurta-set",
      title: "Emerald Zari Chanderi Kurta Set",
      subtitle: "3-piece ensemble with Scalloped Organza Dupatta",
      description: "3-piece ensemble featuring handspun Chanderi silk with delicate gold zari borders, paired with a scalloped organza dupatta.",
      status: "published",
      thumbnail: "/images/women/product-2-emerald-zari-kurta.jpg",
      images: [
        "/images/women/product-2-emerald-zari-kurta.jpg",
        "/images/women/monsoon-capsule.jpg",
      ],
      categoryHandles: ["women"],
      tags: ["festive", "ethnic", "silk", "handloom", "new-arrival"],
      priceInr: 899000,
      priceEur: 9900,
      priceUsd: 11500,
    },
    {
      handle: "woven-kolhapuri-block-mule",
      title: "Woven Kolhapuri Block Mule",
      subtitle: "Full Grain Saddle Leather / 45mm Block Heel",
      description: "Full grain saddle leather handcrafted by master cobblers. Features a comfortable 45mm stacked block heel and woven upper.",
      status: "published",
      thumbnail: "/images/women/product-3-woven-kolhapuri-mule.jpg",
      images: ["/images/women/product-3-woven-kolhapuri-mule.jpg"],
      categoryHandles: ["women", "footwear"],
      tags: ["footwear", "leather", "handmade"],
      priceInr: 385000,
      priceEur: 4500,
      priceUsd: 5000,
    },
    {
      handle: "baroque-tourmaline-silver-choker",
      title: "Baroque Tourmaline Silver Choker",
      subtitle: "925 Sterling Silver / Hand-beaten filigree",
      description: "925 Sterling Silver hand-beaten filigree choker set with natural raw baroque tourmaline gemstones. Certified authentic hallmark.",
      status: "published",
      thumbnail: "/images/women/product-4-baroque-tourmaline-choker.jpg",
      images: ["/images/women/product-4-baroque-tourmaline-choker.jpg"],
      categoryHandles: ["women", "jewellery", "accessories"],
      tags: ["jewellery", "silver", "limited-edition"],
      priceInr: 720000,
      priceEur: 8000,
      priceUsd: 9000,
    },
  ]

  for (const sp of stitchProducts) {
    const existing = await db.collection("products").findOne({ handle: sp.handle })
    const categoryIds = sp.categoryHandles.map((h) => catMap[h]).filter(Boolean)
    const sizes = ["S", "M", "L", "XL"]
    const variants = sizes.map((sz, idx) => ({
      _id: `variant_${sp.handle.replace(/-/g, "").substring(0, 8)}_${sz.toLowerCase()}_${idx}`,
      sku: `${sp.handle.toUpperCase().substring(0, 10)}-${sz}`,
      title: sz,
      options: { Size: sz },
      prices: { inr: sp.priceInr, eur: sp.priceEur, usd: sp.priceUsd },
      manageInventory: true,
      allowBackorder: false,
      stock: 50,
    }))

    const doc = {
      handle: sp.handle,
      title: sp.title,
      subtitle: sp.subtitle,
      description: sp.description,
      status: "published",
      thumbnail: sp.thumbnail,
      images: sp.images,
      categoryIds,
      collectionId: null,
      tags: sp.tags,
      options: [{ title: "Size", values: sizes }],
      variants,
      weight: 500,
      updatedAt: new Date(),
    }

    if (existing) {
      await db.collection("products").updateOne({ _id: existing._id }, { $set: doc })
    } else {
      const _id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      await db.collection("products").insertOne({
        _id,
        ...doc,
        createdAt: new Date(),
      })
    }
  }

  // Also distribute some demo products into men, kids, sports, accessories, beauty
  console.log("Distributing categories across demo products...")
  const allProds = await db.collection("products").find({}).toArray()
  for (let i = 0; i < allProds.length; i++) {
    const p = allProds[i]
    if (stitchProducts.some((sp) => sp.handle === p.handle)) continue

    const currentCatIds = p.categoryIds || []
    const newCatIds = new Set(currentCatIds)

    // Evenly map items to departments
    if (i % 2 === 0 && catMap["men"]) newCatIds.add(catMap["men"])
    if (i % 3 === 0 && catMap["women"]) newCatIds.add(catMap["women"])
    if (i % 5 === 0 && catMap["sports"]) newCatIds.add(catMap["sports"])
    if (i % 7 === 0 && catMap["accessories"]) newCatIds.add(catMap["accessories"])
    if (i % 9 === 0 && catMap["kids"]) newCatIds.add(catMap["kids"])
    if (i % 11 === 0 && catMap["beauty"]) newCatIds.add(catMap["beauty"])
    if (i % 13 === 0 && catMap["home"]) newCatIds.add(catMap["home"])

    await db.collection("products").updateOne(
      { _id: p._id },
      { $set: { categoryIds: Array.from(newCatIds) } }
    )
  }

  console.log("Categories and products successfully synced in MongoDB!")
  await client.close()
}

seed().catch((err) => {
  console.error("Seeding failed:", err)
  process.exit(1)
})

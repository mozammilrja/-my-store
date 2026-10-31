"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { cn } from "@/lib/utils"

export type MenuSection = {
  title: string
  href?: string
  links: { label: string; href: string }[]
}

export type MenuColumn = MenuSection[]

export type NavDepartment = {
  id: string
  label: string
  href: string
  accentColor?: string
  columns: MenuColumn[]
}

export const DEPARTMENTS_DATA: NavDepartment[] = [
  // 1. MEN (From Myntra Screenshot 1)
  {
    id: "men",
    label: "Men",
    href: "/categories/men",
    accentColor: "#ee5f73",
    columns: [
      // Column 1: Topwear + Indian & Festive
      [
        {
          title: "Topwear",
          href: "/categories/shirts",
          links: [
            { label: "T-Shirts", href: "/categories/shirts" },
            { label: "Casual Shirts", href: "/categories/shirts" },
            { label: "Formal Shirts", href: "/categories/shirts" },
            { label: "Sweatshirts", href: "/categories/sweatshirts" },
            { label: "Sweaters", href: "/categories/sweatshirts" },
            { label: "Jackets", href: "/categories/shirts" },
            { label: "Blazers & Coats", href: "/categories/shirts" },
            { label: "Suits", href: "/categories/men" },
            { label: "Rain Jackets", href: "/categories/men" },
          ],
        },
        {
          title: "Indian & Festive Wear",
          href: "/categories/men",
          links: [
            { label: "Kurtas & Kurta Sets", href: "/categories/men" },
            { label: "Sherwanis", href: "/categories/men" },
            { label: "Nehru Jackets", href: "/categories/men" },
            { label: "Dhotis", href: "/categories/men" },
          ],
        },
      ],
      // Column 2: Bottomwear + Innerwear
      [
        {
          title: "Bottomwear",
          href: "/categories/pants",
          links: [
            { label: "Jeans", href: "/categories/pants" },
            { label: "Casual Trousers", href: "/categories/pants" },
            { label: "Formal Trousers", href: "/categories/pants" },
            { label: "Shorts", href: "/categories/pants" },
            { label: "Track Pants & Joggers", href: "/categories/pants" },
          ],
        },
        {
          title: "Innerwear & Sleepwear",
          href: "/categories/men",
          links: [
            { label: "Briefs & Trunks", href: "/categories/men" },
            { label: "Boxers", href: "/categories/men" },
            { label: "Vests", href: "/categories/men" },
            { label: "Sleepwear & Loungewear", href: "/categories/men" },
            { label: "Thermals", href: "/categories/men" },
          ],
        },
        {
          title: "Plus Size",
          href: "/categories/men",
          links: [],
        },
      ],
      // Column 3: Footwear + Grooming
      [
        {
          title: "Footwear",
          href: "/categories/footwear",
          links: [
            { label: "Casual Shoes", href: "/categories/footwear" },
            { label: "Sports Shoes", href: "/categories/footwear" },
            { label: "Formal Shoes", href: "/categories/footwear" },
            { label: "Sneakers", href: "/categories/footwear" },
            { label: "Sandals & Floaters", href: "/categories/footwear" },
            { label: "Flip Flops", href: "/categories/footwear" },
            { label: "Socks", href: "/categories/footwear" },
          ],
        },
        {
          title: "Personal Care & Grooming",
          href: "/categories/beauty",
          links: [],
        },
        {
          title: "Sunglasses & Frames",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Watches",
          href: "/categories/accessories",
          links: [],
        },
      ],
      // Column 4: Sports & Active + Gadgets
      [
        {
          title: "Sports & Active Wear",
          href: "/categories/sports",
          links: [
            { label: "Sports Shoes", href: "/categories/footwear" },
            { label: "Sports Sandals", href: "/categories/footwear" },
            { label: "Active T-Shirts", href: "/categories/shirts" },
            { label: "Track Pants & Shorts", href: "/categories/pants" },
            { label: "Tracksuits", href: "/categories/sports" },
            { label: "Jackets & Sweatshirts", href: "/categories/sweatshirts" },
            { label: "Sports Accessories", href: "/categories/accessories" },
            { label: "Swimwear", href: "/categories/sports" },
          ],
        },
        {
          title: "Gadgets",
          href: "/categories/accessories",
          links: [
            { label: "Smart Wearables", href: "/categories/accessories" },
            { label: "Fitness Gadgets", href: "/categories/accessories" },
            { label: "Headphones", href: "/categories/accessories" },
            { label: "Speakers", href: "/categories/accessories" },
          ],
        },
      ],
      // Column 5: Fashion Accessories + Bags
      [
        {
          title: "Fashion Accessories",
          href: "/categories/accessories",
          links: [
            { label: "Wallets", href: "/categories/accessories" },
            { label: "Belts", href: "/categories/accessories" },
            { label: "Perfumes & Body Mists", href: "/categories/beauty" },
            { label: "Trimmers", href: "/categories/beauty" },
            { label: "Deodorants", href: "/categories/beauty" },
            { label: "Ties, Cufflinks & Pocket Squares", href: "/categories/accessories" },
            { label: "Accessory Gift Sets", href: "/categories/accessories" },
            { label: "Caps & Hats", href: "/categories/accessories" },
            { label: "Mufflers, Scarves & Gloves", href: "/categories/accessories" },
            { label: "Phone Cases", href: "/categories/accessories" },
            { label: "Rings & Wristwear", href: "/categories/jewellery" },
            { label: "Helmets", href: "/categories/accessories" },
          ],
        },
        {
          title: "Bags & Backpacks",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Luggages & Trolleys",
          href: "/categories/accessories",
          links: [],
        },
      ],
    ],
  },

  // 2. WOMEN (From Myntra Screenshot 2)
  {
    id: "women",
    label: "Women",
    href: "/categories/women",
    accentColor: "#fb56c1",
    columns: [
      // Column 1: Indian & Fusion Wear
      [
        {
          title: "Indian & Fusion Wear",
          href: "/categories/women",
          links: [
            { label: "Kurtas & Suits", href: "/categories/women" },
            { label: "Kurtis, Tunics & Tops", href: "/categories/women" },
            { label: "Sarees", href: "/categories/women" },
            { label: "Ethnic Wear", href: "/categories/women" },
            { label: "Leggings, Salwars & Churidars", href: "/categories/pants" },
            { label: "Skirts & Palazzos", href: "/categories/pants" },
            { label: "Dress Materials", href: "/categories/women" },
            { label: "Lehenga Cholis", href: "/categories/women" },
            { label: "Dupattas & Shawls", href: "/categories/accessories" },
            { label: "Jackets", href: "/categories/women" },
          ],
        },
        {
          title: "Belts, Scarves & More",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Watches & Wearables",
          href: "/categories/accessories",
          links: [],
        },
      ],
      // Column 2: Western Wear
      [
        {
          title: "Western Wear",
          href: "/categories/women",
          links: [
            { label: "Dresses", href: "/categories/women" },
            { label: "Tops", href: "/categories/women" },
            { label: "Tshirts", href: "/categories/shirts" },
            { label: "Jeans", href: "/categories/pants" },
            { label: "Trousers & Capris", href: "/categories/pants" },
            { label: "Shorts & Skirts", href: "/categories/pants" },
            { label: "Co-ords", href: "/categories/women" },
            { label: "Playsuits", href: "/categories/women" },
            { label: "Jumpsuits", href: "/categories/women" },
            { label: "Shrugs", href: "/categories/women" },
            { label: "Sweaters & Sweatshirts", href: "/categories/sweatshirts" },
            { label: "Jackets & Coats", href: "/categories/women" },
            { label: "Blazers & Waistcoats", href: "/categories/women" },
          ],
        },
        {
          title: "Plus Size",
          href: "/categories/women",
          links: [],
        },
      ],
      // Column 3: Maternity + Footwear + Sports
      [
        {
          title: "Maternity",
          href: "/categories/women",
          links: [],
        },
        {
          title: "Sunglasses & Frames",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Footwear",
          href: "/categories/footwear",
          links: [
            { label: "Flats", href: "/categories/footwear" },
            { label: "Casual Shoes", href: "/categories/footwear" },
            { label: "Heels", href: "/categories/footwear" },
            { label: "Boots", href: "/categories/footwear" },
            { label: "Sports Shoes & Floaters", href: "/categories/footwear" },
          ],
        },
        {
          title: "Sports & Active Wear",
          href: "/categories/sports",
          links: [
            { label: "Clothing", href: "/categories/women" },
            { label: "Footwear", href: "/categories/footwear" },
            { label: "Sports Accessories", href: "/categories/accessories" },
            { label: "Sports Equipment", href: "/categories/accessories" },
          ],
        },
      ],
      // Column 4: Lingerie + Beauty
      [
        {
          title: "Lingerie & Sleepwear",
          href: "/categories/women",
          links: [
            { label: "Bra", href: "/categories/women" },
            { label: "Briefs", href: "/categories/women" },
            { label: "Shapewear", href: "/categories/women" },
            { label: "Sleepwear & Loungewear", href: "/categories/women" },
            { label: "Swimwear", href: "/categories/women" },
            { label: "Camisoles & Thermals", href: "/categories/women" },
          ],
        },
        {
          title: "Beauty & Personal Care",
          href: "/categories/beauty",
          links: [
            { label: "Makeup", href: "/categories/beauty" },
            { label: "Skincare", href: "/categories/beauty" },
            { label: "Premium Beauty", href: "/categories/beauty" },
            { label: "Lipsticks", href: "/categories/beauty" },
            { label: "Fragrances", href: "/categories/beauty" },
          ],
        },
      ],
      // Column 5: Gadgets + Jewellery + Bags
      [
        {
          title: "Gadgets",
          href: "/categories/accessories",
          links: [
            { label: "Smart Wearables", href: "/categories/accessories" },
            { label: "Fitness Gadgets", href: "/categories/accessories" },
            { label: "Headphones", href: "/categories/accessories" },
            { label: "Speakers", href: "/categories/accessories" },
          ],
        },
        {
          title: "Jewellery",
          href: "/categories/jewellery",
          links: [
            { label: "Fashion Jewellery", href: "/categories/jewellery" },
            { label: "Fine Jewellery", href: "/categories/jewellery" },
            { label: "Earrings", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Backpacks",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Handbags, Bags & Wallets",
          href: "/categories/accessories",
          links: [],
        },
        {
          title: "Luggages & Trolleys",
          href: "/categories/accessories",
          links: [],
        },
      ],
    ],
  },

  // 3. KIDS
  {
    id: "kids",
    label: "Kids",
    href: "/categories/kids",
    accentColor: "#f26a10",
    columns: [
      // Column 1: Boys Clothing
      [
        {
          title: "Boys Clothing",
          href: "/categories/kids",
          links: [
            { label: "T-Shirts", href: "/categories/kids" },
            { label: "Shirts", href: "/categories/kids" },
            { label: "Shorts", href: "/categories/kids" },
            { label: "Jeans", href: "/categories/kids" },
            { label: "Trousers", href: "/categories/kids" },
            { label: "Clothing Sets", href: "/categories/kids" },
            { label: "Ethnic Wear", href: "/categories/kids" },
            { label: "Track Pants & Pyjamas", href: "/categories/kids" },
            { label: "Jacket, Sweater & Sweatshirts", href: "/categories/kids" },
            { label: "Party Wear", href: "/categories/kids" },
            { label: "Innerwear & Thermals", href: "/categories/kids" },
            { label: "Nightwear", href: "/categories/kids" },
          ],
        },
      ],
      // Column 2: Girls Clothing
      [
        {
          title: "Girls Clothing",
          href: "/categories/kids",
          links: [
            { label: "Dresses", href: "/categories/kids" },
            { label: "Tops", href: "/categories/kids" },
            { label: "Tshirts", href: "/categories/kids" },
            { label: "Clothing Sets", href: "/categories/kids" },
            { label: "Lehenga Choli", href: "/categories/kids" },
            { label: "Kurta Sets", href: "/categories/kids" },
            { label: "Party Wear", href: "/categories/kids" },
            { label: "Dungarees & Jumpsuits", href: "/categories/kids" },
            { label: "Skirts & Shorts", href: "/categories/kids" },
            { label: "Tights & Leggings", href: "/categories/kids" },
            { label: "Jeans & Trousers", href: "/categories/kids" },
            { label: "Jacket, Sweater & Sweatshirts", href: "/categories/kids" },
          ],
        },
      ],
      // Column 3: Footwear & Toys
      [
        {
          title: "Footwear",
          href: "/categories/footwear",
          links: [
            { label: "Casual Shoes", href: "/categories/footwear" },
            { label: "Flipflops", href: "/categories/footwear" },
            { label: "Sports Shoes", href: "/categories/footwear" },
            { label: "Flats", href: "/categories/footwear" },
            { label: "Sandals", href: "/categories/footwear" },
            { label: "Heels", href: "/categories/footwear" },
            { label: "School Shoes", href: "/categories/footwear" },
            { label: "Socks", href: "/categories/footwear" },
          ],
        },
        {
          title: "Toys & Games",
          href: "/categories/kids",
          links: [
            { label: "Learning & Development", href: "/categories/kids" },
            { label: "Activity Toys", href: "/categories/kids" },
            { label: "Soft Toys", href: "/categories/kids" },
            { label: "Action Figures", href: "/categories/kids" },
          ],
        },
      ],
      // Column 4: Infants & Bedding
      [
        {
          title: "Infants",
          href: "/categories/kids",
          links: [
            { label: "Bodysuits", href: "/categories/kids" },
            { label: "Rompers & Sleepsuits", href: "/categories/kids" },
            { label: "Clothing Sets", href: "/categories/kids" },
            { label: "Tshirts & Tops", href: "/categories/kids" },
            { label: "Dresses", href: "/categories/kids" },
            { label: "Bottom wear", href: "/categories/kids" },
            { label: "Winter Wear", href: "/categories/kids" },
            { label: "Innerwear & Sleepwear", href: "/categories/kids" },
            { label: "Infant Care", href: "/categories/kids" },
          ],
        },
        {
          title: "Home & Bath",
          href: "/categories/home",
          links: [
            { label: "Bed Linen & Furnishing", href: "/categories/home" },
            { label: "Towels", href: "/categories/home" },
            { label: "Blankets & Quilts", href: "/categories/home" },
          ],
        },
      ],
      // Column 5: Kids Accessories & Top Brands
      [
        {
          title: "Kids Accessories",
          href: "/categories/accessories",
          links: [
            { label: "Bags & Backpacks", href: "/categories/accessories" },
            { label: "Watches", href: "/categories/accessories" },
            { label: "Jewellery & Hair Accessories", href: "/categories/accessories" },
            { label: "Sunglasses & Frames", href: "/categories/accessories" },
            { label: "Caps & Hats", href: "/categories/accessories" },
          ],
        },
        {
          title: "Top Brands",
          href: "/categories/kids",
          links: [
            { label: "H&M Kids", href: "/categories/kids" },
            { label: "Max Kids", href: "/categories/kids" },
            { label: "Pantaloons Junior", href: "/categories/kids" },
            { label: "U.S. Polo Assn. Kids", href: "/categories/kids" },
            { label: "Mothercare", href: "/categories/kids" },
            { label: "Marks & Spencer", href: "/categories/kids" },
          ],
        },
      ],
    ],
  },

  // 4. HOME
  {
    id: "home",
    label: "Home",
    href: "/categories/home",
    accentColor: "#f2c210",
    columns: [
      // Column 1: Bed Linen
      [
        {
          title: "Bed Linen & Furnishing",
          href: "/categories/home",
          links: [
            { label: "Bed Runners", href: "/categories/home" },
            { label: "Mattress Protectors", href: "/categories/home" },
            { label: "Bedsheets", href: "/categories/home" },
            { label: "Bedding Sets", href: "/categories/home" },
            { label: "Blankets, Quilts & Dohars", href: "/categories/home" },
            { label: "Pillows & Pillow Covers", href: "/categories/home" },
            { label: "Cushions & Cushion Covers", href: "/categories/home" },
            { label: "Curtains", href: "/categories/home" },
          ],
        },
      ],
      // Column 2: Flooring & Bath
      [
        {
          title: "Flooring",
          href: "/categories/home",
          links: [
            { label: "Carpets", href: "/categories/home" },
            { label: "Floor Mats & Dhurries", href: "/categories/home" },
            { label: "Door Mats", href: "/categories/home" },
          ],
        },
        {
          title: "Bath",
          href: "/categories/home",
          links: [
            { label: "Bath Towels", href: "/categories/home" },
            { label: "Hand & Face Towels", href: "/categories/home" },
            { label: "Towels Set", href: "/categories/home" },
            { label: "Bath Rugs", href: "/categories/home" },
            { label: "Bath Robes", href: "/categories/home" },
            { label: "Bathroom Accessories", href: "/categories/home" },
          ],
        },
      ],
      // Column 3: Lamps & Lighting + Decor
      [
        {
          title: "Lamps & Lighting",
          href: "/categories/home",
          links: [
            { label: "Floor Lamps", href: "/categories/home" },
            { label: "Ceiling Lamps", href: "/categories/home" },
            { label: "Table Lamps", href: "/categories/home" },
            { label: "Wall Lamps", href: "/categories/home" },
            { label: "String Lights", href: "/categories/home" },
          ],
        },
        {
          title: "Home Décor",
          href: "/categories/home",
          links: [
            { label: "Plants & Planters", href: "/categories/home" },
            { label: "Aromas & Candles", href: "/categories/home" },
            { label: "Clocks & Mirrors", href: "/categories/home" },
            { label: "Wall Décor & Art", href: "/categories/home" },
            { label: "Showpieces & Vases", href: "/categories/home" },
          ],
        },
      ],
      // Column 4: Kitchen & Table + Storage
      [
        {
          title: "Kitchen & Table",
          href: "/categories/home",
          links: [
            { label: "Dinnerware & Serveware", href: "/categories/home" },
            { label: "Cups and Mugs", href: "/categories/home" },
            { label: "Bakeware & Cookware", href: "/categories/home" },
            { label: "Kitchen Storage & Tools", href: "/categories/home" },
            { label: "Bar & Drinkware", href: "/categories/home" },
            { label: "Table Covers & Runners", href: "/categories/home" },
          ],
        },
        {
          title: "Storage & Organisers",
          href: "/categories/home",
          links: [
            { label: "Bins & Baskets", href: "/categories/home" },
            { label: "Cloth Hangers", href: "/categories/home" },
            { label: "Wardrobe Organisers", href: "/categories/home" },
            { label: "Hooks & Holders", href: "/categories/home" },
          ],
        },
      ],
      // Column 5: Brands
      [
        {
          title: "Top Home Brands",
          href: "/categories/home",
          links: [
            { label: "H&M Home", href: "/categories/home" },
            { label: "Marks & Spencer Home", href: "/categories/home" },
            { label: "D'Decor", href: "/categories/home" },
            { label: "Story@Home", href: "/categories/home" },
            { label: "Pure Home", href: "/categories/home" },
            { label: "Raymond Home", href: "/categories/home" },
            { label: "Maspar", href: "/categories/home" },
            { label: "My Trident", href: "/categories/home" },
            { label: "Ellementry", href: "/categories/home" },
          ],
        },
      ],
    ],
  },

  // 5. BEAUTY & PERSONAL CARE
  {
    id: "beauty",
    label: "Beauty",
    href: "/categories/beauty",
    accentColor: "#0db7af",
    columns: [
      // Column 1: Makeup
      [
        {
          title: "Makeup",
          href: "/categories/beauty",
          links: [
            { label: "Lipstick & Lip Gloss", href: "/categories/beauty" },
            { label: "Lip Liner", href: "/categories/beauty" },
            { label: "Mascara & Eyeliner", href: "/categories/beauty" },
            { label: "Kajal & Eyeshadow", href: "/categories/beauty" },
            { label: "Foundation & Primer", href: "/categories/beauty" },
            { label: "Concealer & Compact", href: "/categories/beauty" },
            { label: "Nail Polish", href: "/categories/beauty" },
          ],
        },
      ],
      // Column 2: Skincare, Bath & Body
      [
        {
          title: "Skincare, Bath & Body",
          href: "/categories/beauty",
          links: [
            { label: "Face Moisturiser", href: "/categories/beauty" },
            { label: "Cleanser & Face Wash", href: "/categories/beauty" },
            { label: "Sunscreen & Face Mist", href: "/categories/beauty" },
            { label: "Face Serum", href: "/categories/beauty" },
            { label: "Eye Cream & Lip Balm", href: "/categories/beauty" },
            { label: "Body Lotion & Wash", href: "/categories/beauty" },
            { label: "Body Scrub & Hand Cream", href: "/categories/beauty" },
          ],
        },
        {
          title: "Baby Care",
          href: "/categories/beauty",
          links: [],
        },
      ],
      // Column 3: Haircare & Fragrances
      [
        {
          title: "Haircare",
          href: "/categories/beauty",
          links: [
            { label: "Shampoo & Conditioner", href: "/categories/beauty" },
            { label: "Hair Oil & Serum", href: "/categories/beauty" },
            { label: "Hair Gel & Wax", href: "/categories/beauty" },
            { label: "Hair Color & Mask", href: "/categories/beauty" },
          ],
        },
        {
          title: "Fragrances",
          href: "/categories/beauty",
          links: [
            { label: "Perfume (EDP/EDT)", href: "/categories/beauty" },
            { label: "Body Mist & Deodorant", href: "/categories/beauty" },
          ],
        },
      ],
      // Column 4: Appliances & Grooming
      [
        {
          title: "Appliances",
          href: "/categories/beauty",
          links: [
            { label: "Hair Straightener & Dryer", href: "/categories/beauty" },
            { label: "Epilators & Shavers", href: "/categories/beauty" },
          ],
        },
        {
          title: "Men's Grooming",
          href: "/categories/beauty",
          links: [
            { label: "Trimmers & Shavers", href: "/categories/beauty" },
            { label: "Beard Oil & Wash", href: "/categories/beauty" },
            { label: "Hair Styling Cream", href: "/categories/beauty" },
          ],
        },
        {
          title: "Beauty Gift & Makeup Sets",
          href: "/categories/beauty",
          links: [],
        },
      ],
      // Column 5: Top Brands
      [
        {
          title: "Top Beauty Brands",
          href: "/categories/beauty",
          links: [
            { label: "Lakme", href: "/categories/beauty" },
            { label: "Maybelline", href: "/categories/beauty" },
            { label: "L'Oreal Paris", href: "/categories/beauty" },
            { label: "Bath & Body Works", href: "/categories/beauty" },
            { label: "The Body Shop", href: "/categories/beauty" },
            { label: "Biotique", href: "/categories/beauty" },
            { label: "Mamaearth", href: "/categories/beauty" },
            { label: "Forest Essentials", href: "/categories/beauty" },
            { label: "Kama Ayurveda", href: "/categories/beauty" },
            { label: "M.A.C", href: "/categories/beauty" },
          ],
        },
      ],
    ],
  },

  // 6. FOOTWEAR
  {
    id: "footwear",
    label: "Footwear",
    href: "/categories/footwear",
    accentColor: "#ff3f6c",
    columns: [
      [
        {
          title: "Men's Casual & Sports",
          href: "/categories/footwear",
          links: [
            { label: "Sneakers", href: "/categories/footwear" },
            { label: "Casual Shoes", href: "/categories/footwear" },
            { label: "Running Shoes", href: "/categories/footwear" },
            { label: "Walking Shoes", href: "/categories/footwear" },
            { label: "Training & Gym Shoes", href: "/categories/footwear" },
            { label: "Sandals & Floaters", href: "/categories/footwear" },
            { label: "Flip Flops & Slides", href: "/categories/footwear" },
          ],
        },
        {
          title: "Men's Ethnic Footwear",
          href: "/categories/footwear",
          links: [
            { label: "Handcrafted Mojaris", href: "/categories/footwear" },
            { label: "Leather Kolhapuris", href: "/categories/footwear" },
            { label: "Royal Wedding Juttis", href: "/categories/footwear" },
          ],
        },
      ],
      [
        {
          title: "Men's Formal & Boots",
          href: "/categories/footwear",
          links: [
            { label: "Oxford & Derby Shoes", href: "/categories/footwear" },
            { label: "Brogues", href: "/categories/footwear" },
            { label: "Monk Straps", href: "/categories/footwear" },
            { label: "Loafers & Moccasins", href: "/categories/footwear" },
            { label: "Chelsea Boots", href: "/categories/footwear" },
            { label: "Lace-Up Ankle Boots", href: "/categories/footwear" },
          ],
        },
        {
          title: "Premium Handcrafted",
          href: "/categories/footwear",
          links: [
            { label: "Hand-Burnished Dress Shoes", href: "/categories/footwear" },
            { label: "Italian Calfskin Driving Loafers", href: "/categories/footwear" },
          ],
        },
      ],
      [
        {
          title: "Women's Flats & Casual",
          href: "/categories/footwear",
          links: [
            { label: "Ballerinas", href: "/categories/footwear" },
            { label: "Flats & Juttis", href: "/categories/footwear" },
            { label: "Kolhapuris & Mules", href: "/categories/footwear" },
            { label: "Casual Sneakers", href: "/categories/footwear" },
            { label: "Slip-On Canvas Shoes", href: "/categories/footwear" },
            { label: "Slides & Flip Flops", href: "/categories/footwear" },
          ],
        },
        {
          title: "Women's Ethnic Footwear",
          href: "/categories/footwear",
          links: [
            { label: "Embroidered Bridal Juttis", href: "/categories/footwear" },
            { label: "Zari Work Mules", href: "/categories/footwear" },
            { label: "Artisan Kolhapuris", href: "/categories/footwear" },
          ],
        },
      ],
      [
        {
          title: "Women's Heels & Party",
          href: "/categories/footwear",
          links: [
            { label: "Block Heels", href: "/categories/footwear" },
            { label: "Stilettos & Pumps", href: "/categories/footwear" },
            { label: "Kitten Heels", href: "/categories/footwear" },
            { label: "Platform Heels", href: "/categories/footwear" },
            { label: "Wedges", href: "/categories/footwear" },
            { label: "Heeled Boots", href: "/categories/footwear" },
          ],
        },
        {
          title: "Occasion Special",
          href: "/categories/footwear",
          links: [
            { label: "Metallic Party Heels", href: "/categories/footwear" },
            { label: "Crystal Embellished Sandals", href: "/categories/footwear" },
          ],
        },
      ],
      [
        {
          title: "Shoe Care & Accessories",
          href: "/categories/footwear",
          links: [
            { label: "Shoe Polish & Creams", href: "/categories/footwear" },
            { label: "Leather Protectors", href: "/categories/footwear" },
            { label: "Cushioned Insoles", href: "/categories/footwear" },
            { label: "Cedar Shoe Trees", href: "/categories/footwear" },
            { label: "Socks & Anklets", href: "/categories/footwear" },
          ],
        },
        {
          title: "Curated Brands",
          href: "/categories/footwear",
          links: [
            { label: "Everwear Atelier", href: "/categories/footwear" },
            { label: "Heritage Kolhapuri Guild", href: "/categories/footwear" },
            { label: "Royal Jutti Studio", href: "/categories/footwear" },
          ],
        },
      ],
    ],
  },

  // 7. ACCESSORIES
  {
    id: "accessories",
    label: "Accessories",
    href: "/categories/accessories",
    accentColor: "#535766",
    columns: [
      [
        {
          title: "Bags & Backpacks",
          href: "/categories/accessories",
          links: [
            { label: "Shoulder Totes", href: "/categories/accessories" },
            { label: "Crossbody Sling Bags", href: "/categories/accessories" },
            { label: "Laptop Backpacks", href: "/categories/accessories" },
            { label: "Clutches & Evening Pouches", href: "/categories/accessories" },
            { label: "Travel Duffels", href: "/categories/accessories" },
            { label: "Cabin & Check-in Trolleys", href: "/categories/accessories" },
          ],
        },
        {
          title: "Luggage & Travel",
          href: "/categories/accessories",
          links: [
            { label: "Hard-shell Trolleys", href: "/categories/accessories" },
            { label: "Travel Pouches & Organizers", href: "/categories/accessories" },
          ],
        },
      ],
      [
        {
          title: "Small Leather Goods",
          href: "/categories/accessories",
          links: [
            { label: "Men's Wallets", href: "/categories/accessories" },
            { label: "Women's Zip Wallets", href: "/categories/accessories" },
            { label: "Slim Cardholders", href: "/categories/accessories" },
            { label: "Passport Cases", href: "/categories/accessories" },
            { label: "Coin & Key Pouches", href: "/categories/accessories" },
          ],
        },
        {
          title: "Gifting Combos",
          href: "/categories/accessories",
          links: [
            { label: "Wallet & Belt Gift Sets", href: "/categories/accessories" },
            { label: "Executive Pen & Cardholder", href: "/categories/accessories" },
          ],
        },
      ],
      [
        {
          title: "Belts, Ties & Cufflinks",
          href: "/categories/accessories",
          links: [
            { label: "Full-Grain Leather Belts", href: "/categories/accessories" },
            { label: "Reversible Formal Belts", href: "/categories/accessories" },
            { label: "Pure Silk Ties", href: "/categories/accessories" },
            { label: "Brass Cufflinks", href: "/categories/accessories" },
            { label: "Pocket Squares & Pins", href: "/categories/accessories" },
          ],
        },
        {
          title: "Caps & Hats",
          href: "/categories/accessories",
          links: [
            { label: "Fedora Hats", href: "/categories/accessories" },
            { label: "Baseball Caps", href: "/categories/accessories" },
            { label: "Merino Wool Beanies", href: "/categories/accessories" },
          ],
        },
      ],
      [
        {
          title: "Eyewear & Watches",
          href: "/categories/accessories",
          links: [
            { label: "Aviator Sunglasses", href: "/categories/accessories" },
            { label: "Wayfarer Frames", href: "/categories/accessories" },
            { label: "Polarized Lenses", href: "/categories/accessories" },
            { label: "Minimalist Analog Watches", href: "/categories/accessories" },
            { label: "Chronograph Watches", href: "/categories/accessories" },
          ],
        },
        {
          title: "Smart Wearables",
          href: "/categories/accessories",
          links: [
            { label: "Smartwatch Straps", href: "/categories/accessories" },
            { label: "Fitness Trackers", href: "/categories/accessories" },
          ],
        },
      ],
      [
        {
          title: "Scarves, Shawls & Wraps",
          href: "/categories/accessories",
          links: [
            { label: "Silk Scarves & Stoles", href: "/categories/accessories" },
            { label: "Pashmina & Cashmere Shawls", href: "/categories/accessories" },
            { label: "Hand-Block Printed Scarves", href: "/categories/accessories" },
            { label: "Winter Wool Mufflers", href: "/categories/accessories" },
            { label: "Windproof Umbrellas", href: "/categories/accessories" },
          ],
        },
        {
          title: "Curated Edits",
          href: "/categories/accessories",
          links: [
            { label: "Monogrammed Leather", href: "/categories/accessories" },
            { label: "Everyday Carry Essentials", href: "/categories/accessories" },
          ],
        },
      ],
    ],
  },

  // 8. JEWELLERY
  {
    id: "jewellery",
    label: "Jewellery",
    href: "/categories/jewellery",
    accentColor: "#d4a373",
    columns: [
      [
        {
          title: "Fine Jewellery",
          href: "/categories/jewellery",
          links: [
            { label: "Gold Pendants & Chains", href: "/categories/jewellery" },
            { label: "Diamond Stud Earrings", href: "/categories/jewellery" },
            { label: "Solitaire Rings", href: "/categories/jewellery" },
            { label: "Platinum Bands", href: "/categories/jewellery" },
            { label: "Gemstone Tennis Bracelets", href: "/categories/jewellery" },
            { label: "Certified Gold Coins", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Precious Gemstones",
          href: "/categories/jewellery",
          links: [
            { label: "Zambian Emeralds", href: "/categories/jewellery" },
            { label: "Burmese Rubies", href: "/categories/jewellery" },
            { label: "Ceylon Sapphires", href: "/categories/jewellery" },
            { label: "Natural Pearl Strands", href: "/categories/jewellery" },
          ],
        },
      ],
      [
        {
          title: "Silver & Filigree",
          href: "/categories/jewellery",
          links: [
            { label: "925 Sterling Silver Rings", href: "/categories/jewellery" },
            { label: "Silver Chokers & Chains", href: "/categories/jewellery" },
            { label: "Oxidized Tribal Jewellery", href: "/categories/jewellery" },
            { label: "Silver Payals & Anklets", href: "/categories/jewellery" },
            { label: "Hand-Carved Silver Cuffs", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Heritage Craft",
          href: "/categories/jewellery",
          links: [
            { label: "Temple Heritage Jewellery", href: "/categories/jewellery" },
            { label: "Meenakari Enamel Art", href: "/categories/jewellery" },
            { label: "Thewa Gold Foil Work", href: "/categories/jewellery" },
            { label: "Cuttack Silver Filigree", href: "/categories/jewellery" },
          ],
        },
      ],
      [
        {
          title: "Kundan, Jadau & Polki",
          href: "/categories/jewellery",
          links: [
            { label: "Bridal Choker Sets", href: "/categories/jewellery" },
            { label: "Jadau Hasli Necklaces", href: "/categories/jewellery" },
            { label: "Polki Maang Tikka & Passa", href: "/categories/jewellery" },
            { label: "Kundan Chandbalis", href: "/categories/jewellery" },
            { label: "Meenakari Kadas & Bangles", href: "/categories/jewellery" },
            { label: "Bridal Matha Patti & Naths", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Earrings Studio",
          href: "/categories/jewellery",
          links: [
            { label: "Royal Jhumkis", href: "/categories/jewellery" },
            { label: "Crescent Chandbalis", href: "/categories/jewellery" },
            { label: "Solitaire Studs & Drops", href: "/categories/jewellery" },
            { label: "Ear Cuffs & Climbers", href: "/categories/jewellery" },
          ],
        },
      ],
      [
        {
          title: "Modern Fashion Jewellery",
          href: "/categories/jewellery",
          links: [
            { label: "Statement Necklaces", href: "/categories/jewellery" },
            { label: "Chunky Hoop Earrings", href: "/categories/jewellery" },
            { label: "Layered Minimal Chains", href: "/categories/jewellery" },
            { label: "Stackable Enamel Rings", href: "/categories/jewellery" },
            { label: "Charm Bracelets", href: "/categories/jewellery" },
            { label: "Evil Eye Amulets", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Occasion & Party",
          href: "/categories/jewellery",
          links: [
            { label: "Cocktail Statement Rings", href: "/categories/jewellery" },
            { label: "Evening Gala Chokers", href: "/categories/jewellery" },
            { label: "Red Carpet Pendants", href: "/categories/jewellery" },
          ],
        },
      ],
      [
        {
          title: "Men's Jewellery",
          href: "/categories/jewellery",
          links: [
            { label: "Men's Signet Rings", href: "/categories/jewellery" },
            { label: "Solid Silver Kadas", href: "/categories/jewellery" },
            { label: "Kurta Buttons & Brooches", href: "/categories/jewellery" },
            { label: "Minimal Link Chains", href: "/categories/jewellery" },
            { label: "Cufflinks & Tie Pins", href: "/categories/jewellery" },
          ],
        },
        {
          title: "Curated Edits",
          href: "/categories/jewellery",
          links: [
            { label: "Bridal Trousseau Box", href: "/categories/jewellery" },
            { label: "Gifting for Her", href: "/categories/jewellery" },
            { label: "Gifting for Him", href: "/categories/jewellery" },
            { label: "Affordable Luxury Under ₹2,999", href: "/categories/jewellery" },
          ],
        },
      ],
    ],
  },
]

export function MegaMenu({
  _catalogCategories = [],
}: {
  _catalogCategories?: Array<{ id: string; name: string; handle: string }>
}) {
  return (
    <nav className="relative w-full bg-surface-container-lowest border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="w-full px-margin-mobile md:px-margin flex items-center justify-between relative">
        {/* Navigation Items with Myntra-style Hover Dropdowns */}
        <div className="flex items-center gap-1 sm:gap-2">
          {DEPARTMENTS_DATA.map((dept) => (
            <div
              key={dept.id}
              className="group static"
              style={{ "--dept-accent": dept.accentColor || "#ee5f73" } as React.CSSProperties}
            >
              <LocalizedClientLink
                href={dept.href}
                className={cn(
                  "font-label-sm text-[13px] uppercase tracking-wider font-bold py-3.5 px-2.5 sm:px-3 relative block transition-colors",
                  "text-foreground/80 hover:text-[var(--dept-accent)] border-b-4 border-transparent group-hover:border-[var(--dept-accent)] group-hover:text-[var(--dept-accent)] group-hover:font-extrabold"
                )}
              >
                <span>{dept.label}</span>
              </LocalizedClientLink>

              {/* Myntra-Style Mega Menu Dropdown */}
              <div
                className={cn(
                  "hidden group-hover:block absolute top-full left-margin-mobile md:left-margin w-[1120px]",
                  "max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-6rem)]",
                  "bg-white shadow-[0_25px_60px_rgba(0,0,0,0.22)] z-50 border border-border/80 rounded-b-md overflow-hidden",
                  "before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']"
                )}
                style={{ backgroundColor: "#ffffff" }}
              >
                <div className="grid grid-cols-5">
                  {dept.columns.map((col, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex flex-col gap-3 py-5 px-5 border-r border-border/40 last:border-r-0"
                      style={{
                        backgroundColor: cIdx === 1 || cIdx === 3 ? "#fbfbfb" : "#ffffff",
                      }}
                    >
                      {col.map((section, sIdx) => (
                        <div key={sIdx} className="flex flex-col">
                          <LocalizedClientLink
                            href={section.href || dept.href}
                            className="font-label-caps text-[12px] font-bold uppercase tracking-tight mb-2 hover:underline block truncate"
                            style={{ color: dept.accentColor || "#ee5f73" }}
                          >
                            {section.title}
                          </LocalizedClientLink>

                          {section.links.length > 0 && (
                            <ul className="flex flex-col gap-1 text-[12px]">
                              {section.links.map((link, lIdx) => (
                                <li key={lIdx}>
                                  <LocalizedClientLink
                                    href={link.href}
                                    className="text-foreground/85 hover:text-foreground hover:font-bold transition-colors py-0.5 block truncate leading-snug"
                                  >
                                    {link.label}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                            </ul>
                          )}

                          {sIdx < col.length - 1 && (
                            <div className="border-b border-border/40 my-2.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Sleek Merchandising Bottom Strip */}
                <div className="bg-surface-container-low border-t border-border/50 px-6 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: dept.accentColor || "#ee5f73" }} />
                    <span className="font-semibold text-foreground">Everwear Guaranteed:</span> 100% Certified Authentic & Handcrafted Heritage Pieces
                  </span>
                  <LocalizedClientLink
                    href={dept.href}
                    className="font-bold hover:underline flex items-center gap-1 group/link"
                    style={{ color: dept.accentColor || "#ee5f73" }}
                  >
                    <span>Explore all in {dept.label}</span>
                    <span className="transition-transform group-hover/link:translate-x-0.5 font-bold">→</span>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Filter Direct Links */}
          <LocalizedClientLink
            href="/store?sort=newest"
            className="font-label-sm text-[13px] uppercase tracking-wider font-bold text-foreground/80 hover:text-foreground py-3.5 px-2.5 transition-colors border-b-4 border-transparent hover:border-foreground"
          >
            New Arrivals
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store?sort=bestseller"
            className="font-label-sm text-[13px] uppercase tracking-wider font-bold text-foreground/80 hover:text-foreground py-3.5 px-2.5 transition-colors border-b-4 border-transparent hover:border-foreground"
          >
            Trending
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store?sale=true"
            className="font-label-sm text-[13px] uppercase tracking-wider text-secondary font-extrabold py-3.5 px-2.5 flex items-center gap-1.5 transition-colors border-b-4 border-transparent hover:border-secondary"
          >
            <span>Sale</span>
            <span className="font-label-caps text-[11px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded uppercase font-bold tracking-tight">
              Up to 50%
            </span>
          </LocalizedClientLink>
        </div>

        {/* Right Shortcuts */}
        <div className="hidden xl:flex items-center gap-4 text-muted-foreground shrink-0 pl-4 font-body-sm text-xs">
          <LocalizedClientLink
            href="/order"
            className="font-label-caps text-[11px] uppercase tracking-wider hover:text-foreground transition-colors font-bold"
          >
            Track Order
          </LocalizedClientLink>
          <span className="opacity-20">|</span>
          <LocalizedClientLink
            href="/contact"
            className="font-label-caps text-[11px] uppercase tracking-wider hover:text-foreground transition-colors font-bold"
          >
            Find Atelier
          </LocalizedClientLink>
        </div>
      </div>
    </nav>
  )
}

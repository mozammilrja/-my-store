/**
 * Copy and data for the /concierge page, from the Stitch design
 * ("stitch_everwear_fashion_commerce_admin (6)").
 *
 * PLACEHOLDERS: the WhatsApp number, email, salon addresses and the three
 * stylists below come from the design mock-up, not from the business. Replace
 * them with real details before launch; everything on the page reads from here.
 */
export const CONCIERGE_CONTACT = {
  whatsappNumber: "919876543210",
  whatsappLabel: "+91 98765 43210",
  email: "concierge@everwearstudios.com",
}

export type ServiceId = "virtual" | "home" | "flagship"

export const SERVICES: {
  id: ServiceId
  number: string
  eyebrow: string
  title: string
  tag: string
  description: string
  perks: string[]
  footnote: string
  image: string
  imageAlt: string
  featured?: boolean
  /** Location the booking form switches to when this service is picked. */
  defaultLocation: string
}[] = [
  {
    id: "virtual",
    number: "Service 01",
    eyebrow: "Remote & Global",
    title: "Virtual Style Consultation",
    tag: "Virtual Remote",
    description:
      "1-on-1 dedicated 45-minute interactive video salon with a senior curator. Receive a tailored interactive digital lookbook, capsule wardrobe matrix, and direct order reserving.",
    perks: [
      "Personal color theory & silhouette profiling",
      "Digital Lookbook PDF within 24 hours",
      "Express complimentary dispatch",
    ],
    footnote: "Duration: 45 Mins",
    image: "/images/concierge/suite-virtual.jpg",
    imageAlt: "A stylist running an online mood-board session with fabric swatches and a tablet",
    defaultLocation: "Remote Virtual",
  },
  {
    id: "home",
    number: "Service 02",
    eyebrow: "In-Home Fitting",
    title: "Doorstep Try-At-Home Trial",
    tag: "In-Home Fitting",
    description:
      "Select up to 8 handpicked garments online. Our concierge delivers in a garment van with backup size increments, waits up to 45 minutes while you try in privacy, and processes instant payment only for keepers.",
    perks: [
      "Up to 8 garments curated & delivered",
      "45-minute zero-pressure private fitting",
      "Instant return handover & pin-less UPI/POS",
    ],
    footnote: "Metro Hubs Only",
    image: "/images/concierge/suite-home.jpg",
    imageAlt: "Garment carriers and hung linen delivered to a bright apartment",
    featured: true,
    defaultLocation: "Doorstep In-Home",
  },
  {
    id: "flagship",
    number: "Service 03",
    eyebrow: "Flagship Salons",
    title: "Atelier Flagship Private Suite",
    tag: "Flagship Suite",
    description:
      "Unfettered private salon access in Kala Ghoda (Mumbai) or Mehrauli (Delhi). Includes private champagne and artisanal beverage service, live master tailor measurements, and custom alteration fittings.",
    perks: [
      "Exclusive 90-minute salon reservation",
      "Resident Master Tailor fitting & tucking",
      "Curated refreshments & beverage tasting",
    ],
    footnote: "Duration: 90 Mins",
    image: "/images/concierge/suite-flagship.jpg",
    imageAlt: "A private boutique dressing suite with velvet seating and tailored mannequins",
    defaultLocation: "Mumbai Flagship",
  },
]

export const LOCATIONS = [
  { value: "Mumbai Flagship", label: "Mumbai Flagship (Kala Ghoda)" },
  { value: "Delhi NCR Flagship", label: "Delhi NCR Flagship (The Dhan Mill)" },
  { value: "Bengaluru Salon", label: "Bengaluru Private Salon (Lavelle Rd)" },
  { value: "Doorstep In-Home", label: "Doorstep In-Home (Private Address)" },
  { value: "Remote Virtual", label: "Global Remote (Google Meet / Zoom)" },
]

export const SLOTS = [
  "11:00 AM – 12:30 PM (Morning Edit)",
  "02:30 PM – 04:00 PM (Afternoon Salon)",
  "05:00 PM – 06:30 PM (Twilight Fitting)",
  "07:00 PM – 08:30 PM (Evening Private VIP)",
]

export const OCCASIONS = [
  "Wedding / Festive Edit",
  "Executive Workwear Wardrobe",
  "Seasonal Capsule Update",
  "Black Tie / Evening Gala",
  "Resort & Vacation Wardrobe",
  "Archival Jewelry Pairing",
]

export const STYLISTS = [
  {
    name: "Aanya Mehra",
    role: "Head of Curation",
    specialty: "Contemporary Haute Couture & Festive Silhouettes",
    bio: "Former lead stylist for Vogue India, specializing in bridging structured Western tailoring with hand-spun Chanderi and Banarasi textiles.",
    base: "Mumbai Flagship",
    image: "/images/concierge/stylist-curation.jpg",
    imageAlt: "A fashion director in a structured black blazer against a concrete wall",
  },
  {
    name: "Vikram Sen",
    role: "Menswear Director",
    specialty: "Men's Bespoke Tailoring & Heritage Linen",
    bio: "Trained on Savile Row and based in Delhi NCR, Vikram masters the drape of unstructured linen jackets, bandhgalas, and relaxed trousers.",
    base: "Delhi NCR Flagship",
    image: "/images/concierge/stylist-menswear.jpg",
    imageAlt: "A menswear tailor in a linen waistcoat inspecting suiting fabrics",
  },
  {
    name: "Tara Kapur",
    role: "Accessories & Fine Accents",
    specialty: "Capsule Wardrobes & Ethical Jewelry Styling",
    bio: "Specialist in building versatile 15-piece capsule collections that transition seamlessly from international boardrooms to Mediterranean getaways.",
    base: "Bengaluru Salon & Virtual",
    image: "/images/concierge/stylist-accessories.jpg",
    imageAlt: "A stylist holding silver and brass jewelry against a beige backdrop",
  },
]

export const STEPS = [
  {
    label: "01. Curation Brief",
    title: "Select Your Garments",
    body: "Browse Everwear online or coordinate with your stylist on WhatsApp to pick up to 8 items in your aesthetic radar.",
  },
  {
    label: "02. White-Glove Dispatch",
    title: "Chauffeur Delivery",
    body: "Our liveried concierge brings freshly steamed garments with alternate size increments right to your doorway.",
  },
  {
    label: "03. Private 45-Min Trial",
    title: "Try in Complete Privacy",
    body: "Our concierge waits patiently outside your residence while you evaluate fits with your own mirrors and footwear.",
  },
  {
    label: "04. Pay for What You Keep",
    title: "Instant Settlement",
    body: "Hand over any unwanted pieces. Tap to pay on our contactless terminal or UPI only for the clothes you decide to keep.",
  },
]

export const FAQS = [
  {
    q: "What are the fees for Doorstep Try-At-Home trials?",
    a: "Concierge trial delivery is 100% complimentary for all Everwear Privilege Gold & Platinum tier members. For non-members, a nominal convenience deposit of ₹299 is applicable, which is fully credited toward any piece you decide to keep during the trial.",
  },
  {
    q: "Which cities currently support same-day in-home fittings?",
    a: "Same-day in-home try-on is active across Mumbai Metropolitan Region (South Mumbai, Bandra, Juhu, Powai), Delhi NCR (South Delhi, Gurugram Golf Course Ext, Chanakyapuri), and Bengaluru (Indiranagar, Koramangala, Whitefield, Lavelle Road). Outer zones and Tier 1 cities are served within 24-48 hours via Priority Express.",
  },
  {
    q: "What if none of the items in my Try-At-Home box fit?",
    a: "There is zero obligation to purchase. If the garments or cuts do not meet your expectations, simply hand the garments back in their protective Everwear carriers to our waiting courier. No awkward discussions or hidden return charges.",
  },
  {
    q: "Can I reschedule or cancel my private Flagship Suite slot?",
    a: "Yes, reservations can be updated or rescheduled up to 2 hours before your allotted time through your confirmation SMS link or by texting our 24/7 WhatsApp concierge desk directly.",
  },
]

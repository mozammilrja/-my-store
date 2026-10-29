// Everwear Fashion Commerce Admin - Central Mock Data Store

export const HUBS = [
  { id: 'BLR-FC1', name: 'BLR-Fulfillment-FC1', location: 'Bengaluru (South)', status: 'Active', ping: '12ms', leadDispatcher: 'Ravi K.' },
  { id: 'BOM-FC2', name: 'BOM-Fulfillment-FC2', location: 'Bhiwandi / Mumbai (West)', status: 'Active', ping: '18ms', leadDispatcher: 'Amit P.' },
  { id: 'DEL-FC1', name: 'DEL-Fulfillment-FC1', location: 'Gurugram / NCR (North)', status: 'Active', ping: '15ms', leadDispatcher: 'Vikas S.' },
  { id: 'CCU-FC4', name: 'CCU-Fulfillment-FC4', location: 'Kolkata Hub (East)', status: 'Active', ping: '24ms', leadDispatcher: 'Pooja M.' },
];

export const INITIAL_ORDERS = [
  {
    id: 'EVR-984210-BLR',
    channel: 'Everwear iOS v4.8',
    orderDate: '24 May 2024, 14:28 IST',
    timeAgo: '14 secs ago',
    nodeFc: 'BLR-FC1',
    status: 'Packed & Staged',
    stageBadge: 'READY TO HANDOVER',
    isExpress: true,
    expressLabel: '⚡ 24h Express',
    customer: {
      name: 'Priyanka Sengupta',
      shortName: 'Priyanka S.',
      email: 'priyanka.s***@everwear.vip',
      phone: '+91 98860•••••',
      fullPhone: '+91 98860 41289',
      tier: 'GOLD VIP',
      tierBadgeClass: 'bg-amber-100 text-amber-800',
      address: 'Flat 402, Renaissance Park, 100ft Road, Indiranagar, Bengaluru, KA 560038',
      cityRegion: 'Bengaluru, KA • 560038',
      deliveryInstructions: 'Leave at front desk'
    },
    items: [
      {
        id: 'item-1',
        name: 'Everwear Artisan Silk Maxi Dress',
        sku: 'EVR-MXD-SLK-04',
        hsn: 'HSN 6204',
        size: 'M',
        color: 'Dusty Rose',
        qty: 1,
        price: 2799.00,
        mrp: 3999.00,
        gstRate: '12%',
        gstAmount: 299.89,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ'
      },
      {
        id: 'item-2',
        name: 'High-Rise Relaxed Tencel Pant',
        sku: 'EVR-PNT-TNC-12',
        hsn: 'HSN 6204',
        size: '28',
        color: 'Sand',
        qty: 1,
        price: 2091.00,
        mrp: 2499.00,
        gstRate: '12%',
        gstAmount: 224.03,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2USwNxP3HHn-q4oA4yeCuUTQqCEo_Nqqm_zHTV0bswOcR7TMc1_1WvOL-wnxwnxFrlBGglV_63r7rB2r3urt6H60k97LrP8J-H4tDqXDsIldmLhwZAabvNZrbZNNAbiaK_i9sfwv7HugBYUYM2sqX6aZMeWuoDvmwKkpSgwCvCMRWIi_gOLCIj-yY7Qu8RxEmUncLwCYXh4NvvOvWyptMfjzTs55G9VQlWOOQ2sjF'
      }
    ],
    itemsSummary: '2 Items (Sizes: M, 28)',
    totalWeight: '640g',
    boxType: 'Eco-Kraft Box (Medium, 280x200x80mm) with tamper seal',
    invoiceNumber: 'EW-INV-2024-59201',
    payment: {
      mode: 'UPI (Prepaid)',
      status: 'UPI Verified',
      reference: 'HDFC::Ref88910',
      type: 'prepaid',
      taxableValue: 4366.08,
      cgst: 261.96,
      sgst: 261.96,
      shipping: 0,
      totalPaid: 4890.00
    },
    courier: {
      partner: 'BlueDart Express',
      awb: '8492019482',
      slaRemaining: '1h 12m remaining',
      slaHealthy: true,
      dock: 'Dock 4B'
    },
    currentTimelineStep: 6, // 1 to 9
    timeline: [
      { step: 1, title: 'Order Placed & Payment Verified', time: '14:28 IST', desc: 'Prepaid via UPI (Razorpay Auto-reconciled)', done: true },
      { step: 2, title: 'Inventory Allocated', time: '14:31 IST', desc: 'BLR-FC1 Hub • Aisle C-14, Bay 02', done: true },
      { step: 3, title: 'Pick List Assigned', time: '14:45 IST', desc: 'Assigned to Warehouse Picker Ravi K. (Batch #182)', done: true },
      { step: 4, title: 'QC Passed & Barcode Scanned', time: '15:02 IST', desc: 'Garment tag RFID: 890412894101 verified • Zero defect', done: true },
      { step: 5, title: 'Packed & Sealed', time: '15:15 IST', desc: 'Eco-Kraft Box (Medium, 280x200x80mm) with tamper seal', done: true },
      { step: 6, title: 'Label & GST Invoice Generated', time: '15:20 IST', desc: 'Invoice #EW-INV-2024-59201 • Staged in Dispatch Dock 4B', isCurrent: true, alert: 'Awaiting 17:00 BlueDart Express Van Handover' },
      { step: 7, title: 'In-Transit via Hub Koramangala', time: 'Pending', desc: 'Next scan scheduled at sorting facility', done: false },
      { step: 8, title: 'Out for Delivery', time: 'Expected Tomorrow, 11:00', desc: 'Customer SMS with 4-digit Handover OTP', done: false },
      { step: 9, title: 'Delivered & 14-Day Return Window Starts', time: 'Pending', desc: 'Doorstep exchange/return eligible till 08 June 2024', done: false }
    ]
  },
  {
    id: 'EVR-984209-BOM',
    channel: 'Everwear Web Storefront',
    orderDate: '24 May 2024, 14:15 IST',
    timeAgo: '42 secs ago',
    nodeFc: 'BOM-FC2',
    status: 'Allocating Picker',
    stageBadge: 'PICK QUEUE',
    isExpress: false,
    customer: {
      name: 'Karan Mehra',
      shortName: 'Karan Mehra',
      email: 'karan.m***@gmail.com',
      phone: '+91 97110•••••',
      fullPhone: '+91 97110 59281',
      tier: 'GOLD TIER',
      tierBadgeClass: 'bg-surface-subtle text-secondary',
      address: '7th Floor, Sea Breeze Apts, Bandra West, Mumbai, MH 400050',
      cityRegion: 'Mumbai, MH • 400050',
      deliveryInstructions: 'Call upon arrival'
    },
    items: [
      {
        id: 'item-3',
        name: 'Oversized Structured Workwear Overshirt',
        sku: 'EVR-SHR-WRK-09',
        hsn: 'HSN 6205',
        size: 'XL',
        color: 'Navy Blue',
        qty: 1,
        price: 3450.00,
        mrp: 4499.00,
        gstRate: '12%',
        gstAmount: 369.64,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgzFX-xgmHskXMbwCvRHdKvSgyvQ_DkA84ZnAoEyELt1wz7m1T8GyjTXVXTrEZU1_3gW2XWIvAWZjgR8mXmAnqAxRr42_U75xWzubq3-QnusLRq9hCpWtHqCOaNpckmC6SuW8DdqHI10lyukjY-6igArIysy-EJ7-bhU3uB4UJFL49XVcdORk6n7kidaUi7uRd17-hQmKq4YS71QOKwI4yuVuybOxkYb5IYiDMhhPJ'
      }
    ],
    itemsSummary: '1 Item (Size: XL)',
    totalWeight: '420g',
    boxType: 'Eco-Poly Courier Mailer (Large)',
    invoiceNumber: 'EW-INV-2024-59200',
    payment: {
      mode: 'Cash on Delivery (COD)',
      status: 'COD Assigned',
      reference: 'OTP Req.',
      type: 'cod',
      taxableValue: 3080.36,
      cgst: 184.82,
      sgst: 184.82,
      shipping: 0,
      totalPaid: 3450.00
    },
    courier: {
      partner: 'Delhivery Direct',
      awb: '108492049',
      slaRemaining: '2h 45m remaining',
      slaHealthy: true,
      dock: 'Dock 2A'
    },
    currentTimelineStep: 3,
    timeline: [
      { step: 1, title: 'Order Placed & COD OTP Verified', time: '14:15 IST', desc: 'Customer verified mobile via OTP', done: true },
      { step: 2, title: 'Inventory Allocated', time: '14:18 IST', desc: 'BOM-FC2 Hub • Aisle M-08', done: true },
      { step: 3, title: 'Allocating Warehouse Picker', time: '14:25 IST', desc: 'Assigned to picker queue in Bhiwandi Hub', isCurrent: true },
      { step: 4, title: 'QC Verification', time: 'Pending', desc: 'Awaiting visual check', done: false },
      { step: 5, title: 'Packing & Label', time: 'Pending', desc: 'Eco-mailer staging', done: false },
      { step: 6, title: 'Courier Handover', time: 'Pending', desc: 'Delhivery Direct evening dispatch', done: false },
      { step: 7, title: 'In-Transit', time: 'Pending', desc: 'Local hub routing', done: false },
      { step: 8, title: 'Out for Delivery', time: 'Pending', desc: 'COD cash/UPI collection', done: false },
      { step: 9, title: 'Delivered', time: 'Pending', desc: 'Order complete', done: false }
    ]
  },
  {
    id: 'EVR-984208-DEL',
    channel: 'Everwear iOS v4.8',
    orderDate: '24 May 2024, 14:02 IST',
    timeAgo: '1m 12s ago',
    nodeFc: 'DEL-FC1',
    status: 'Packed',
    stageBadge: 'STAGED FOR AIR',
    isExpress: true,
    expressLabel: 'Next Day',
    customer: {
      name: 'Ayesha Khan',
      shortName: 'Ayesha Khan',
      email: 'ayesha.k***@outlook.com',
      phone: '+91 99201•••••',
      fullPhone: '+91 99201 88410',
      tier: 'PLATINUM',
      tierBadgeClass: 'bg-zinc-200 text-zinc-800',
      address: 'B-14 Defence Colony, Near Flyover Market, New Delhi, DL 110024',
      cityRegion: 'New Delhi, DL • 110024',
      deliveryInstructions: 'Ring bell twice'
    },
    items: [
      {
        id: 'item-4',
        name: 'Sage Double Breasted Tailored Blazer',
        sku: 'EVR-BLZ-SGE-01',
        hsn: 'HSN 6204',
        size: 'S',
        color: 'Sage Green',
        qty: 1,
        price: 5490.00,
        mrp: 7999.00,
        gstRate: '12%',
        gstAmount: 588.21,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7N41QJtljY3W_g_SsJloEt-Ummc-K_1wqp3GNnyOLHrS56M4x-twr62Do0qavDUr4aNzBk5jJ6z9YGUVVFvWpuKT8aNd1TQ9mABQl4FDfxeL5j-NMZi5YeyvUIdCFY_InxMEdWyGCk-T9avpHDIygAVzDFt7kBLPNVJywS30DSBpfwFYqb33uoai7K6Todmk7DNbOiDsuLsrTV_d8g9o1XRwFOFnSe6YenPoZ-AIn'
      },
      {
        id: 'item-5',
        name: 'Pure Poplin Mother of Pearl Shirt',
        sku: 'EVR-SHR-POP-WH',
        hsn: 'HSN 6205',
        size: 'M',
        color: 'Ivory White',
        qty: 1,
        price: 2850.00,
        mrp: 3499.00,
        gstRate: '12%',
        gstAmount: 305.36,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADTBRK-DG_ruP3G_XhskCMH7miGm6cY1UtKM9Dl2DJO49ycXFJRm9mqhfh5VQOIVE0kSzBPqBDag5TIE-Hj6iTjCgWO2ha4-p9bVj--B51lxGoSC1Omhflqzd-FLFQOaAi3ErBNRQjfytMwHTryH6MtMg3JUjdDf9qecUS4opQDdrIpveyvuaC7GVv_2KU2SVEdKdz2T318x86vB97UwQxnnWCJA40ZUvFwKzQohIl'
      },
      {
        id: 'item-6',
        name: 'Woven Leather Artisan Clutch',
        sku: 'EVR-ACC-CLT-BK',
        hsn: 'HSN 4202',
        size: 'OS',
        color: 'Midnight Black',
        qty: 1,
        price: 2900.00,
        mrp: 3999.00,
        gstRate: '18%',
        gstAmount: 442.37,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2jx0pXGT2iVv4Hp0rXZ7MzgSqr6g7aCBiuBR_YNs9KgYCdg_vMu_W0jZC0DedjIOe-8Qqm6mNn2cZ-KfzSftR1yO9sM-ZBwSI0mvU2yA_O7A3m6B00lWYgAGwIdVZ-YiwvmdtqQPykJD7Dj4lB-Ih4K3BrmYdfd61E9jKsR_BHNZ2d8SfBziH-Ot7nR5rzvluQ1xvtdqN2QzzT36OJeQ2qp4wbMX_qepajzrAIqNk'
      }
    ],
    itemsSummary: '3 Items (Sizes: S, M, OS)',
    totalWeight: '1180g',
    boxType: 'Reinforced Fashion Wardrobe Box',
    invoiceNumber: 'EW-INV-2024-59199',
    payment: {
      mode: 'Net Banking (ICICI)',
      status: 'Net Banking',
      reference: 'ICICI::PG-9120',
      type: 'prepaid',
      taxableValue: 9904.06,
      cgst: 594.24,
      sgst: 594.24,
      shipping: 0,
      totalPaid: 11240.00
    },
    courier: {
      partner: 'BlueDart Express',
      awb: '8492019477',
      slaRemaining: '4h 10m remaining',
      slaHealthy: true,
      dock: 'Dock 1C'
    },
    currentTimelineStep: 5,
    timeline: [
      { step: 1, title: 'Order Placed & Payment Verified', time: '14:02 IST', desc: 'Prepaid Netbanking ICICI', done: true },
      { step: 2, title: 'Inventory Allocated DEL-FC1', time: '14:05 IST', desc: 'Gurugram Central Fulfillment Center', done: true },
      { step: 3, title: 'Pick Completed', time: '14:15 IST', desc: 'Batch #4401', done: true },
      { step: 4, title: 'QC Verified 3 Garments', time: '14:22 IST', desc: 'Packaging intact', done: true },
      { step: 5, title: 'Packed in Wardrobe Box', time: '14:30 IST', desc: 'Staged for BlueDart Aviation Courier', isCurrent: true },
      { step: 6, title: 'Manifest Scan', time: 'Pending', desc: 'Scheduled 17:30 IST', done: false },
      { step: 7, title: 'Airport Transit', time: 'Pending', desc: 'Air cargo flight BA-204', done: false },
      { step: 8, title: 'Out for Delivery', time: 'Pending', desc: 'Tomorrow morning', done: false },
      { step: 9, title: 'Delivered', time: 'Pending', desc: 'Order fulfillment cycle complete', done: false }
    ]
  },
  {
    id: 'EVR-984207-HYD',
    channel: 'Everwear Android v4.8',
    orderDate: '24 May 2024, 13:48 IST',
    timeAgo: '2m 04s ago',
    nodeFc: 'BLR-FC1',
    status: 'QC Verification',
    stageBadge: 'SCANNING RFID',
    isExpress: false,
    customer: {
      name: 'Rohan Varman',
      shortName: 'Rohan Varman',
      email: 'rohan.v***@gmail.com',
      phone: '+91 94401•••••',
      fullPhone: '+91 94401 77209',
      tier: 'SILVER TIER',
      tierBadgeClass: 'bg-surface-subtle text-secondary',
      address: 'Plot 88, Jubilee Hills Road No. 36, Hyderabad, TS 500081',
      cityRegion: 'Hyderabad, TS • 500081',
      deliveryInstructions: 'Leave with security guard'
    },
    items: [
      {
        id: 'item-7',
        name: 'Slim Fit Charcoal Grey Stretch Chino',
        sku: 'EVR-CHN-ST-32',
        hsn: 'HSN 6203',
        size: '32',
        color: 'Charcoal',
        qty: 1,
        price: 2199.00,
        mrp: 2999.00,
        gstRate: '12%',
        gstAmount: 235.61,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADeyWT6kENmVvQigNhomw9jEkuxjg_4mzneZSig9sRW_XN2XWgHEtAzHWF9MTiTq66RBC8sFp1oy4oKoKPCoa1DWzigte_BCJUViVzwKGxG09d1ueL3Qfmsy0-OS3uuFl4ebmbkAlY4_SRqxiqZ1BRmeXpGlBpBfIPB6lDokM7Bx86eeIMCG_2jvkRNOn4vmCFu6z6Mo6vSmOQqN-OhN8p4OCxmYAMIT1clq5GaB91'
      }
    ],
    itemsSummary: '1 Item (Size: 32)',
    totalWeight: '450g',
    boxType: 'Medium Eco-Mailer',
    invoiceNumber: 'EW-INV-2024-59198',
    payment: {
      mode: 'Prepaid (Razorpay)',
      status: 'Prepaid',
      reference: 'Razorpay::4928',
      type: 'prepaid',
      taxableValue: 1963.39,
      cgst: 117.80,
      sgst: 117.80,
      shipping: 0,
      totalPaid: 2199.00
    },
    courier: {
      partner: 'Shadowfax Hyper',
      awb: 'SFX9920182',
      slaRemaining: '3h 15m remaining',
      slaHealthy: true,
      dock: 'Dock 3B'
    },
    currentTimelineStep: 4,
    timeline: [
      { step: 1, title: 'Order Placed & Prepaid Confirmed', time: '13:48 IST', desc: 'Prepaid Razorpay', done: true },
      { step: 2, title: 'Allocated to BLR-FC1', time: '13:50 IST', desc: 'Aisle B-04', done: true },
      { step: 3, title: 'Picked by Warehouse Staff', time: '14:02 IST', desc: 'Picker ID #89', done: true },
      { step: 4, title: 'Undergoing QC Verification', time: '14:15 IST', desc: 'Garment tag RFID scan & seam check', isCurrent: true },
      { step: 5, title: 'Packaging', time: 'Pending', desc: 'Awaiting barcode poly-seal', done: false },
      { step: 6, title: 'Courier Staging', time: 'Pending', desc: 'Shadowfax truck allocation', done: false },
      { step: 7, title: 'In-Transit', time: 'Pending', desc: 'Hub dispatch', done: false },
      { step: 8, title: 'Out for Delivery', time: 'Pending', desc: 'Hyderabad hub delivery', done: false },
      { step: 9, title: 'Delivered', time: 'Pending', desc: 'Delivery confirmation SMS', done: false }
    ]
  },
  {
    id: 'EVR-984206-MAA',
    channel: 'Everwear Mobile Web',
    orderDate: '24 May 2024, 13:20 IST',
    timeAgo: '2m 45s ago',
    nodeFc: 'BLR-FC1',
    status: 'Packed',
    stageBadge: 'READY FOR DISPATCH',
    isExpress: false,
    customer: {
      name: 'Deepa Sundaram',
      shortName: 'Deepa Sundaram',
      email: 'p.sundaram***@yahoo.com',
      phone: '+91 98402•••••',
      fullPhone: '+91 98402 11984',
      tier: 'GOLD TIER',
      tierBadgeClass: 'bg-surface-subtle text-secondary',
      address: 'No. 42 TTK Road, Alwarpet, Chennai, TN 600028',
      cityRegion: 'Chennai, TN • 600028',
      deliveryInstructions: 'Ring doorbell'
    },
    items: [
      {
        id: 'item-8',
        name: 'Handloom Cotton Kurti with Zari Border',
        sku: 'EVR-KRT-ZAR-L',
        hsn: 'HSN 6204',
        size: 'L',
        color: 'Emerald & Gold',
        qty: 1,
        price: 1850.00,
        mrp: 2499.00,
        gstRate: '12%',
        gstAmount: 198.21,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvJ76b7xkVRiV7Wse5EhI0SdO7EPc8ZmuDM02RXAUD34AYnFac1zt5Qr7PedfNE9GZPv9MNJPbhtLg4nOYmxAhF-THDfVWMyjTm381y-zHIu-KL3Rj9ltnjkT9NYmAjJB1Ah19K2Yyk_sMbsX7dSHH-JbdAYlpcD0Ny-S2KDfzk8GNXXS-W7KB-PCm6qSN3hPRMnbcnaTeEj6lHupCDai1UtN2uTjMTa3qBDw3NRD9'
      }
    ],
    itemsSummary: '1 Item (Size: L)',
    totalWeight: '380g',
    boxType: 'Kraft Fashion Envelope',
    invoiceNumber: 'EW-INV-2024-59197',
    payment: {
      mode: 'UPI Verified',
      status: 'UPI Verified',
      reference: 'Paytm::8820',
      type: 'prepaid',
      taxableValue: 1651.79,
      cgst: 99.11,
      sgst: 99.11,
      shipping: 0,
      totalPaid: 1850.00
    },
    courier: {
      partner: 'XpressBees Surface',
      awb: 'XB88291048',
      slaRemaining: '5h 20m remaining',
      slaHealthy: true,
      dock: 'Dock 4A'
    },
    currentTimelineStep: 5,
    timeline: [
      { step: 1, title: 'Order Placed & Paid', time: '13:20 IST', desc: 'Prepaid Paytm UPI', done: true },
      { step: 2, title: 'Allocated BLR-FC1', time: '13:22 IST', desc: 'South India express lane', done: true },
      { step: 3, title: 'Picked by Ravi K.', time: '13:35 IST', desc: 'Batch #180', done: true },
      { step: 4, title: 'QC Passed', time: '13:42 IST', desc: 'Zero defect inspection', done: true },
      { step: 5, title: 'Packed & Weighed', time: '13:50 IST', desc: 'Envelope sealed with tamper tape', isCurrent: true },
      { step: 6, title: 'Awaiting Handover', time: 'Pending', desc: 'XpressBees linehaul truck', done: false },
      { step: 7, title: 'In-Transit to Chennai', time: 'Pending', desc: 'Overnight ground transit', done: false },
      { step: 8, title: 'Out for Delivery', time: 'Pending', desc: 'Chennai Alwarpet delivery', done: false },
      { step: 9, title: 'Delivered', time: 'Pending', desc: 'Final handshake', done: false }
    ]
  }
];

export const TOP_SELLING_SKUS = [
  {
    id: 'top-1',
    name: 'Luxe Embroidered Anarkali Kurta',
    sku: 'EVR-ANK-PUR-01',
    category: "Women's Ethnic",
    units: '1,420',
    revenue: '₹28.4L',
    stockBuffer: '1.8d Buffer',
    bufferType: 'danger',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHjboA3SiKR_ouVXFmeiPorPCbGX_zRqA5sK7GnomjnM4ELcdO7j3IRvNjJW5eimm1HcXXEhqymzpnirLL8lWM_NpcW5RTjeoZdXh9-l0LGhaLDtHAw3GcagoaMZ4OIxu3BMZNHyD7RPBwy6WMnNiAmgCGVrUtmwnhy8Wr4Ipgi6sjKNPQxnoWSgn8PLS3Alqh4CrO29LVv4y7F2IW7CV8mRk_ocI8YahiUNLNccAW'
  },
  {
    id: 'top-2',
    name: 'Slim Tapered Raw Denim',
    sku: 'EVR-DNM-SLM-32',
    category: "Men's Casuals",
    units: '982',
    revenue: '₹19.6L',
    stockBuffer: 'Healthy (12d)',
    bufferType: 'success',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzYpe_d4tY0lMpn0As-B3gKhow2pLllm9Bb-NjKXFXlhQI_vJqqfhW7DQw_Rkj9-7JvXIb9EyTcHWzw80m-cPtTgammKJK9INqb8nxubBRMzVfO17JndhbrFaUMHSBDmFpFRXzMzBkVQNBCmaWMRbgSVFMe4gQ8leDgGW3Ug_4TW0cTbQbIcouTYoZBBfj1AgumBx7Bs8cNRy6mb9GObg3j1Ib9reywEyhZUoRr9dY'
  },
  {
    id: 'top-3',
    name: 'Silk Blend Relaxed Overshirt',
    sku: 'EVR-SHR-SLK-OVR',
    category: 'Unisex Premium',
    units: '740',
    revenue: '₹16.2L',
    stockBuffer: '4.2d Buffer',
    bufferType: 'warning',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW4Cn4zxGoJCf743QwtvCw1tLsbLGkyy3kheUWAhEv-F-5U0-XCdpLZholWTUlQH5xW3gPQ3ayzFBntD_H-B0Jeab_KGFbvlx5F0a24U2hVAlLxIQn13zRvu-6MvB5QLfyY7wBC5nCC7JcyiDUYbgYimxUZXO9CmESqz3O_93IM8vzw9_WcftAiovkJTjCa2Fpn7zuKYBhn00jEzCDX7WidiujX1-quC1UN1-BoLub'
  },
  {
    id: 'top-4',
    name: 'Pleated Emerald Midi Dress',
    sku: 'EVR-DRS-EMR-MD',
    category: 'Western Evening',
    units: '618',
    revenue: '₹14.8L',
    stockBuffer: 'Healthy (18d)',
    bufferType: 'success',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsGUoaapQiYldheep3jIEE7fbLEZdU4u3g5SiRMRBalMc5QMBMMwRty28GSfCD6ceP7j8L7BskVbFTdYvWp0Crlhf_WfGB3D965tNLIZS5cJzVGgGKYinjJ1A7dLgsDX43f8TFIr39Psn8l3KEy32H9H-332d2VE6DfndGaeDxVa7FITkM_QXgAhUVL31w1s5kpP9qk_6ys_2dS5ugrNKLHOo1wnLSnckbzot_A5af'
  }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    title: 'Everwear Mulberry Silk Pleated Midi Dress',
    styleCode: 'EVR-WDR-2024-MULB',
    brand: 'Everwear Signature Label',
    collection: 'Atelier Summer 2024',
    seasonTag: 'AUTUMN / ATELIER 24',
    department: 'Women',
    category: 'Dresses & Jumpsuits',
    subCategory: "Women's Western",
    fabricComposition: '100% Mulberry Silk, Crepe Lining',
    silhouette: 'Regular A-Line Fit',
    pattern: 'Solid Botanical Self-Weave',
    washCare: 'Dry Clean Only, Cool Iron on Reverse',
    origin: 'India (Made in Jaipur, Rajasthan)',
    hsnCode: '620442',
    hsnDesc: 'Dresses of silk / silk waste',
    gstRate: 12.0,
    mrp: 5999,
    b2cPrice: 3899,
    procurementCost: 1450,
    grossMarginPercent: 62.8,
    grossMarginAmount: 2449,
    storefrontSync: true,
    codActive: true,
    expressShip: true,
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5tXfEPOKCgmNk7ufYXaluWqG8_65-r5GRrGdFRnPfEyLfGjgj39qko0ggl2CrHNElmkPPfge3ptfBlFpab_17z1eZ3LgpKHHcMAfI4SqWt4xz8KcAcMGKo2kt1hH1ppJ_H4Y538sEPLKYfOUB31LWlv3kkXdhzQC7UeBmDkarwv3ntU8Rcy_TSDhYdrUiEZO3iH1RuQvEekb3Ow4hlnpm4kjSpwHQTKRKx0uBQh94',
    mediaAssets: [
      {
        slot: 'Front',
        isPrimary: true,
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkFObXFRYdMZoY7VB-exP8j3DNHIAk3THMQkPOXtV08AYFU7NyvIg0ylz2Khh5wt5JWRKC3I8M1v-02KsGaikz191R9TrYgbmOFmYxCVeh9N_v7ZdEGi9ClQPpoVFbHQnDs1b7xSKRTfX4KXULNuxKRjUCU3dSKTKTNDmrCqc9WCSL1_i6jtL8jm4FspHNXpF2ATEPAT0FjCvZQCzL6dvI0nZv5XR_3G6u60f1cBGq'
      },
      {
        slot: 'Back',
        isPrimary: false,
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlEp8d9QD3y8RQywil610wnUq04U91o7kA_dsk7RjjwBQBwHfqdGBb0GyK61-9C2CToZuKNglGIkl7GsmlZv-DdVg9GRw7GWc6gsH24QPS7of2DUkozjifieKS47XNvAjdzs7b6uDx1o0PtuZU5KcLtfHIPjeDVE0NqqsoXTSZ17fVvL64ZgIJTutBioYKs0CHAD0XilUICWjcRnMGBPE62-zM87acVRlx9KX0-PfF'
      },
      {
        slot: 'Side',
        isPrimary: false,
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmJLOP4ce0v1EsKA1ATZabB67ALNrFD8RM2dr-1PbG-soOm8XSXSQ3ZqdT6gRF582plVgsSFUkaMYkfIrCNIoZ98aSEwbImDmSL9hJOFvT-yxgmsYBJ2Bn8TYrEtOqE2YYe0jla4Ah2OPY6syMfoEnjQTRRZTMUvpbVXDaDrR9i9m6FOZ93sDorSwIHPi_SXVwoGFY-zrCBrBpyATiL_mPeXvGfMW6QCMiu9VbQubm'
      },
      {
        slot: 'Detail',
        isPrimary: false,
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUZK_s8NVNZY3bNKru3dz5V0rHeiKOnlD3NpH81r-Nnw8UMdkdlVvfCD1LEl8swmDvThceL8q3nUjMW-OvnnH7w8sSBKn46fr4HJMwL9CLHNtcQD1manO_tll3SQiI4lKNrbYFwETYfodYT4PBW84dp9iFi3IgCc55UbjyND1yA82f3gIa2_Y2LDRnGNq-rcOcXQvGbTHiDMFAvZJKzTWzX6s8Pdtlv12xQ7BC8JZN'
      },
      {
        slot: 'Swatch',
        isPrimary: false,
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmvSBCIMeUdDNNVxR_zTvuxd73BQ-9Y1c6JCKGXdLOKt5CGfJzMmiV4WuRjdLAKh0J0FJIuYSPqx9KsOaUE13C_iJ0DeEm_7k6TpgeoncgrCXOZJlOuICb7IWaf2HxmpGCX_OV8534AtJLnQlH8V2ubs5_ChpKN53U6bDwMDGDaSqiwA7kLwGIav57HxIxNbGbD7CEThY3O_6_Ek8bY_DIDBDUdBPBplhrg_UYLno1'
      }
    ],
    colorways: [
      {
        name: 'Emerald Green',
        hex: '#065F46',
        skus: [
          { size: 'XS', sku: 'EVR-WDR-EMR-XS', ean: '8904321098451', stock: 142, status: 'In Stock' },
          { size: 'S', sku: 'EVR-WDR-EMR-S', ean: '8904321098452', stock: 298, status: 'In Stock' },
          { size: 'M', sku: 'EVR-WDR-EMR-M', ean: '8904321098453', stock: 340, status: 'In Stock' },
          { size: 'L', sku: 'EVR-WDR-EMR-L', ean: '8904321098454', stock: 18, status: 'Low Stock' },
          { size: 'XL', sku: 'EVR-WDR-EMR-XL', ean: '8904321098455', stock: 0, status: 'Out of Stock' }
        ]
      },
      {
        name: 'Wine Berry',
        hex: '#701A75',
        skus: [
          { size: 'XS', sku: 'EVR-WDR-WNE-XS', ean: '8904321098461', stock: 85, status: 'In Stock' },
          { size: 'S', sku: 'EVR-WDR-WNE-S', ean: '8904321098462', stock: 120, status: 'In Stock' },
          { size: 'M', sku: 'EVR-WDR-WNE-M', ean: '8904321098463', stock: 190, status: 'In Stock' },
          { size: 'L', sku: 'EVR-WDR-WNE-L', ean: '8904321098464', stock: 42, status: 'In Stock' },
          { size: 'XL', sku: 'EVR-WDR-WNE-XL', ean: '8904321098465', stock: 15, status: 'Low Stock' }
        ]
      }
    ]
  }
];

export const OPERATIONAL_INCIDENTS = [
  {
    id: 'inc-1',
    level: 'CRITICAL',
    title: 'CRITICAL BUFFER BREACH',
    node: 'BLR-FC1 • Rack G-14',
    desc: '42 apparel SKUs in Bengaluru Hub fell below safe lead threshold (< 15 units). Rapid dispatch throttling enabled for SKU: EVR-DRS-BLK-M.',
    actionText: 'Auto-Rebalance from BOM-FC2',
    dismissText: 'Acknowledge Alert',
    resolved: false
  },
  {
    id: 'inc-2',
    level: 'WARNING',
    title: '3PL CARRIER HANDOFF LATENCY',
    node: 'MUMBAI-FC2 (Bhiwandi)',
    desc: 'Delhivery Express manifest scans delayed by 45 mins due to dock congestion. 320 express packages risk flight handoff deadline.',
    actionText: 'Reroute to BlueDart Aviation',
    etaText: 'ETA Resolution: 20 mins',
    resolved: false
  },
  {
    id: 'inc-3',
    level: 'INFO',
    title: 'EVENT STAGING NOTIFICATION',
    node: 'All Nodes Active',
    desc: 'Seasonal Festive Collection drop launches in 14 hours. 3,200 unique SKUs pre-allocated in pick-bin staging. Pick paths pre-computed.',
    resolved: false
  }
];

export const INITIAL_RETURNS = [
  {
    id: 'RET-2024-89211',
    orderRef: 'EVR-984210-BLR',
    productTitle: 'Mulberry Silk Pleated Midi Dress',
    variant: 'Emerald • Size L',
    customer: {
      name: 'Deepa S.',
      location: 'Bengaluru, KA',
      phone: '+91 98860 12948',
      upiId: 'deepa@okaxis'
    },
    courier: {
      partner: 'BlueDart',
      awb: 'REV8920194',
      dockStatus: 'Delivered to Dock'
    },
    qcStatus: 'Pending Grading',
    qcGrade: 'A',
    refundValue: 2799.00,
    settlementEngine: 'Razorpay Instant UPI',
    paymentMethod: 'Razorpay UPI',
    returnReason: 'Size/Fit Issue',
    customerNote: 'Dress length is perfect but chest & waist fit is loose. Requesting return and refund to original UPI ID.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWlWy7M4R5V8Wk95KxUSY84VAoZ-etaPQtH102dl4nCPiD-CkpHiB4kuOiEpuBHwPLQZvADUwWZ1BNQR80FS-LNYwE5vpcNqR-c3LSdAT6fRMBVurdedU3XyVGVzxz8poCYVIqaI023LAeSsPnLyJLMF5dJ8lerdUjRjtoTin57-Z-ehPsj-npgD4BSVhw6Z-PiyJUD9yK477rhqoMrNOD9lkvPSAxvFBWPBM3mAKq',
    checklist: {
      tags: true,
      clean: true,
      zeroDefect: true
    },
    timeline: [
      { step: 'Garment Unbagged & Queued for QC', time: '24 May 15:20', actor: 'Inspector: BLR_OP_04', color: 'bg-status-success' },
      { step: 'Arrived at BLR-FC1 Reverse Dock', time: '24 May 10:30', actor: 'Manifest #BLR-REV-901', color: 'bg-primary-container' },
      { step: 'Reverse Pickup Completed', time: '23 May 14:15', actor: 'BlueDart Courier Agent A. Kumar', color: 'bg-secondary' },
      { step: 'Return Request Initiated', time: '22 May 11:20', actor: 'Everwear Mobile App (iOS)', color: 'bg-secondary-fixed-dim' }
    ]
  },
  {
    id: 'RET-2024-89208',
    orderRef: 'EVR-984180-BOM',
    productTitle: 'Luxe Embroidered Anarkali Kurta',
    variant: 'Purple • Size M',
    customer: {
      name: 'Sneha Roy',
      location: 'Mumbai, MH',
      phone: '+91 98200 45812',
      upiId: 'sneha.roy@okhdfcbank'
    },
    courier: {
      partner: 'Delhivery',
      awb: 'REV109482',
      dockStatus: 'Received in Dock'
    },
    qcStatus: 'Minor Thread Defect',
    qcGrade: 'B',
    refundValue: 4290.00,
    settlementEngine: 'Store Credit Wallet',
    paymentMethod: 'Store Credit',
    returnReason: 'Fabric/Quality Defect',
    customerNote: 'Embroidery stitch near neckline has pulled loose thread. Otherwise garment unworn.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
    checklist: {
      tags: true,
      clean: true,
      zeroDefect: false
    },
    timeline: [
      { step: 'Minor defect identified in Station 02', time: '24 May 14:10', actor: 'Inspector: BOM_QC_01', color: 'bg-status-warning' },
      { step: 'Received in Bhiwandi Inbound Bay', time: '24 May 09:15', actor: 'Delhivery Fleet Dispatch', color: 'bg-primary-container' },
      { step: 'Pickup Executed', time: '23 May 16:00', actor: 'Delhivery Direct', color: 'bg-secondary' }
    ]
  },
  {
    id: 'RET-2024-89195',
    orderRef: 'EVR-984120-DEL',
    productTitle: 'Slim Tapered Raw Denim',
    variant: 'Indigo • Size 32',
    customer: {
      name: 'Varun Kapoor',
      location: 'Delhi, NCR',
      phone: '+91 99100 88231',
      upiId: 'varun.k@icici'
    },
    courier: {
      partner: 'BlueDart',
      awb: 'REV891102',
      dockStatus: 'Exchange Shipped'
    },
    qcStatus: 'Passed Grade A',
    qcGrade: 'A',
    refundValue: 3199.00,
    settlementEngine: 'Doorstep Size Exchange',
    paymentMethod: 'Exchange #EX-89195',
    returnReason: 'Size/Fit Issue',
    customerNote: 'Waist 32 too snug, requested replacement in Size 34. Exchange already packed.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
    checklist: {
      tags: true,
      clean: true,
      zeroDefect: true
    },
    timeline: [
      { step: 'Replacement Size 34 Shipped', time: '24 May 11:00', actor: 'DEL-FC1 Fast Dispatch', color: 'bg-status-success' },
      { step: 'Passed QC Inspection Grade A', time: '24 May 08:30', actor: 'Inspector: DEL_QC_03', color: 'bg-primary-container' },
      { step: 'Reverse Transit Received', time: '23 May 19:40', actor: 'BlueDart Air Dock', color: 'bg-secondary' }
    ]
  },
  {
    id: 'RET-2024-89182',
    orderRef: 'EVR-984090-HYD',
    productTitle: 'Silk Blend Relaxed Overshirt',
    variant: 'Sand • Size L',
    customer: {
      name: 'Meera N.',
      location: 'Hyderabad, TS',
      phone: '+91 97000 55112',
      upiId: 'meera.n@paytm'
    },
    courier: {
      partner: 'XpressBees',
      awb: 'REV773910',
      dockStatus: 'Hub In-Transit'
    },
    qcStatus: 'Awaiting Inbound',
    qcGrade: null,
    refundValue: 2091.00,
    settlementEngine: 'Direct Bank Refund',
    paymentMethod: 'Credit Card',
    returnReason: 'Color Mismatch',
    customerNote: 'Fabric color is slightly warmer sand than screen preview.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
    checklist: {
      tags: true,
      clean: true,
      zeroDefect: true
    },
    timeline: [
      { step: 'In-Transit to Regional Hub', time: '24 May 13:00', actor: 'XpressBees Surface', color: 'bg-status-info' },
      { step: 'Pickup Successful from Customer', time: '23 May 12:45', actor: 'Agent R. Reddy', color: 'bg-secondary' }
    ]
  },
  {
    id: 'RET-2024-89170',
    orderRef: 'EVR-984012-CCU',
    productTitle: 'Aurelia Linen Maxi Dress',
    variant: 'Rose • Size S',
    customer: {
      name: 'Kavita Sen',
      location: 'Kolkata, WB',
      phone: '+91 98300 77123',
      upiId: 'kavita@ybl'
    },
    courier: {
      partner: 'Shadowfax',
      awb: 'REV441923',
      dockStatus: 'Delivered to Dock'
    },
    qcStatus: 'Passed Grade A',
    qcGrade: 'A',
    refundValue: 3450.00,
    settlementEngine: 'Net Banking Disbursal',
    paymentMethod: 'Net Banking',
    returnReason: 'Buyer Remorse',
    customerNote: 'Changed mind, ordering wedding gift instead.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
    checklist: {
      tags: true,
      clean: true,
      zeroDefect: true
    },
    timeline: [
      { step: 'Grade A Verification Completed', time: '24 May 14:50', actor: 'Inspector: CCU_QC_01', color: 'bg-status-success' },
      { step: 'Arrived at CCU Hub Dock 2', time: '24 May 11:15', actor: 'Shadowfax Hub Delivery', color: 'bg-primary-container' }
    ]
  }
];

export const INITIAL_INVENTORY_METRICS = {
  totalSkus: '34,820',
  totalSkusGrowth: '+4.2% active catalog',
  onHandPhysical: '482,190 pcs',
  valuation: '₹28.4 Cr',
  ats: '428,950 pcs',
  atsNote: 'Storefront & Channels Live',
  reserved: '38,420 pcs',
  reservedNote: 'Orders in pick & pack',
  criticalLow: '14 SKUs',
  criticalNote: 'Re-order point breached',
  cycleAccuracy: '99.4%',
  accuracyNote: 'Last cycle: 14:10 IST'
};

export const INITIAL_INVENTORY = [
  {
    id: 'inv-1',
    sku: 'EVR-WDR-EMR-M',
    variant: 'Size M',
    name: 'Mulberry Silk Pleated Midi',
    category: 'Dresses',
    hub: 'BLR-FC1',
    bin: 'Aisle C-12 / B4',
    onHand: 340,
    reserved: 42,
    ats: 298,
    incoming: 100,
    velocity: '28/day',
    status: 'Healthy',
    ean: '8904329104927',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_hOGjehstNKr2McVq-oxn8dkdap8sLvuH29CpViN6_NwwRINGLdZmy5r7x-810JVw-e2qPjj7xWnhHXCuEFQs8uzphWUlcDCMurr9zHM5y2CUB3qlhZ7QSP1_EriD8j4fICIHog5X3qRNF5D__mq_Csopy6qnM0G-0f4Sk_1ywyb7Gi9bslbAazCS7wVTny_IHBwstN9a4xyqIxdxkX9MsQ58YKmiPPrJqDu_deru',
    unitCost: 1450,
    sellingPrice: 3890
  },
  {
    id: 'inv-2',
    sku: 'EVR-WDR-EMR-L',
    variant: 'Size L',
    name: 'Mulberry Silk Pleated Midi',
    category: 'Dresses',
    hub: 'BLR-FC1',
    bin: 'Aisle C-12 / Bin 5',
    onHand: 18,
    reserved: 12,
    ats: 6,
    incoming: 50,
    velocity: '18/day',
    status: 'Critical Low-Stock',
    ean: '8904329104928',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OBs4UwcdT6qavXo0oEv50i-7Gpg2Jh3jzAEYYO0Ve9UfukC3uxqyIRiXpYOZG1gvrtSAClv-3PGaw6ARunEKAdgusfEh96LiHToYD1qMJJDcsCnaIl19bG0D1nwnKSGI6Yjxr3z01fY5XWgwQIHpbPNAVH_jHkhZqxEglc_KeNaZuFEUgvAMAp-rqW29xBwsejtN3K9-G6f8LBTdHzsXhXcsEtfxOahNVdBMXE50',
    unitCost: 1450,
    sellingPrice: 3890
  },
  {
    id: 'inv-3',
    sku: 'EVR-WDR-EMR-XL',
    variant: 'Size XL',
    name: 'Mulberry Silk Pleated Midi',
    category: 'Dresses',
    hub: 'BOM-FC2',
    bin: 'Aisle B-04 / Bin 2',
    onHand: 0,
    reserved: 0,
    ats: 0,
    incoming: 75,
    velocity: '12/day',
    status: 'Depleted',
    ean: '8904329104929',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_hOGjehstNKr2McVq-oxn8dkdap8sLvuH29CpViN6_NwwRINGLdZmy5r7x-810JVw-e2qPjj7xWnhHXCuEFQs8uzphWUlcDCMurr9zHM5y2CUB3qlhZ7QSP1_EriD8j4fICIHog5X3qRNF5D__mq_Csopy6qnM0G-0f4Sk_1ywyb7Gi9bslbAazCS7wVTny_IHBwstN9a4xyqIxdxkX9MsQ58YKmiPPrJqDu_deru',
    unitCost: 1450,
    sellingPrice: 3890
  },
  {
    id: 'inv-4',
    sku: 'EVR-ANK-PUR-01-S',
    variant: 'Size S',
    name: 'Anarkali Chanderi Festive Kurti',
    category: 'Ethnic Kurti',
    hub: 'BLR-FC1',
    bin: 'Aisle E-02 / A1',
    onHand: 1420,
    reserved: 110,
    ats: 1310,
    incoming: 0,
    velocity: '8/day',
    status: 'Overstocked',
    ean: '8904329105120',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
    unitCost: 980,
    sellingPrice: 2499
  },
  {
    id: 'inv-5',
    sku: 'EVR-DNM-SLM-32',
    variant: 'Size 32',
    name: 'Slim Tapered Selvedge Denim',
    category: "Men's Denim",
    hub: 'DEL-FC3',
    bin: 'Aisle D-08 / C1',
    onHand: 45,
    reserved: 25,
    ats: 20,
    incoming: 200,
    velocity: '35/day',
    status: 'Low Stock',
    ean: '8904329106033',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2USwNxP3HHn-q4oA4yeCuUTQqCEo_Nqqm_zHTV0bswOcR7TMc1_1WvOL-wnxwnxFrlBGglV_63r7rB2r3urt6H60k97LrP8J-H4tDqXDsIldmLhwZAabvNZrbZNNAbiaK_i9sfwv7HugBYUYM2sqX6aZMeWuoDvmwKkpSgwCvCMRWIi_gOLCIj-yY7Qu8RxEmUncLwCYXh4NvvOvWyptMfjzTs55G9VQlWOOQ2sjF',
    unitCost: 1250,
    sellingPrice: 3199
  },
  {
    id: 'inv-6',
    sku: 'EVR-ACT-TOP-M',
    variant: 'Size M',
    name: 'Seamless Ribbed Crop Active Tank',
    category: 'Activewear',
    hub: 'CCU-FC4',
    bin: 'Aisle A-03 / D2',
    onHand: 180,
    reserved: 15,
    ats: 165,
    incoming: 50,
    velocity: '22/day',
    status: 'Healthy',
    ean: '8904329107119',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgzFX-xgmHskXMbwCvRHdKvSgyvQ_DkA84ZnAoEyELt1wz7m1T8GyjTXVXTrEZU1_3gW2XWIvAWZjgR8mXmAnqAxRr42_U75xWzubq3-QnusLRq9hCpWtHqCOaNpckmC6SuW8DdqHI10lyukjY-6igArIysy-EJ7-bhU3uB4UJFL49XVcdORk6n7kidaUi7uRd17-hQmKq4YS71QOKwI4yuVuybOxkYb5IYiDMhhPJ',
    unitCost: 650,
    sellingPrice: 1599
  }
];

export const INITIAL_GST_METRICS = {
  grossTaxableSales: '₹4,12,84,900',
  grossGrowth: '+14.2% MoM',
  totalGstLiability: '₹49,54,188',
  avgEffectiveRate: '12.0%',
  cgst: '₹14,86,256',
  cgstStatus: 'Synced (KA - 29)',
  sgst: '₹14,86,256',
  sgstStatus: 'Matched (KA - 29)',
  igst: '₹19,81,676',
  igstDesc: 'Rest of India Dispatches',
  creditReversals: '₹3,42,810',
  itcReclaimed: '₹41,137'
};

export const INITIAL_GST_INVOICES = [
  {
    id: 'inv-gst-1',
    invoiceNumber: 'INV-2024-058912',
    type: 'B2C Retail Invoice',
    orderRef: 'EVR-984210-BLR',
    dateTime: '24 May 2024, 15:15 IST',
    customer: {
      name: 'Priyanka Sengupta',
      shortName: 'Priyanka S.',
      address: 'Flat 402, Renaissance Park, 100ft Road, Indiranagar, Bengaluru, KA - 560038',
      phone: '+91 98860 41289',
      gstin: 'Unregistered (B2C Consumer)'
    },
    shipping: {
      address: 'Everwear Fast-Delivery Hub, Indiranagar Doorstep Dispatch, Bengaluru - 560038',
      posState: 'Karnataka (State Code 29)',
      posCode: '29'
    },
    state: 'Karnataka',
    stateCode: '29',
    isIntra: true,
    posBadge: 'KA (29) • INTRA',
    hsnCode: '620442',
    hsnChapter: 'HSN 6204 (Dresses & Ensembles - 12%)',
    slab: '12%',
    taxableVal: 4366.08,
    cgst: 261.96,
    sgst: 261.96,
    igst: 0,
    total: 4890.00,
    status: 'Reconciled',
    irn: '4e8a9f4c02919d852a3b018847849e7711209381e091802931a28cb6b12f71aa',
    ackNo: '122410884920',
    ackDate: '24-05-2024 15:16',
    ewayBillNo: null,
    items: [
      {
        id: 'line-1',
        desc: 'Mulberry Silk Pleated Midi Dress (Green/M)',
        hsn: '620442',
        qty: 1,
        unitRate: 2499.11,
        taxable: 2499.11,
        rate: '12%',
        taxAmt: 299.89,
        total: 2799.00
      },
      {
        id: 'line-2',
        desc: 'High-Rise Relaxed Tencel Pant (Sand/28)',
        hsn: '620442',
        qty: 1,
        unitRate: 1866.97,
        taxable: 1866.97,
        rate: '12%',
        taxAmt: 224.03,
        total: 2091.00
      }
    ]
  },
  {
    id: 'inv-gst-2',
    invoiceNumber: 'INV-2024-058911',
    type: 'B2C Retail Invoice',
    orderRef: 'EVR-984209-BOM',
    dateTime: '24 May 2024, 14:30 IST',
    customer: {
      name: 'Karan Mehra',
      shortName: 'Karan Mehra',
      address: '7th Floor, Sea Breeze Apts, Bandra West, Mumbai, MH - 400050',
      phone: '+91 97110 59281',
      gstin: 'Unregistered (B2C Consumer)'
    },
    shipping: {
      address: 'Bandra West Courier Hub, Mumbai, MH - 400050',
      posState: 'Maharashtra (State Code 27)',
      posCode: '27'
    },
    state: 'Maharashtra',
    stateCode: '27',
    isIntra: false,
    posBadge: 'MH (27) • INTER',
    hsnCode: '620342',
    hsnChapter: 'HSN 6203 (Suits & Trousers - 12%)',
    slab: '12%',
    taxableVal: 3080.36,
    cgst: 0,
    sgst: 0,
    igst: 369.64,
    total: 3450.00,
    status: 'Reconciled',
    irn: '7a1b8c3d9021e54f893120cb9481928472910482910481029381029381029384',
    ackNo: '122410884918',
    ackDate: '24-05-2024 14:32',
    ewayBillNo: 'EWB-991204819201',
    items: [
      {
        id: 'line-3',
        desc: 'Oversized Structured Workwear Overshirt (Navy/XL)',
        hsn: '620342',
        qty: 1,
        unitRate: 3080.36,
        taxable: 3080.36,
        rate: '12%',
        taxAmt: 369.64,
        total: 3450.00
      }
    ]
  },
  {
    id: 'inv-gst-3',
    invoiceNumber: 'INV-2024-058910',
    type: 'B2C Retail Invoice',
    orderRef: 'EVR-984208-DEL',
    dateTime: '24 May 2024, 14:10 IST',
    customer: {
      name: 'Ayesha Khan',
      shortName: 'Ayesha Khan',
      address: '42 Golf Links, New Delhi, DL - 110003',
      phone: '+91 98100 23456',
      gstin: 'Unregistered (B2C Consumer)'
    },
    shipping: {
      address: '42 Golf Links, New Delhi, DL - 110003',
      posState: 'Delhi (State Code 07)',
      posCode: '07'
    },
    state: 'Delhi',
    stateCode: '07',
    isIntra: false,
    posBadge: 'DL (07) • INTER',
    hsnCode: '620442',
    hsnChapter: 'HSN 6204 (Dresses & Ensembles - 12%)',
    slab: '12%',
    taxableVal: 10035.71,
    cgst: 0,
    sgst: 0,
    igst: 1204.29,
    total: 11240.00,
    status: 'Reconciled',
    irn: '9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b',
    ackNo: '122410884912',
    ackDate: '24-05-2024 14:12',
    ewayBillNo: 'EWB-991204819188',
    items: [
      {
        id: 'line-4',
        desc: 'Everwear Artisan Silk Maxi Dress (Rose/M)',
        hsn: '620442',
        qty: 2,
        unitRate: 2499.11,
        taxable: 4998.22,
        rate: '12%',
        taxAmt: 599.78,
        total: 5598.00
      },
      {
        id: 'line-5',
        desc: 'Aurelia Linen Maxi Dress (Sand/L)',
        hsn: '620442',
        qty: 2,
        unitRate: 2518.75,
        taxable: 5037.49,
        rate: '12%',
        taxAmt: 604.51,
        total: 5642.00
      }
    ]
  },
  {
    id: 'inv-gst-4',
    invoiceNumber: 'INV-2024-058909',
    type: 'B2C Retail Invoice',
    orderRef: 'EVR-984205-BLR',
    dateTime: '24 May 2024, 13:45 IST',
    customer: {
      name: 'Rohan V.',
      shortName: 'Rohan V.',
      address: 'Plot 18, Road No. 12, Jubilee Hills, Hyderabad, TS - 500033',
      phone: '+91 99887 76655',
      gstin: 'Unregistered (B2C Consumer)'
    },
    shipping: {
      address: 'Plot 18, Road No. 12, Jubilee Hills, Hyderabad, TS - 500033',
      posState: 'Telangana (State Code 36)',
      posCode: '36'
    },
    state: 'Telangana',
    stateCode: '36',
    isIntra: false,
    posBadge: 'TS (36) • INTER',
    hsnCode: '610910',
    hsnChapter: 'HSN 6109 (Cotton Tees - 5%)',
    slab: '5%',
    taxableVal: 2094.28,
    cgst: 0,
    sgst: 0,
    igst: 104.72,
    total: 2199.00,
    status: 'Reconciled',
    irn: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    ackNo: '122410884905',
    ackDate: '24-05-2024 13:48',
    ewayBillNo: null,
    items: [
      {
        id: 'line-6',
        desc: 'Cotton Classic Crew Tee 3-Pack',
        hsn: '610910',
        qty: 1,
        unitRate: 2094.28,
        taxable: 2094.28,
        rate: '5%',
        taxAmt: 104.72,
        total: 2199.00
      }
    ]
  },
  {
    id: 'inv-gst-5',
    invoiceNumber: 'INV-2024-058908',
    type: 'B2B Commercial Invoice',
    orderRef: 'EVR-984201-BOM',
    dateTime: '24 May 2024, 12:30 IST',
    customer: {
      name: 'StyleStudio Boutique LLP',
      shortName: 'StyleStudio B2B',
      address: 'Unit 402, Trade World B, Kamala Mills, Lower Parel, Mumbai, MH - 400013',
      phone: '+91 22 4900 1234',
      gstin: '27AABCS1429E1Z8'
    },
    shipping: {
      address: 'Lower Parel Commercial Dock, Mumbai, MH - 400013',
      posState: 'Maharashtra (State Code 27)',
      posCode: '27'
    },
    state: 'Maharashtra',
    stateCode: '27',
    isIntra: false,
    posBadge: 'MH (27) • B2B',
    hsnCode: '620342',
    hsnChapter: 'HSN 6203 (Suits & Trousers - 12%)',
    slab: '12%',
    taxableVal: 84500.00,
    cgst: 0,
    sgst: 0,
    igst: 10140.00,
    total: 94640.00,
    status: 'Pending Verification',
    irn: '1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
    ackNo: '122410884890',
    ackDate: '24-05-2024 12:35',
    ewayBillNo: 'EWB-991204819210',
    items: [
      {
        id: 'line-7',
        desc: 'Bulk Wholesale: Artisan Cotton Linen Suits (Assorted 25pcs)',
        hsn: '620342',
        qty: 25,
        unitRate: 3380.00,
        taxable: 84500.00,
        rate: '12%',
        taxAmt: 10140.00,
        total: 94640.00
      }
    ]
  }
];

export const INITIAL_HSN_MASTER = [
  {
    code: '620442',
    description: "Women's dresses, skirts, divided skirts of cotton or synthetic fibres",
    rate: '12.0%',
    threshold: '12% if > ₹1,000; 5% if ≤ ₹1,000',
    chapter: 'Chapter 62 (Woven Garments)',
    activeItems: '18,420 SKUs',
    status: 'Active'
  },
  {
    code: '620342',
    description: "Men's suits, ensembles, jackets, blazers and trousers of cotton/denim",
    rate: '12.0%',
    threshold: '12% standard',
    chapter: 'Chapter 62 (Woven Garments)',
    activeItems: '9,240 SKUs',
    status: 'Active'
  },
  {
    code: '610910',
    description: 'T-shirts, singlets and other vests, knitted or crocheted of cotton',
    rate: '5.0%',
    threshold: '5% concessional standard',
    chapter: 'Chapter 61 (Knitted Garments)',
    activeItems: '5,110 SKUs',
    status: 'Active'
  },
  {
    code: '611010',
    description: 'Jerseys, pullovers, cardigans, waistcoats and similar knitted articles',
    rate: '12.0%',
    threshold: '12% standard',
    chapter: 'Chapter 61 (Knitted Garments)',
    activeItems: '1,820 SKUs',
    status: 'Active'
  },
  {
    code: '621142',
    description: 'Track suits, ski suits, activewear and swimwear',
    rate: '12.0%',
    threshold: '12% standard',
    chapter: 'Chapter 62 (Woven Garments)',
    activeItems: '230 SKUs',
    status: 'Active'
  }
];

export const INITIAL_CREDIT_NOTES = [
  {
    id: 'crn-1',
    creditNoteNo: 'CRN-2024-00124',
    invoiceRef: 'INV-2024-058410',
    customer: 'Varun Kapoor',
    state: 'Delhi (07)',
    amount: 3199.00,
    taxCredit: 342.75,
    reason: 'Size Return Grade A Restock',
    date: '24 May 2024, 11:20 IST',
    status: 'Disbursed'
  },
  {
    id: 'crn-2',
    creditNoteNo: 'CRN-2024-00123',
    invoiceRef: 'INV-2024-057912',
    customer: 'Ananya Roy',
    state: 'Karnataka (29)',
    amount: 1890.00,
    taxCredit: 202.50,
    reason: 'Doorstep QC Fabric Pull Defect',
    date: '23 May 2024, 16:45 IST',
    status: 'Adjusted in GSTR-1'
  },
  {
    id: 'crn-3',
    creditNoteNo: 'CRN-2024-00122',
    invoiceRef: 'INV-2024-057880',
    customer: 'Sneha Patel',
    state: 'Gujarat (24)',
    amount: 4890.00,
    taxCredit: 523.92,
    reason: 'Wrong Colorway Shipped (Warehouse Error)',
    date: '22 May 2024, 09:15 IST',
    status: 'Disbursed'
  }
];

export const INITIAL_EWAY_BILLS = [
  {
    id: 'ewb-1',
    ewayBillNo: '9912 0481 9201',
    invoiceNo: 'INV-2024-058911',
    validUntil: '25 May 2024, 23:59 IST',
    transporter: 'BlueDart Express (BLURAY)',
    vehicleNo: 'KA-04-MA-8821',
    fromGstin: '29AAAAE1234F1Z5 (BLR-FC1)',
    toGstin: '27AAAAE1234F1Z3 (Mumbai DC)',
    distance: '984 km',
    status: 'Active in Transit'
  },
  {
    id: 'ewb-2',
    ewayBillNo: '9912 0481 9188',
    invoiceNo: 'INV-2024-058910',
    validUntil: '26 May 2024, 18:00 IST',
    transporter: 'Delhivery Surface Logistics',
    vehicleNo: 'DL-01-AB-4412',
    fromGstin: '29AAAAE1234F1Z5 (BLR-FC1)',
    toGstin: '07AAAAE1234F1Z1 (DEL-FC3 Hub)',
    distance: '2,150 km',
    status: 'Dispatched'
  },
  {
    id: 'ewb-3',
    ewayBillNo: '9912 0481 9210',
    invoiceNo: 'INV-2024-058908',
    validUntil: '27 May 2024, 12:00 IST',
    transporter: 'Gati KWE Freight',
    vehicleNo: 'MH-12-Q-9901',
    fromGstin: '29AAAAE1234F1Z5 (BLR-FC1)',
    toGstin: '27AABCS1429E1Z8 (StyleStudio B2B)',
    distance: '1,012 km',
    status: 'Generated'
  }
];

export const INITIAL_ANALYTICS_DATA = {
  kpis: {
    gmv: '₹4,82,49,200',
    gmvGrowth: '+18.4%',
    netRevenue: '₹3,94,18,050',
    netRealizationRate: '81.7%',
    contributionMargin: '41.8%',
    marginDelta: '+2.1%',
    returnRate: '18.3%',
    returnDelta: '-1.4%',
    cac: '₹642',
    ltvCac: '4.8x'
  },
  monthlyData: [
    { month: 'Dec', gross: 3.8, returns: 0.8, logistics: 0.3, net: 2.7 },
    { month: 'Jan', gross: 4.1, returns: 0.9, logistics: 0.4, net: 2.8 },
    { month: 'Feb', gross: 3.9, returns: 0.7, logistics: 0.3, net: 2.9 },
    { month: 'Mar', gross: 4.4, returns: 0.8, logistics: 0.4, net: 3.2 },
    { month: 'Apr', gross: 4.6, returns: 0.9, logistics: 0.4, net: 3.3 },
    { month: 'May (Active)', gross: 4.82, returns: 0.88, logistics: 0.42, net: 3.94 }
  ],
  categoryShare: [
    { name: 'Mulberry Silk Dresses', share: 38.4, value: '₹1.85 Cr', color: 'bg-primary' },
    { name: 'Artisan Festive Kurtis', share: 26.2, value: '₹1.26 Cr', color: 'bg-fashion-magenta' },
    { name: "Men's Selvedge Denim", share: 19.5, value: '₹94.1 L', color: 'bg-status-info' },
    { name: 'Activewear & Loungewear', share: 15.9, value: '₹76.7 L', color: 'bg-status-warning' }
  ],
  channelAttribution: [
    { channel: 'Everwear iOS Native App', gmv: '₹2,12,29,648', orders: 43210, aov: '₹4,913', margin: '48.2%', returns: '14.2%', cac: '₹420' },
    { channel: 'Everwear Web Storefront', gmv: '₹1,44,74,760', orders: 31800, aov: '₹4,551', margin: '44.6%', returns: '17.8%', cac: '₹580' },
    { channel: 'Myntra Luxe Brand Mall', gmv: '₹67,54,888', orders: 15400, aov: '₹4,386', margin: '34.2%', returns: '24.1%', cac: '₹920' },
    { channel: 'Nykaa Fashion Premium', gmv: '₹38,59,936', orders: 8900, aov: '₹4,337', margin: '36.8%', returns: '21.4%', cac: '₹840' },
    { channel: 'Tata CLiQ Luxury', gmv: '₹19,29,968', orders: 3800, aov: '₹5,078', margin: '38.4%', returns: '18.9%', cac: '₹790' }
  ],
  returnReasons: [
    { reason: 'Size & Fit Calibration Mismatch', share: 42.4, impact: '₹37.3 L', trend: '-2.1%' },
    { reason: 'Fabric Handfeel / Transparency Expectation', share: 24.1, impact: '₹21.2 L', trend: '+0.4%' },
    { reason: 'Colorway Calibration from Digital Screen', share: 18.2, impact: '₹16.0 L', trend: '-1.8%' },
    { reason: 'Courier SLA Delay (>72h delivery)', share: 15.3, impact: '₹13.5 L', trend: '-4.2%' }
  ],
  topSkus: [
    { sku: 'EVR-WDR-EMR-01', name: 'Mulberry Silk Pleated Midi', category: 'Dresses', unitsSold: 4820, gmv: '₹1.87 Cr', margin: '62.4%', returnRate: '11.2%', status: 'Champion' },
    { sku: 'EVR-ANK-PUR-01', name: 'Anarkali Chanderi Festive Kurti', category: 'Ethnic', unitsSold: 3410, gmv: '₹85.2 L', margin: '58.1%', returnRate: '12.8%', status: 'Champion' },
    { sku: 'EVR-DNM-SLM-02', name: 'Raw Selvedge Japanese Denim', category: 'Denim', unitsSold: 1890, gmv: '₹60.4 L', margin: '48.9%', returnRate: '16.4%', status: 'Stable' },
    { sku: 'EVR-DRS-LNN-09', name: 'Oversized Breathable Linen Shift', category: 'Dresses', unitsSold: 940, gmv: '₹28.2 L', margin: '38.2%', returnRate: '28.6%', status: 'At Risk' },
    { sku: 'EVR-TOP-SLK-04', name: 'Bias-Cut Silk Cami Top', category: 'Tops', unitsSold: 620, gmv: '₹12.4 L', margin: '32.1%', returnRate: '32.4%', status: 'At Risk' }
  ]
};

export const INITIAL_PAYMENTS_DATA = {
  kpis: {
    totalSettled: '₹3,41,88,410',
    settledRatio: '99.8% Auto-Reconciled',
    inTransit: '₹18,42,190',
    inTransitNote: 'Expected T+2 Banking',
    codRemittances: '₹12,49,200',
    codNote: 'BlueDart & Delhivery',
    mdrFees: '₹6,83,768',
    avgMdr: '2.0% Effective',
    discrepancies: '₹14,820',
    discrepanciesCount: '3 Exceptions'
  },
  gateways: [
    { id: 'gw-1', name: 'Razorpay PG', channels: 'UPI, RuPay & Cards', settledToday: '₹1,94,20,400', feeRate: '1.85%', uptime: '99.98%', status: 'Optimal' },
    { id: 'gw-2', name: 'PayU Enterprise', channels: 'NetBanking & EMI', settledToday: '₹88,14,200', feeRate: '2.10%', uptime: '99.95%', status: 'Optimal' },
    { id: 'gw-3', name: 'Cashfree Disbursals', channels: 'Instant UPI Refunds', settledToday: '₹41,20,910', feeRate: '₹3/tx', uptime: '100%', status: 'Optimal' },
    { id: 'gw-4', name: 'Stripe Global', channels: 'International USD/GBP', settledToday: '₹18,32,900', feeRate: '3.40%', uptime: '99.99%', status: 'Optimal' }
  ],
  settlementRecords: [
    { id: 'stl-1', utr: 'UTR-HDFC-99120481', gateway: 'Razorpay PG', orderRef: 'EVR-984210-BLR', gross: 4890.00, mdr: 90.46, gstOnMdr: 16.28, net: 4783.26, bankAc: 'HDFC ••4920', cycle: 'T+1 (24 May)', status: 'Matched' },
    { id: 'stl-2', utr: 'UTR-ICIC-88410291', gateway: 'PayU Enterprise', orderRef: 'EVR-984209-BOM', gross: 3450.00, mdr: 72.45, gstOnMdr: 13.04, net: 3364.51, bankAc: 'ICICI ••1024', cycle: 'T+1 (24 May)', status: 'Matched' },
    { id: 'stl-3', utr: 'UTR-AXIS-77401928', gateway: 'Razorpay PG', orderRef: 'EVR-984208-DEL', gross: 11240.00, mdr: 207.94, gstOnMdr: 37.43, net: 10994.63, bankAc: 'HDFC ••4920', cycle: 'T+1 (24 May)', status: 'Matched' },
    { id: 'stl-4', utr: 'PENDING-T2-004', gateway: 'Razorpay PG', orderRef: 'EVR-984205-BLR', gross: 2199.00, mdr: 40.68, gstOnMdr: 7.32, net: 2151.00, bankAc: 'HDFC ••4920', cycle: 'T+2 Clearing', status: 'In-Transit' },
    { id: 'stl-5', utr: 'UTR-STRP-11029381', gateway: 'Stripe Global', orderRef: 'EVR-INT-99014-DXB', gross: 24890.00, mdr: 846.26, gstOnMdr: 152.33, net: 23891.41, bankAc: 'Citi ••8810', cycle: 'T+3 Forex', status: 'Matched' }
  ],
  codRemittances: [
    { carrier: 'BlueDart Express', collected: 784200, remitted: 784200, inTransit: 0, cycle: 'Weekly Tuesday', status: 'Cleared' },
    { carrier: 'Delhivery Surface', collected: 342100, remitted: 300000, inTransit: 42100, cycle: 'Daily Bi-hourly', status: 'In-Transit' },
    { carrier: 'XpressBees Logistics', collected: 122900, remitted: 122900, inTransit: 0, cycle: 'Weekly Wednesday', status: 'Cleared' }
  ]
};

export const INITIAL_PURCHASE_ORDERS = {
  kpis: {
    activeCommitments: '₹1,48,92,400',
    ordersCount: '14 Active POs',
    inboundUnits: '48,200 pcs',
    inboundNote: 'Expected this week',
    onTimeSla: '96.4%',
    onTimeGrowth: '+1.8% Vendor SLA',
    pendingQc: '3 Batches',
    pendingQcNote: '6,400 pcs in QC dock',
    invoicesDue: '₹42,10,000',
    invoicesDueNote: 'Payment in 7 days'
  },
  orders: [
    {
      id: 'PO-2024-8841',
      supplier: 'Arvind Luxury Textiles Ltd',
      origin: 'Ahmedabad, Gujarat',
      category: 'Mulberry Silk 19mm',
      units: 12000,
      value: 4890000,
      targetHub: 'BLR-FC1 (Bengaluru)',
      deliveryDate: '28 May 2024',
      status: 'In-Transit Dock',
      progress: 85,
      items: [
        { name: '100% Mulberry Silk Fabric Bolt (Emerald Green)', code: 'FAB-SLK-EMR', qty: 6000, rate: 450, total: 2700000 },
        { name: '100% Mulberry Silk Fabric Bolt (Dusty Rose)', code: 'FAB-SLK-ROS', qty: 6000, rate: 365, total: 2190000 }
      ],
      timeline: [
        { title: 'Fabric Mill Batch Sourced', date: '10 May 2024', done: true },
        { title: 'Dyeing & Weave Laboratory Certified', date: '16 May 2024', done: true },
        { title: 'Dedicated Freight In-Transit to Bengaluru', date: '22 May 2024', done: true },
        { title: 'Dock Staging & GRN Barcode Scan', date: 'Expected 28 May', done: false }
      ]
    },
    {
      id: 'PO-2024-8840',
      supplier: 'Vardhman Yarns & Threads Ltd',
      origin: 'Ludhiana, Punjab',
      category: 'Supima Cotton Combed',
      units: 18000,
      value: 3960000,
      targetHub: 'DEL-FC3 (NCR)',
      deliveryDate: '02 June 2024',
      status: 'In Production',
      progress: 60,
      items: [
        { name: 'Organic Supima Cotton Knitted Jersey (220 GSM)', code: 'FAB-SUP-WHT', qty: 10000, rate: 220, total: 2200000 },
        { name: 'Organic Supima Cotton Knitted Jersey (Charcoal)', code: 'FAB-SUP-CHR', qty: 8000, rate: 220, total: 1760000 }
      ],
      timeline: [
        { title: 'Spinning Mill Yarn Procured', date: '12 May 2024', done: true },
        { title: 'High-Density Circular Knitting', date: '20 May 2024', done: true },
        { title: 'Color Fastness Testing Batch A', date: '25 May 2024', done: false },
        { title: 'Freight Dispatch to NCR DC', date: 'Expected 31 May', done: false }
      ]
    },
    {
      id: 'PO-2024-8839',
      supplier: 'Raymond Linen Heritage Works',
      origin: 'Thane, Maharashtra',
      category: 'Pure French Flax Linen',
      units: 8500,
      value: 3400000,
      targetHub: 'BOM-FC2 (Mumbai)',
      deliveryDate: '25 May 2024',
      status: 'QC Inspection',
      progress: 95,
      items: [
        { name: 'Natural French Flax Linen (Oatmeal)', code: 'FAB-LNN-OAT', qty: 5000, rate: 400, total: 2000000 },
        { name: 'Natural French Flax Linen (Sage Olive)', code: 'FAB-LNN-OLV', qty: 3500, rate: 400, total: 1400000 }
      ],
      timeline: [
        { title: 'Raw Flax Inbound Sourced', date: '02 May 2024', done: true },
        { title: 'Pre-Wash Softening Finished', date: '14 May 2024', done: true },
        { title: 'Arrived at Mumbai Dock Bay 4', date: '24 May 2024', done: true },
        { title: 'QC Shrinkage Laboratory Approval', date: 'Ongoing (95%)', done: false }
      ]
    },
    {
      id: 'PO-2024-8838',
      supplier: 'Kurabo Denim Mills & Weavers',
      origin: 'Okayama, Japan / India Sub',
      category: '14oz Raw Selvedge Denim',
      units: 5000,
      value: 2642400,
      targetHub: 'BLR-FC1 (Bengaluru)',
      deliveryDate: '10 June 2024',
      status: 'Fabric Sourced',
      progress: 30,
      items: [
        { name: '14oz Indigo Warp Raw Selvedge Shuttle-Loomed', code: 'DEN-RAW-14OZ', qty: 5000, rate: 528.48, total: 2642400 }
      ],
      timeline: [
        { title: 'Indigo Vat Dyeing & Shuttle Looming', date: '18 May 2024', done: true },
        { title: 'Air Cargo Clearance Chennai Port', date: 'Pending', done: false },
        { title: 'Inbound Delivery to BLR Hub', date: 'Expected 10 June', done: false }
      ]
    }
  ]
};


// ==========================================
// CENTRALIZED CUSTOMER & VIP LOYALTY DATA
// ==========================================
export const customerList = [
    {
      id: 'cust-1',
      name: 'Meera Singhania',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-Vj2fXB23U0Jx__Wtk6zRYcNSj1alSla_deXv5wsJiM5M5Mo0ejcEDtDllaYYs9SL1jR6XFUcXRpA7wxJIFJZwtjEW9s0IdHTJPe0WD9C_k5m9GNYAtCc97QT_tiMxtAMbA7oUi-1716Y8spz3cPAAMzVEPfZdx5vkeq5MhYsSD16eZBwI4QHYp1Wy1gLT7QoZ0vHIXeUgaHXRWwJkLhyn6yuWYYQF7i0s1SBkwUI',
      heroAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVUfT8RJ9YOcNfTY7zaRCXkIgAHesCMjJkXfK5h0AF_Fh5IezEUBd2X71MwthMR_NdXpsV7BrrMwwCOR1K6vAVQv5G6UHS48rmcvsYwbDj1kLWDf1XaXYBfqQpDPXkys4WQSNpCJAEHfNx5AjcCRQ_kSMlkjyY8MnmPS_B1mEakJSSkaT8RMhW64CMQ8SpV4S5Tpa4E4ZrT5Y2IyS6LfPCH-2EK6M3HGtMq3xEydVd',
      tier: 'VIP COUTURE',
      tierBadge: 'bg-primary-container text-white',
      badgeIcon: 'diamond',
      idBadge: 'GSTIN Verified • ID #EW-9941',
      email: 'meera.s***@everwear.vip',
      phone: '+91 98201 *****',
      geo: 'Mumbai, MH (400050)',
      address: 'Pali Hill, Bandra (W), Mumbai',
      birthday: 'Nov 12',
      tenure: 'Customer since Oct 2021 (3.2 yrs)',
      gmv: '₹2,48,900',
      ordersCount: '28 Delivered Orders',
      aov: '₹8,889',
      returnRate: '4.2% (Low)',
      returnRateColor: 'text-status-success',
      points: '24,800 Pts',
      pointsValue: 'Worth ₹2,480',
      storeCredit: '₹0.00',
      openReturns: 'No open returns',
      lastActive: '14m ago',
      lastActiveSub: 'Order #EW-892401',
      isOnline: true,
      rfmScore: 'Score: 5-5-5 (Champion)',
      recency: '14m',
      recencySub: 'Active today',
      frequency: '28',
      frequencySub: 'Top 0.5% cohort',
      monetary: '₹2.48L',
      monetarySub: '99.8th percentile',
      favCategory: "Women's Festive Ethnic & Pure Silk",
      kurtaSize: 'M',
      blouseSize: '38',
      textiles: 'Chanderi, Mulberry Silk, Organza',
      discountPrivilege: '15% VIP Auto-applied at checkout',
      recentOrders: [
        {
          id: 'Order #EW-892401',
          status: 'Processing',
          statusColor: 'bg-status-info-bg text-status-info',
          amount: '₹18,450',
          title: 'Chanderi Silk Anarkali Suit • Size M',
          subtitle: 'Plucked for dispatch from BLR-FC1 • Ordered 14m ago',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmOduPWm3mgSab-_36yG-1ztghfVBjw9IVHp8BQ1q4HJJUosxmjOsB28VC_sQb2lBC5TsiIre7wpC336xgerjB-QGxSksSwgqst1t-96_RDnz8Vd-YMSlxK3JcVMh1Dov38ZUNo7fDlM75c31--mEGxU8pweh5Vi-MzICAs5zqcDnRXVL-z1vZ2YhBMY6lpEzNRs2EbWMX8CqqDDtGeeP3_ke6jLpSFj0Ja_Xf4EbH'
        },
        {
          id: 'Order #EW-874109',
          status: 'Delivered',
          statusColor: 'bg-status-success-bg text-status-success',
          amount: '₹24,900',
          title: 'Mulberry Silk Royal Plum Saree',
          subtitle: 'Delivered May 12 • 0 Returns logged',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArgXJbcnEtsjc8qj7F9gl1VzVSIQm7zTHB_N7r1xCqryiEKza9nW4W-IIv4NmbMmxjxEyvRkzuNFlYIs__xnUj7TDchXJUQtlPFqCZ7cFQ3Oux_cs42SWm5S0ii_PxIWNJ2WbwfIufnafDvdElUWESgxdKHwyaTcn7LqH5q8eQciGxezsjIXvcfPg90VJRkGKSyWDUI3VOmd0Og_bf-arKiJjP-dRMkC6ZT9o_m5Ya'
        }
      ],
      conciergeNote: '"Client prefers expedited Saturday morning delivery window. White-glove packaging requested without price tags for gifted items."',
      conciergeStylist: 'Stylist Tara S.',
      offlineVisits: 'Customer visited the Mumbai Flagship Atelier (Kala Ghoda) 3 times this quarter with in-store billing synchronized to profile.',
      spendSplit: '68% App / 32% Flagship'
    },
    {
      id: 'cust-2',
      name: 'Raghavan Iyer',
      initials: 'RI',
      tier: 'Gold Atelier',
      tierBadge: 'bg-status-warning-bg text-status-warning',
      idBadge: 'Loyalty ID #EW-7812',
      email: 'r.iyer***@gmail.com',
      phone: '+91 99401 *****',
      geo: 'Bengaluru, KA (560038)',
      address: 'Indiranagar 100ft Road, Bengaluru',
      birthday: 'Feb 19',
      tenure: 'Customer since Aug 2022 (1.8 yrs)',
      gmv: '₹94,500',
      ordersCount: '14 Delivered Orders',
      aov: '₹6,750',
      returnRate: '7.1% Return',
      returnRateColor: 'text-text-secondary',
      points: '9,450 Pts',
      pointsValue: 'Worth ₹945',
      storeCredit: '₹0.00',
      openReturns: 'No open returns',
      lastActive: '42s ago',
      lastActiveSub: 'Wishlist Update',
      isOnline: false,
      rfmScore: 'Score: 4-4-4 (Loyal Customer)',
      recency: '42s',
      recencySub: 'Active now',
      frequency: '14',
      frequencySub: 'Top 5% cohort',
      monetary: '₹94.5K',
      monetarySub: '92nd percentile',
      favCategory: 'Men Sartorial Linen & Sherwani Jackets',
      kurtaSize: 'L (40)',
      blouseSize: 'N/A',
      textiles: 'Belgian Linen, Raw Silk, Egyptian Cotton',
      discountPrivilege: '10% Gold Auto-applied at checkout',
      recentOrders: [
        {
          id: 'Order #EW-884120',
          status: 'Delivered',
          statusColor: 'bg-status-success-bg text-status-success',
          amount: '₹14,200',
          title: 'Tailored Irish Linen Kurta Set',
          subtitle: 'Delivered May 18 • 0 Returns',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmOduPWm3mgSab-_36yG-1ztghfVBjw9IVHp8BQ1q4HJJUosxmjOsB28VC_sQb2lBC5TsiIre7wpC336xgerjB-QGxSksSwgqst1t-96_RDnz8Vd-YMSlxK3JcVMh1Dov38ZUNo7fDlM75c31--mEGxU8pweh5Vi-MzICAs5zqcDnRXVL-z1vZ2YhBMY6lpEzNRs2EbWMX8CqqDDtGeeP3_ke6jLpSFj0Ja_Xf4EbH'
        }
      ],
      conciergeNote: '"Prefers muted earthy tones. Requests dry-clean instructions and custom garment bags."',
      conciergeStylist: 'Stylist Rohan M.',
      offlineVisits: 'Visited Indiranagar Brand Studio twice this quarter for sizing trials.',
      spendSplit: '85% App / 15% Studio'
    },
    {
      id: 'cust-3',
      name: 'Priyanka Sengupta',
      initials: 'PS',
      tier: 'Gold Atelier',
      tierBadge: 'bg-status-warning-bg text-status-warning',
      idBadge: 'Loyalty ID #EW-6529',
      email: 'p.sengupta***@yahoo.in',
      phone: '+91 98302 *****',
      geo: 'Kolkata, WB (700029)',
      address: 'Southern Avenue, Kolkata',
      birthday: 'Jul 24',
      tenure: 'Customer since Jan 2023 (1.4 yrs)',
      gmv: '₹68,200',
      ordersCount: '11 Delivered Orders',
      aov: '₹6,200',
      returnRate: '9.0% Return',
      returnRateColor: 'text-text-secondary',
      points: '6,800 Pts',
      pointsValue: 'Worth ₹680',
      storeCredit: '₹680.00',
      openReturns: '1 in exchange review',
      lastActive: 'Today, 11:20 AM',
      lastActiveSub: 'Cart Abandoned (3 items)',
      isOnline: false,
      rfmScore: 'Score: 4-3-4 (Potential VIP)',
      recency: '4h ago',
      recencySub: 'Session recorded',
      frequency: '11',
      frequencySub: 'Top 10% cohort',
      monetary: '₹68.2K',
      monetarySub: '88th percentile',
      favCategory: 'Handloom Sarees & Handcrafted Stoles',
      kurtaSize: 'S (36)',
      blouseSize: '36',
      textiles: 'Jamdani, Mulberry Silk, Matka Silk',
      discountPrivilege: '10% Gold Auto-applied at checkout',
      recentOrders: [
        {
          id: 'Order #EW-864102',
          status: 'Delivered',
          statusColor: 'bg-status-success-bg text-status-success',
          amount: '₹12,400',
          title: 'Fine Bengal Jamdani Pure Silk Saree',
          subtitle: 'Delivered Apr 29 • Perfect fit',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArgXJbcnEtsjc8qj7F9gl1VzVSIQm7zTHB_N7r1xCqryiEKza9nW4W-IIv4NmbMmxjxEyvRkzuNFlYIs__xnUj7TDchXJUQtlPFqCZ7cFQ3Oux_cs42SWm5S0ii_PxIWNJ2WbwfIufnafDvdElUWESgxdKHwyaTcn7LqH5q8eQciGxezsjIXvcfPg90VJRkGKSyWDUI3VOmd0Og_bf-arKiJjP-dRMkC6ZT9o_m5Ya'
        }
      ],
      conciergeNote: '"High interest in Jamdani drop. Re-engage on abandoned cart with styling lookbook."',
      conciergeStylist: 'Stylist Tara S.',
      offlineVisits: 'Visited Park Street Experience Centre for private consultation.',
      spendSplit: '70% App / 30% Flagship'
    },
    {
      id: 'cust-4',
      name: 'Devendra Sen',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5rsdPOwMRFqw5rwyG1p0SU4nZMc60S7FrjBV7J3OqVKFdeYYVUWnqgMz3ynroBiPPDZNMuTl95rvUKY5o_3F9vDuW4rSwMcWQs6po6qS0ZzFRjPfO3fMP1CrGak3UExp6qcPpWmitnZaqFFC9H2OnQe9vYUzFqwpAhNupOtf3Uo-QU16mL1LoZdJPP5WA7qq-2IlRW1qPcFziOaAuC6ZO5iZGp1mVUGYSZZ8-vDtV',
      heroAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5rsdPOwMRFqw5rwyG1p0SU4nZMc60S7FrjBV7J3OqVKFdeYYVUWnqgMz3ynroBiPPDZNMuTl95rvUKY5o_3F9vDuW4rSwMcWQs6po6qS0ZzFRjPfO3fMP1CrGak3UExp6qcPpWmitnZaqFFC9H2OnQe9vYUzFqwpAhNupOtf3Uo-QU16mL1LoZdJPP5WA7qq-2IlRW1qPcFziOaAuC6ZO5iZGp1mVUGYSZZ8-vDtV',
      tier: 'VIP COUTURE',
      tierBadge: 'bg-primary-container text-white',
      badgeIcon: 'diamond',
      idBadge: 'HNW Cohort • ID #EW-4401',
      email: 'dev.sen***@rediffmail.com',
      phone: '+91 98310 *****',
      geo: 'Kolkata, WB (700019)',
      address: 'Ballygunge Circular Road, Kolkata',
      birthday: 'Sep 08',
      tenure: 'Customer since Jun 2020 (4.1 yrs)',
      gmv: '₹3,12,000',
      ordersCount: '34 Delivered Orders',
      aov: '₹9,176',
      returnRate: '5.8% (Low)',
      returnRateColor: 'text-status-success',
      points: '31,200 Pts',
      pointsValue: 'Worth ₹3,120',
      storeCredit: '₹0.00',
      openReturns: 'No open returns',
      lastActive: '2m ago',
      lastActiveSub: 'Concierge chat logged',
      isOnline: true,
      rfmScore: 'Score: 5-5-5 (Champion Patron)',
      recency: '2m',
      recencySub: 'Live on Concierge',
      frequency: '34',
      frequencySub: 'Top 0.2% cohort',
      monetary: '₹3.12L',
      monetarySub: '99.9th percentile',
      favCategory: 'Bespoke Bandhgalas & Pashmina Shawls',
      kurtaSize: 'XL (44)',
      blouseSize: 'N/A',
      textiles: 'Pashmina, Kashmiri Tweed, Mulberry Brocade',
      discountPrivilege: '15% VIP Auto-applied at checkout',
      recentOrders: [
        {
          id: 'Order #EW-889104',
          status: 'Processing',
          statusColor: 'bg-status-info-bg text-status-info',
          amount: '₹42,500',
          title: 'Charcoal Bespoke Hand-stitched Bandhgala',
          subtitle: 'Tailored at BLR Atelier • Dispatching today',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmOduPWm3mgSab-_36yG-1ztghfVBjw9IVHp8BQ1q4HJJUosxmjOsB28VC_sQb2lBC5TsiIre7wpC336xgerjB-QGxSksSwgqst1t-96_RDnz8Vd-YMSlxK3JcVMh1Dov38ZUNo7fDlM75c31--mEGxU8pweh5Vi-MzICAs5zqcDnRXVL-z1vZ2YhBMY6lpEzNRs2EbWMX8CqqDDtGeeP3_ke6jLpSFj0Ja_Xf4EbH'
        }
      ],
      conciergeNote: '"Patron celebrating milestone wedding anniversary. Custom monogramming on coat lining confirmed."',
      conciergeStylist: 'Stylist Vikram K.',
      offlineVisits: 'Visited Kolkata Luxury Suite for master tailor measurements.',
      spendSplit: '55% App / 45% Suite'
    },
    {
      id: 'cust-5',
      name: 'Tanya Kapoor',
      initials: 'TK',
      tier: 'New Shopper',
      tierBadge: 'bg-surface-subtle text-text-secondary',
      idBadge: 'First Purchase • ID #EW-9912',
      email: 'kapoortanya***@outlook.com',
      phone: '+91 98112 *****',
      geo: 'Delhi, NCR (110024)',
      address: 'Defence Colony, New Delhi',
      birthday: 'Dec 03',
      tenure: 'Customer since May 2024 (12 days)',
      gmv: '₹4,290',
      ordersCount: '1 Delivered Order',
      aov: '₹4,290',
      returnRate: '0.0% Return',
      returnRateColor: 'text-status-success',
      points: '429 Pts',
      pointsValue: 'Worth ₹42.9',
      storeCredit: '₹0.00',
      openReturns: 'No open returns',
      lastActive: '1m ago',
      lastActiveSub: 'Welcome Email Opened',
      isOnline: false,
      rfmScore: 'Score: 5-1-2 (Promising New)',
      recency: '1m',
      recencySub: 'Email opened',
      frequency: '1',
      frequencySub: 'First order cohort',
      monetary: '₹4.29K',
      monetarySub: 'New customer baseline',
      favCategory: 'Contemporary Fusion Kurtis & Palazzos',
      kurtaSize: 'S (36)',
      blouseSize: '34',
      textiles: 'Organic Mulmul, Combed Cotton',
      discountPrivilege: 'Welcome voucher applied (SILKFIRST)',
      recentOrders: [
        {
          id: 'Order #EW-894102',
          status: 'Delivered',
          statusColor: 'bg-status-success-bg text-status-success',
          amount: '₹4,290',
          title: 'Indigo Block Printed Mulmul Kurta Set',
          subtitle: 'Delivered 3 days ago • Zero complaints',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArgXJbcnEtsjc8qj7F9gl1VzVSIQm7zTHB_N7r1xCqryiEKza9nW4W-IIv4NmbMmxjxEyvRkzuNFlYIs__xnUj7TDchXJUQtlPFqCZ7cFQ3Oux_cs42SWm5S0ii_PxIWNJ2WbwfIufnafDvdElUWESgxdKHwyaTcn7LqH5q8eQciGxezsjIXvcfPg90VJRkGKSyWDUI3VOmd0Og_bf-arKiJjP-dRMkC6ZT9o_m5Ya'
        }
      ],
      conciergeNote: '"Triggered welcome onboarding sequence. Next touchpoint: 14-day re-engagement offer."',
      conciergeStylist: 'Automated Bot (Everwear AI)',
      offlineVisits: 'Online customer only so far.',
      spendSplit: '100% App / 0% Offline'
    }
  ];
export const INITIAL_CUSTOMERS = customerList;

// ==========================================
// CENTRALIZED CATEGORIES & DROPS DATA
// ==========================================
export const collectionsData = [
    {
      id: 'col-1',
      code: '#COL-2024-FEST-09',
      title: 'Festive Velvet & Zari Atelier 2024',
      badge: '● Live Active',
      badgeType: 'success',
      tag: 'Hero',
      skusCount: 48,
      priceRange: '₹4,990 – ₹38,500',
      ruleText: 'Smart Merch: Margin >60% Boost',
      ruleIcon: 'bolt',
      gmv: '₹84.20 L',
      gmvSub: '+28.4% vs target',
      gmvSubColor: 'text-status-success',
      cvrAov: '3.8% · ₹5,420',
      channelsText: 'App + Web Hero',
      season: "Festive Atelier '24",
      status: 'Live Active',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqciG8MVPGU04nhfLvqGVtOf2e5hPfIABPZC3kbT2Z9Dz6OW6irmKUEEHAgMyd_A7Etfx_Ie6rrqF5bKDhTziXnWY6jWOt7TR4HZgcWmd717RHa3jqCzvdiFsBySVF2jK9-vK7g6ADS_LH_CttcHCokkm-Ft5Xd3Cn0CmIn2U7K3JHt-YuJC8wk4ZaMI0WphmDuCIkj2UHSx3u1msoXYZE9AhiUjjSwFhCFLKJyaJx',
      heroBanner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAG1H7H4Ffuf_Fe-Wg9TDjGQ1AwgTV6hv-7Px_hIZexA_YWtW1EmCKum8N9IemQgrDr24XAZ8QHzZRYkpRY28pYqGy2sOG_qKi3JEV5SU6WGPuHQpUHwA6ICWh7aPl8Rkl8Ci_nYNiBjX5HU80Byibm7GIZR9MheqY9DjbIAHYp4JtI-RBH-EzFp_ywKNDnYSqC1dLbulNjQRtCcBmRDOXqV-i69Buna3SGqKvQjLOq',
      heroBannerTitle: 'Velvet & Zari Atelier ’24',
      heroBannerSub: 'Active on Mobile App Slot A & Web Main Carousel',
      engineVersion: 'v3.4 Engine',
      algoTitle: 'Margin-Maximized Dynamic Re-ranking',
      algoDesc: 'Auto-elevates items with Gross Margin >55% and Warehouse Inventory >15 units. Blends 15% CTR boost for viral social engagement.',
      marginWeight: 60,
      velocityWeight: 25,
      freshnessWeight: 15,
      pinnedItems: [
        {
          slot: 1,
          name: 'Mulberry Silk Anarkali',
          price: '₹18,490',
          margin: 'Margin 68%',
          stock: 'Stock: 42 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3KhS5VafOPDC7hd0roiLRG7W5ajSi0IeXaYsaEjUfR0CQ3AOUnNWwbXWoQj8NNdT7EYp0xDPYy-bc5a7D1SE8rag1A5U3gnknzSJz6LBDteq_fxQ3Ks4SPDAuxUd_BC8COmIkgqujNH4Haw2z34QX0X3sqm0gkK6XQaaiX-t5NYIL12DKy-2W0Of0J_YiYEyrRGw1lL3m7XRnXXYsfsvJPKJNM10n6Mi5ELvbkn_2'
        },
        {
          slot: 2,
          name: 'Embroidered Velvet Sherwani',
          price: '₹34,200',
          margin: 'Margin 72%',
          stock: 'Stock: 19 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnmyP0TD53tTFQrIThQxePi5p4FjLQ4KORfoYU82pN6in9htNqdbMYzyhaB8jg4XstbbmBpOQQbVtzqzy82DhQmFNR5lpup7upd9V8QGs0evYFcVOxmOIgzs4nw9bboSu5bOAMfw2hdVpczJntwWxDaYLNpZA0IM5gGh19UIxXu8h4vn6flA0WrpwjYS3FN2QGR2bznXCQsbFnFMMz2NrbLXzAQfOltb_o3Pib8vnu'
        },
        {
          slot: 3,
          name: 'Banarasi Zari Dupatta',
          price: '₹8,990',
          margin: 'Margin 62%',
          stock: 'Stock: 88 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGeroVKkNg-ymzVJriukxnVpghBZun7IoDkWz8jCGLGAYuYKGVTWJxANvpxQ9ZX2H7PaAJ0FcmhmrmOgrJnC_zVMW7NOy4t6ki39lyHtiaobTFjM_rmQSwpQZ-foC_J1CShGO7gW-aZslUN5QSbJQibhMx5xOVZXjrH58zwQo7wz618QFqdY8XP6nWEiuJc2yrDOME86BiVLVFO4q4km2uIGDRPo9ntNxhzu8dly1I'
        }
      ],
      facets: ['Color Palette (Burgundy, Navy, Gold)', 'Size (XS to 3XL)', 'Price Ladder']
    },
    {
      id: 'col-2',
      code: '#COL-2024-CHAN-04',
      title: 'Royal Chanderi & Silk Edit',
      badge: '● Live Active',
      badgeType: 'success',
      tag: 'Drop',
      skusCount: 64,
      priceRange: '₹3,200 – ₹24,900',
      ruleText: 'Rule: New Arrivals First',
      ruleIcon: 'sort',
      gmv: '₹1.12 Cr',
      gmvSub: 'Omnichannel Leader',
      gmvSubColor: 'text-status-success',
      cvrAov: '4.2% · ₹6,190',
      channelsText: 'App + Web + Feed',
      season: "Festive Atelier '24",
      status: 'Live Active',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWqVYaQUlsiynWut3zQmCl2P_VsxV_gKxCSj5UuvfX9vi6kC0-w_YqnijrZhybiq00uzWPJONkzkcnCgsK1F1j4GW7sN3NnLeNpTyhgZZWSgsc762xJuAXMZ7FHsqvRKP6XfV_un_ORnay6SwU53MgcxBOcXrXxdSecr1LL_4lryg2HsHhREiUieBJ2mHCmsvOALNRzem20Zg8Q1S8DGBzbZNjdIrBYAQi6kPiCKih',
      heroBanner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWqVYaQUlsiynWut3zQmCl2P_VsxV_gKxCSj5UuvfX9vi6kC0-w_YqnijrZhybiq00uzWPJONkzkcnCgsK1F1j4GW7sN3NnLeNpTyhgZZWSgsc762xJuAXMZ7FHsqvRKP6XfV_un_ORnay6SwU53MgcxBOcXrXxdSecr1LL_4lryg2HsHhREiUieBJ2mHCmsvOALNRzem20Zg8Q1S8DGBzbZNjdIrBYAQi6kPiCKih',
      heroBannerTitle: 'Royal Chanderi & Silk Edit',
      heroBannerSub: 'Active across Myntra Syndicate & Web Storefront',
      engineVersion: 'v3.2 Engine',
      algoTitle: 'Velocity-Driven Freshness Priority',
      algoDesc: 'Prioritizes raw silk arrivals released within last 7 days with direct inventory sync to central warehouse hubs.',
      marginWeight: 45,
      velocityWeight: 40,
      freshnessWeight: 15,
      pinnedItems: [
        {
          slot: 1,
          name: 'Handcrafted Chanderi Saree',
          price: '₹14,200',
          margin: 'Margin 64%',
          stock: 'Stock: 35 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWqVYaQUlsiynWut3zQmCl2P_VsxV_gKxCSj5UuvfX9vi6kC0-w_YqnijrZhybiq00uzWPJONkzkcnCgsK1F1j4GW7sN3NnLeNpTyhgZZWSgsc762xJuAXMZ7FHsqvRKP6XfV_un_ORnay6SwU53MgcxBOcXrXxdSecr1LL_4lryg2HsHhREiUieBJ2mHCmsvOALNRzem20Zg8Q1S8DGBzbZNjdIrBYAQi6kPiCKih'
        },
        {
          slot: 2,
          name: 'Raw Silk Kurta Set',
          price: '₹7,890',
          margin: 'Margin 58%',
          stock: 'Stock: 52 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGeroVKkNg-ymzVJriukxnVpghBZun7IoDkWz8jCGLGAYuYKGVTWJxANvpxQ9ZX2H7PaAJ0FcmhmrmOgrJnC_zVMW7NOy4t6ki39lyHtiaobTFjM_rmQSwpQZ-foC_J1CShGO7gW-aZslUN5QSbJQibhMx5xOVZXjrH58zwQo7wz618QFqdY8XP6nWEiuJc2yrDOME86BiVLVFO4q4km2uIGDRPo9ntNxhzu8dly1I'
        }
      ],
      facets: ['Fabric (Chanderi, Raw Silk)', 'Color (Ivory, Gold, Jade)', 'Price Ladder']
    },
    {
      id: 'col-3',
      code: '#COL-2024-MONS-02',
      title: 'Monsoon Resortwear & Linens',
      badge: '● Live Active',
      badgeType: 'success',
      tag: 'Curated',
      skusCount: 32,
      priceRange: '₹1,890 – ₹7,450',
      ruleText: 'Rule: High Stock Clearance Priority',
      ruleIcon: 'swap_vert',
      gmv: '₹42.50 L',
      gmvSub: 'Pacing Season Exit',
      gmvSubColor: 'text-status-warning',
      cvrAov: '2.9% · ₹3,120',
      channelsText: 'Web Catalog Grid',
      season: "Summer Essentials '24",
      status: 'Live Active',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDddvD1tLKSfdNa4nje-8J9-ke0ibSlo46ART3K5np1u3bQV-UFySF5GLK9L93XFZDhs_A7mJXgFpu8cpH15Jlzquw2tfz-aUoBY34cCDNcF-3lePS0-Djo76i_zOMWVfrkEoMoo_vY5LN2SNmJiUDwRrPDfFe4_pWTQCBJrfTzD7QOj3Ty0kPLIORZ3ifZTD1WDEnBsdOYZ7t9fDHNe-HyeRhFdvLhsM70t6yvGcwc',
      heroBanner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDddvD1tLKSfdNa4nje-8J9-ke0ibSlo46ART3K5np1u3bQV-UFySF5GLK9L93XFZDhs_A7mJXgFpu8cpH15Jlzquw2tfz-aUoBY34cCDNcF-3lePS0-Djo76i_zOMWVfrkEoMoo_vY5LN2SNmJiUDwRrPDfFe4_pWTQCBJrfTzD7QOj3Ty0kPLIORZ3ifZTD1WDEnBsdOYZ7t9fDHNe-HyeRhFdvLhsM70t6yvGcwc',
      heroBannerTitle: 'Resortwear & Breathable Linens',
      heroBannerSub: 'Summer End Clearance Engine Active',
      engineVersion: 'v2.9 Engine',
      algoTitle: 'Inventory Stock-Turn Clearance Logic',
      algoDesc: 'Prioritizes high-inventory SKUs with over 80 units in BLR-FC1 & DEL-FC2 to accelerate seasonal turn before Autumn drop.',
      marginWeight: 30,
      velocityWeight: 50,
      freshnessWeight: 20,
      pinnedItems: [
        {
          slot: 1,
          name: 'Pure Seafoam Linen Shirt',
          price: '₹2,490',
          margin: 'Margin 52%',
          stock: 'Stock: 112 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDddvD1tLKSfdNa4nje-8J9-ke0ibSlo46ART3K5np1u3bQV-UFySF5GLK9L93XFZDhs_A7mJXgFpu8cpH15Jlzquw2tfz-aUoBY34cCDNcF-3lePS0-Djo76i_zOMWVfrkEoMoo_vY5LN2SNmJiUDwRrPDfFe4_pWTQCBJrfTzD7QOj3Ty0kPLIORZ3ifZTD1WDEnBsdOYZ7t9fDHNe-HyeRhFdvLhsM70t6yvGcwc'
        }
      ],
      facets: ['Fabric (100% Linen)', 'Fit (Relaxed, Oversized)', 'Palette (Pastels, Earth)']
    },
    {
      id: 'col-4',
      code: '#COL-2024-WNTR-01',
      title: 'Winter Cashmere & Merino Coats',
      badge: '🕒 Scheduled Drop',
      badgeType: 'warning',
      tag: 'Oct 15',
      skusCount: 28,
      priceRange: '₹8,990 – ₹42,000',
      ruleText: 'VIP Tier Early Access (48h Pre-launch)',
      ruleIcon: 'lock_clock',
      gmv: '₹1.80 Cr',
      gmvSub: '3,420 Waitlisted',
      gmvSubColor: 'text-status-info',
      cvrAov: 'Oct 15, 08:00 IST',
      channelsText: 'Synced: iOS & Web',
      season: "Autumn/Winter '24",
      status: 'Scheduled',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChYi8ObOdX7JOhEYel2DEps3SyzS04zUxhAZcAV3AUvQO5YfmPY4dELN--VC6JVvDSC892oskFhW5bXnmwHdj67U_LlMc6Q9otw7fwnIO3yMa_Eik_Dlb2uB1SITS2X9imQ77aodawHgKzWttJroKefH9jk-lpJ9qkqIAPjgNWtbTzpyAc5NUO_8_Qm4BSh4qIDZQJhFRhvxllfLnb3ALwL8IQOuN74TDgjo7-xiuI',
      heroBanner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChYi8ObOdX7JOhEYel2DEps3SyzS04zUxhAZcAV3AUvQO5YfmPY4dELN--VC6JVvDSC892oskFhW5bXnmwHdj67U_LlMc6Q9otw7fwnIO3yMa_Eik_Dlb2uB1SITS2X9imQ77aodawHgKzWttJroKefH9jk-lpJ9qkqIAPjgNWtbTzpyAc5NUO_8_Qm4BSh4qIDZQJhFRhvxllfLnb3ALwL8IQOuN74TDgjo7-xiuI',
      heroBannerTitle: 'Winter Cashmere & Merino Coats',
      heroBannerSub: 'Pre-launch Teaser Live on iOS App Splash',
      engineVersion: 'v3.5 Engine',
      algoTitle: 'VIP Waitlist & Scarcity Allocation',
      algoDesc: 'Restricts purchasing to Platinum & Noir loyalty tiers for the first 48 hours. Enforces a maximum cart quota of 2 units per member.',
      marginWeight: 70,
      velocityWeight: 20,
      freshnessWeight: 10,
      pinnedItems: [
        {
          slot: 1,
          name: 'Charcoal Cashmere Overcoat',
          price: '₹38,900',
          margin: 'Margin 74%',
          stock: 'Stock: 45 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChYi8ObOdX7JOhEYel2DEps3SyzS04zUxhAZcAV3AUvQO5YfmPY4dELN--VC6JVvDSC892oskFhW5bXnmwHdj67U_LlMc6Q9otw7fwnIO3yMa_Eik_Dlb2uB1SITS2X9imQ77aodawHgKzWttJroKefH9jk-lpJ9qkqIAPjgNWtbTzpyAc5NUO_8_Qm4BSh4qIDZQJhFRhvxllfLnb3ALwL8IQOuN74TDgjo7-xiuI'
        }
      ],
      facets: ['Fabric (Mongolian Cashmere, Merino)', 'Sleeve (Tailored Raglan)', 'Color (Slate, Camel)']
    },
    {
      id: 'col-5',
      code: '#COL-CORE-BSCS-01',
      title: 'Essential Supima Tees & Denim',
      badge: '♾️ Evergreen Core',
      badgeType: 'neutral',
      tag: 'Core',
      skusCount: 120,
      priceRange: '₹1,290 – ₹4,990',
      ruleText: 'Auto-Replenish Inventory Trigger Active',
      ruleIcon: 'autorenew',
      gmv: '₹2.40 Cr',
      gmvSub: 'Low Return Rate (4.1%)',
      gmvSubColor: 'text-status-success',
      cvrAov: '4.8% · ₹2,890',
      channelsText: 'All Channels Live',
      season: 'Core Evergreen',
      status: 'Evergreen',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc09yk0USiXiev7iNzjrvfvXvA5lfh7sooeFtIjnN0ws31FpNjSxQQNUasv6sa-cmvF6Ed6eIXojUWjnNy3NtJ9jS1sHM2BdynSV-bix17cF5xJw97US4hD5WSgBzVAU1q1vmzGX2yxkZz45Pzro4ifE7zoV4fOPc1_iCMoE3ORaghF26812Sz-6yoXrPSLnKLEAfHh4iF2ByDIYhzWGMDILKMJOGL9EtYNv9lUyj8',
      heroBanner: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc09yk0USiXiev7iNzjrvfvXvA5lfh7sooeFtIjnN0ws31FpNjSxQQNUasv6sa-cmvF6Ed6eIXojUWjnNy3NtJ9jS1sHM2BdynSV-bix17cF5xJw97US4hD5WSgBzVAU1q1vmzGX2yxkZz45Pzro4ifE7zoV4fOPc1_iCMoE3ORaghF26812Sz-6yoXrPSLnKLEAfHh4iF2ByDIYhzWGMDILKMJOGL9EtYNv9lUyj8',
      heroBannerTitle: 'Evergreen Supima & Raw Denim',
      heroBannerSub: 'Consistent High-Velocity Catalog Foundation',
      engineVersion: 'v3.0 Engine',
      algoTitle: 'High-Volume Restock Balancing',
      algoDesc: 'Balances SKU placement across top ranks by real-time localized warehouse stock to minimize split shipments.',
      marginWeight: 50,
      velocityWeight: 35,
      freshnessWeight: 15,
      pinnedItems: [
        {
          slot: 1,
          name: 'Heavyweight Supima Crew Tee',
          price: '₹1,490',
          margin: 'Margin 54%',
          stock: 'Stock: 420 units',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc09yk0USiXiev7iNzjrvfvXvA5lfh7sooeFtIjnN0ws31FpNjSxQQNUasv6sa-cmvF6Ed6eIXojUWjnNy3NtJ9jS1sHM2BdynSV-bix17cF5xJw97US4hD5WSgBzVAU1q1vmzGX2yxkZz45Pzro4ifE7zoV4fOPc1_iCMoE3ORaghF26812Sz-6yoXrPSLnKLEAfHh4iF2ByDIYhzWGMDILKMJOGL9EtYNv9lUyj8'
        }
      ],
      facets: ['Fabric (100% Supima Cotton)', 'GSM (240 Heavyweight)', 'Colors (Ecru, Navy, Olive)']
    }
  ];
export const INITIAL_COLLECTIONS = collectionsData;

// ==========================================
// CENTRALIZED PROMOTIONS & CAMPAIGNS DATA
// ==========================================
export const campaigns = [
    {
      code: 'FESTIVE20',
      name: 'Festive Velvet & Zari Edit',
      type: '20% Off',
      applicability: 'Cart > ₹4,999',
      excluded: 'Excluded: Silk Anarkalis',
      redemptions: '14,200 / 25k',
      progress: 56.8,
      progressColor: 'bg-primary-container',
      gmvImpact: '₹48.20 L',
      marginHealth: 'Guarded',
      marginColor: 'text-status-success',
      status: 'Live',
      statusColor: 'bg-status-info-bg text-status-info',
      icon: 'celebration',
      iconColor: 'bg-fashion-magenta/10 text-fashion-magenta',
      subTitle: 'Festive Velvet & Zari Pre-Diwali Collection',
      velocity: '+24.8/min',
      aovUplift: '+₹840',
      aovUpliftSub: '+19.2% vs baseline',
      netMargin: '52.4%',
      netMarginSub: 'Floor > 45.0%',
      categoryScope: 'Ethnic Velvet & Brocade',
      scopeSkus: '248 In-stock Catalog Styles',
      exclusions: ['Pure Zari Anarkalis (High Cost)', 'Bridal Lehengas (Masterwork)', '+6 variants'],
      fraudDevice: '1 redemption / Device ID',
      fraudAuth: 'Phone OTP verified',
      fraudMinCart: '₹4,999 (Pre-tax)'
    },
    {
      code: 'SILKFIRST',
      name: 'New Customer Silk Voucher',
      type: '₹1,000 Flat',
      applicability: 'First purchase only',
      excluded: 'Pure Mulberry Silk tag',
      redemptions: '8,940 / 10k',
      progress: 89.4,
      progressColor: 'bg-status-warning',
      gmvImpact: '₹32.18 L',
      marginHealth: 'Healthy',
      marginColor: 'text-status-success',
      status: 'Cap Near',
      statusColor: 'bg-status-warning-bg text-status-warning',
      icon: 'local_mall',
      iconColor: 'bg-primary-fixed text-primary',
      subTitle: 'First Time User Welcome Silk Voucher',
      velocity: '+18.2/min',
      aovUplift: '+₹620',
      aovUpliftSub: '+14.5% vs baseline',
      netMargin: '56.1%',
      netMarginSub: 'Floor > 45.0%',
      categoryScope: 'Pure Mulberry Silk',
      scopeSkus: '112 In-stock Catalog Styles',
      exclusions: ['Heirloom Banarasi Saree', '+2 variants'],
      fraudDevice: '1 redemption / Mobile Number',
      fraudAuth: 'SMS Verification Active',
      fraudMinCart: '₹3,499 (Pre-tax)'
    },
    {
      code: 'VIPCOUTURE15',
      name: 'Couture Loyalty Tier',
      isAuto: true,
      type: '15% Tiered',
      applicability: 'Gold / Platinum Tier',
      excluded: 'Auto-evaluated at checkout',
      redemptions: '19,410 / ∞',
      progress: 45.0,
      progressColor: 'bg-status-success',
      gmvImpact: '₹64.90 L',
      marginHealth: 'Healthy',
      marginColor: 'text-status-success',
      status: 'Live',
      statusColor: 'bg-status-info-bg text-status-info',
      icon: 'stars',
      iconColor: 'bg-surface-subtle text-primary-container',
      subTitle: 'Black & Platinum Loyalty Member Auto-Discount',
      velocity: '+32.4/min',
      aovUplift: '+₹1,120',
      aovUpliftSub: '+26.8% vs baseline',
      netMargin: '58.0%',
      netMarginSub: 'Floor > 45.0%',
      categoryScope: 'Storewide Exclusive',
      scopeSkus: 'All Non-Discounted Masterpieces',
      exclusions: ['Sample Sale Items'],
      fraudDevice: 'Loyalty ID bound',
      fraudAuth: 'Biometric App SSO',
      fraudMinCart: '₹0 (Storewide)'
    },
    {
      code: 'FLASH999',
      name: 'Friday App Exclusive Flash',
      type: '₹999 Flat',
      applicability: 'App only • Cart > ₹5,000',
      excluded: 'Expires in 04h:12m',
      isUrgent: true,
      redemptions: '4,820 / 5,000',
      progress: 96.4,
      progressColor: 'bg-status-danger',
      gmvImpact: '₹24.12 L',
      marginHealth: 'Guarded',
      marginColor: 'text-status-warning',
      status: 'Ending Soon',
      statusColor: 'bg-status-danger-bg text-status-danger',
      icon: 'bolt',
      iconColor: 'bg-status-warning-bg text-status-warning',
      subTitle: 'Mobile App Flash Friday Voucher Blitz',
      velocity: '+44.0/min',
      aovUplift: '+₹480',
      aovUpliftSub: '+9.4% vs baseline',
      netMargin: '47.2%',
      netMarginSub: 'Floor > 45.0%',
      categoryScope: 'Ready-To-Wear Dresses & Kurtas',
      scopeSkus: '420 In-stock Catalog Styles',
      exclusions: ['Cashmere Overcoats', 'Heavy Zari Sets'],
      fraudDevice: 'Device IMEI Check',
      fraudAuth: 'App Token Required',
      fraudMinCart: '₹5,000 (Pre-tax)'
    },
    {
      code: 'INFLUENCER-TARA',
      name: 'Tara Sutaria Summer Drop',
      type: '10% Rev-Share',
      applicability: 'Summer Linen & Cottons',
      excluded: 'Omnichannel Attribution',
      redemptions: '16,910 / 50k',
      progress: 33.8,
      progressColor: 'bg-primary-container',
      gmvImpact: '₹24.60 L',
      marginHealth: 'Warning',
      marginColor: 'text-status-danger',
      status: 'Live',
      statusColor: 'bg-status-info-bg text-status-info',
      icon: 'qr_code_2',
      iconColor: 'bg-status-info-bg text-status-info',
      subTitle: 'Tara Sutaria Brand Ambassador Campaign',
      velocity: '+14.1/min',
      aovUplift: '+₹340',
      aovUpliftSub: '+7.1% vs baseline',
      netMargin: '44.8%',
      netMarginSub: 'Floor > 45.0% (Near threshold)',
      categoryScope: 'Summer Linen Resortwear',
      scopeSkus: '88 Selected Drop Styles',
      exclusions: ['Accessories', 'Footwear'],
      fraudDevice: 'UTM Tracking Token',
      fraudAuth: 'Social Referral Verified',
      fraudMinCart: '₹2,999 (Pre-tax)'
    }
  ];
export const INITIAL_CAMPAIGNS = campaigns;

// ==========================================
// CENTRALIZED SHIPMENTS & DISPATCH LOGISTICS
// ==========================================
export const shipmentList = [
    {
      awb: '8492019482',
      carrier: 'BLUEDART AIR',
      carrierType: 'Priority Air',
      carrierIcon: 'flight',
      carrierBg: 'bg-status-info-bg',
      carrierColor: 'text-status-info',
      carrierTextClass: 'text-status-info',
      orderId: 'EVR-984210-BLR',
      destination: 'Indiranagar, BLR (560038)',
      garments: '2 items',
      weight: '640g • Polybag S3',
      slaCountdown: '1h 12m',
      slaDeadline: 'Departs 18:30',
      slaUrgent: true,
      dockStatus: 'BAY 4B STAGED',
      dockStatusColor: 'bg-status-info-bg text-status-info',
      dockDotColor: 'bg-status-info',
      bagNo: 'Bag #BG-BLR-094',
      handoverState: 'Manifested & Bagged',
      handoverBadgeClass: 'bg-surface-subtle text-text-primary',
      carrierCode: 'bluedart',
      node: 'blr',
      speed: 'express'
    },
    {
      awb: '1084920391',
      carrier: 'DELHIVERY',
      carrierType: 'Surface Direct',
      carrierIcon: 'local_shipping',
      carrierBg: 'bg-surface-subtle',
      carrierColor: 'text-text-primary',
      carrierTextClass: 'text-text-primary',
      orderId: 'EVR-984209-BOM',
      destination: 'Bandra West, BOM (400050)',
      garments: '1 item',
      weight: '410g • Box Carton M',
      slaCountdown: '2h 45m',
      slaDeadline: 'Departs 20:00',
      slaUrgent: false,
      dockStatus: 'DOCK STAGED',
      dockStatusColor: 'bg-status-warning-bg text-status-warning',
      dockDotColor: 'bg-status-warning',
      bagNo: 'Bay 1A Staging',
      handoverState: 'Manifested',
      handoverBadgeClass: 'bg-surface-subtle text-text-primary',
      carrierCode: 'delhivery',
      node: 'bom',
      speed: 'surface'
    },
    {
      awb: '8492019483',
      carrier: 'BLUEDART AIR',
      carrierType: 'Air Express',
      carrierIcon: 'flight',
      carrierBg: 'bg-status-info-bg',
      carrierColor: 'text-status-info',
      carrierTextClass: 'text-status-info',
      orderId: 'EVR-984208-DEL',
      destination: 'GK-1, New Delhi (110024)',
      garments: '3 items',
      weight: '980g • Polybag XL',
      slaCountdown: '4h 10m',
      slaDeadline: 'Departs 21:30',
      slaUrgent: false,
      dockStatus: 'BAY 2A STAGED',
      dockStatusColor: 'bg-status-info-bg text-status-info',
      dockDotColor: 'bg-status-info',
      bagNo: 'Bag #BG-DEL-102',
      handoverState: 'Bagged & Barcoded',
      handoverBadgeClass: 'bg-status-success-bg text-status-success',
      carrierCode: 'bluedart',
      node: 'del',
      speed: 'express'
    },
    {
      awb: 'SFX99201942',
      carrier: 'SHADOWFAX',
      carrierType: 'Hyperlocal 2h',
      carrierIcon: 'two_wheeler',
      carrierBg: 'bg-fashion-magenta/10',
      carrierColor: 'text-fashion-magenta',
      carrierTextClass: 'text-fashion-magenta',
      orderId: 'EVR-984207-BLR',
      destination: 'Koramangala, BLR (560034)',
      garments: '1 item',
      weight: '320g • Polybag S1',
      slaCountdown: '32m',
      slaDeadline: 'Departs 17:15',
      slaUrgent: true,
      dockStatus: 'RIDER AT DOCK',
      dockStatusColor: 'bg-fashion-magenta/15 text-fashion-magenta',
      dockDotColor: 'bg-fashion-magenta',
      bagNo: 'Bay 0 (Express Gate)',
      handoverState: 'Awaiting Rider OTP',
      handoverBadgeClass: 'bg-fashion-magenta/10 text-fashion-magenta',
      carrierCode: 'shadowfax',
      node: 'blr',
      speed: 'express'
    },
    {
      awb: 'XPB-994102-MAA',
      carrier: 'XPRESSBEES',
      carrierType: 'Standard Surface',
      carrierIcon: 'local_shipping',
      carrierBg: 'bg-surface-subtle',
      carrierColor: 'text-text-primary',
      carrierTextClass: 'text-text-primary',
      orderId: 'EVR-984206-MAA',
      destination: 'Anna Nagar, MAA (600028)',
      garments: '1 item',
      weight: '510g • Box S',
      slaCountdown: '5h 20m',
      slaDeadline: 'Departs 22:45',
      slaUrgent: false,
      dockStatus: 'BAY 3 STAGED',
      dockStatusColor: 'bg-surface-subtle text-text-secondary',
      dockDotColor: 'bg-secondary',
      bagNo: 'Tote #T-992',
      handoverState: 'Manifested',
      handoverBadgeClass: 'bg-surface-subtle text-text-primary',
      carrierCode: 'xpressbees',
      node: 'ccu',
      speed: 'standard'
    }
  ];
export const INITIAL_SHIPMENTS = shipmentList;

// ==========================================
// CENTRALIZED CREDIT NOTES & REFUNDS DATA
// ==========================================
export const notesList = [
    {
      id: '#CN-2024-001420',
      time: '24 May, 14:28',
      invoice: 'INV-2024-058912',
      orderId: 'EVR-984210-BLR',
      customer: 'Pooja Hegde',
      reason: 'Fit / Size Defect',
      taxableValue: '₹2,499.11',
      gstReversal: '₹299.89',
      gstType: 'CGST+SGST 12%',
      channel: 'Store Credit (+10%)',
      channelSub: 'Wallet Ref #EW-982',
      channelIcon: 'account_balance_wallet',
      channelColor: 'text-fashion-magenta',
      status: 'Reconciled',
      statusBadge: 'bg-status-success-bg text-status-success',
      irn: 'ACK-98442-2024',
      date: '18 May 2024',
      qcRef: 'QC-BLR1-PASS-44',
      sku: 'EVR-W-BLZ-092-MUL',
      productName: 'Mulberry Linen Boyfriend Blazer',
      productMeta: 'Size: M (EU 38) • HSN: 62043200',
      defectReason: 'Returned: Defect - Shoulder seam variance (QC Approved)',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAOGfdflHcv2mYpr_cRrSl7rrFcLxBZY8OBNsvsONmSIiodyp4t0w2W937pqJDH09C7ZAiC4RUXad3Hye_6unbmnUzLmy33c97zwUo_Erc41BFgITy_CaESBeM0QwvqH-tpwAjxhJsRLzXOCcL2wjCT_GM40ItKjbkMR4a5G1pmTZpA9OC097KBEp8MXYk0i_rxLdM2e9zHzAZVJVZL9bQu4yPDpLLI5fi5S2QIO0P',
      mrp: '₹2,799.00',
      cgst: '₹149.95',
      sgst: '₹149.95',
      igst: '₹0.00',
      totalNote: '₹2,799.00',
      creditedWallet: '₹3,078.90',
      bonusNote: 'Includes promotional retention bonus of ₹279.90 (10% extra on original order ₹2,799.00).',
      rrn: 'EW-WAL-20240524-88421',
      hash: 'e82f9d84c1b973a2168df981350a4bf857134cb003b12365287fce36a0c021de',
      signatory: 'Ananya Sharma (DS-EVERWEAR-01)'
    },
    {
      id: '#CN-2024-001419',
      time: '24 May, 13:51',
      invoice: 'INV-2024-058890',
      orderId: 'EVR-984180-MUM',
      customer: 'Vikram Malhotra',
      reason: 'Pre-Dispatch Cancel',
      taxableValue: '₹5,178.57',
      gstReversal: '₹621.43',
      gstType: 'IGST 12%',
      channel: 'UPI Instant (Rzp)',
      channelSub: 'UPI: vikram@okhdfc',
      channelIcon: 'speed',
      channelColor: 'text-status-info',
      status: 'Reconciled',
      statusBadge: 'bg-status-success-bg text-status-success',
      irn: 'ACK-98419-2024',
      date: '20 May 2024',
      qcRef: 'CANCEL-AUTO-SYSTEM',
      sku: 'EVR-M-JKT-102-NAV',
      productName: 'Tailored Cashmere Overcoat',
      productMeta: 'Size: 42 • HSN: 62019000',
      defectReason: 'Customer Cancellation Prior to Logistics Dispatch',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChYi8ObOdX7JOhEYel2DEps3SyzS04zUxhAZcAV3AUvQO5YfmPY4dELN--VC6JVvDSC892oskFhW5bXnmwHdj67U_LlMc6Q9otw7fwnIO3yMa_Eik_Dlb2uB1SITS2X9imQ77aodawHgKzWttJroKefH9jk-lpJ9qkqIAPjgNWtbTzpyAc5NUO_8_Qm4BSh4qIDZQJhFRhvxllfLnb3ALwL8IQOuN74TDgjo7-xiuI',
      mrp: '₹5,800.00',
      cgst: '₹0.00',
      sgst: '₹0.00',
      igst: '₹621.43',
      totalNote: '₹5,800.00',
      creditedWallet: '₹5,800.00',
      bonusNote: 'Full tender refund initiated via UPI Instant refund rails.',
      rrn: 'RZP-REF-20240524-19402',
      hash: '9a4c8f2b1d6e3c5a7f8e0b2d4c6a8f1e3c5a7f8e0b2d4c6a8f1e3c5a7f8e0b2d',
      signatory: 'Ananya Sharma (DS-EVERWEAR-01)'
    },
    {
      id: '#CN-2024-001418',
      time: '24 May, 12:40',
      invoice: 'INV-2024-058721',
      orderId: 'EVR-983995-DEL',
      customer: 'Tanvi Narang',
      reason: 'Fabric Quality Defect',
      taxableValue: '₹8,924.11',
      gstReversal: '₹1,070.89',
      gstType: 'IGST 12%',
      channel: 'Original Visa CC',
      channelSub: 'Acquirer ARN Pending',
      channelIcon: 'credit_card',
      channelColor: 'text-text-secondary',
      status: 'GSTR-1 Synced',
      statusBadge: 'bg-status-info-bg text-status-info',
      irn: 'ACK-98392-2024',
      date: '16 May 2024',
      qcRef: 'QC-DEL3-FAIL-09',
      sku: 'EVR-W-SRI-044-GLD',
      productName: 'Raw Silk Festive Chanderi Saree',
      productMeta: 'Free Size • HSN: 50072010',
      defectReason: 'Zari weaving warp thread separation defect confirmed.',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWqVYaQUlsiynWut3zQmCl2P_VsxV_gKxCSj5UuvfX9vi6kC0-w_YqnijrZhybiq00uzWPJONkzkcnCgsK1F1j4GW7sN3NnLeNpTyhgZZWSgsc762xJuAXMZ7FHsqvRKP6XfV_un_ORnay6SwU53MgcxBOcXrXxdSecr1LL_4lryg2HsHhREiUieBJ2mHCmsvOALNRzem20Zg8Q1S8DGBzbZNjdIrBYAQi6kPiCKih',
      mrp: '₹9,995.00',
      cgst: '₹0.00',
      sgst: '₹0.00',
      igst: '₹1,070.89',
      totalNote: '₹9,995.00',
      creditedWallet: '₹9,995.00',
      bonusNote: 'Original card credit tender queued with HDFC Payment Gateway.',
      rrn: 'HDFC-ARN-409184-9921',
      hash: '3f7d2a1c9e8b6d4f5a0e2c4a6f8b1d3e5a7c9f0b2d4e6a8f1c3e5a7b9d1f3e5a',
      signatory: 'Ananya Sharma (DS-EVERWEAR-01)'
    },
    {
      id: '#CN-2024-001417',
      time: '24 May, 11:15',
      invoice: 'INV-2024-058611',
      orderId: 'EVR-983802-HYD',
      customer: 'Karthik Reddy',
      reason: 'RTO Delivery Failure',
      taxableValue: '₹3,120.53',
      gstReversal: '₹374.47',
      gstType: 'IGST 12%',
      channel: 'Bank NEFT Reversal',
      channelSub: 'Awaiting Beneficiary A/C',
      channelIcon: 'account_balance',
      channelColor: 'text-status-warning',
      status: 'Disputed / Hold',
      statusBadge: 'bg-status-warning-bg text-status-warning',
      irn: 'ACK-98310-2024',
      date: '14 May 2024',
      qcRef: 'RTO-3X-ATTEMPT-FAIL',
      sku: 'EVR-M-DEN-012-IND',
      productName: 'Shuttle-Loom Selvedge Denim',
      productMeta: 'Size: 34 • HSN: 62034200',
      defectReason: '3 Consecutive Undelivered attempts logged by Bluedart.',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc09yk0USiXiev7iNzjrvfvXvA5lfh7sooeFtIjnN0ws31FpNjSxQQNUasv6sa-cmvF6Ed6eIXojUWjnNy3NtJ9jS1sHM2BdynSV-bix17cF5xJw97US4hD5WSgBzVAU1q1vmzGX2yxkZz45Pzro4ifE7zoV4fOPc1_iCMoE3ORaghF26812Sz-6yoXrPSLnKLEAfHh4iF2ByDIYhzWGMDILKMJOGL9EtYNv9lUyj8',
      mrp: '₹3,495.00',
      cgst: '₹0.00',
      sgst: '₹0.00',
      igst: '₹374.47',
      totalNote: '₹3,495.00',
      creditedWallet: '₹3,495.00',
      bonusNote: 'Holding reversal pending verified customer IFSC/Account Number.',
      rrn: 'NEFT-HOLD-20240524-001',
      hash: '5b8e1f3a7c9d0b2e4f6a8c1d3e5a7f9b0d2e4f6a8c1d3e5a7f9b0d2e4f6a8c1d',
      signatory: 'Sneha Kulkarni (FIN-EVERWEAR-02)'
    },
    {
      id: '#CN-2024-001416',
      time: '24 May, 10:04',
      invoice: 'INV-2024-058509',
      orderId: 'EVR-983694-MAA',
      customer: 'Deepa Senthil',
      reason: 'Incorrect Item Shipped',
      taxableValue: '₹1,784.82',
      gstReversal: '₹214.18',
      gstType: 'CGST+SGST 12%',
      channel: 'Store Credit (+10%)',
      channelSub: 'Wallet Ref #EW-981',
      channelIcon: 'account_balance_wallet',
      channelColor: 'text-fashion-magenta',
      status: 'Reconciled',
      statusBadge: 'bg-status-success-bg text-status-success',
      irn: 'ACK-98284-2024',
      date: '12 May 2024',
      qcRef: 'FC-MAA-ERR-02',
      sku: 'EVR-W-TEE-014-ECR',
      productName: 'Supima Cotton Relaxed Tee',
      productMeta: 'Size: S • HSN: 61091000',
      defectReason: 'Picker scanned wrong variant during batch fulfillment.',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc09yk0USiXiev7iNzjrvfvXvA5lfh7sooeFtIjnN0ws31FpNjSxQQNUasv6sa-cmvF6Ed6eIXojUWjnNy3NtJ9jS1sHM2BdynSV-bix17cF5xJw97US4hD5WSgBzVAU1q1vmzGX2yxkZz45Pzro4ifE7zoV4fOPc1_iCMoE3ORaghF26812Sz-6yoXrPSLnKLEAfHh4iF2ByDIYhzWGMDILKMJOGL9EtYNv9lUyj8',
      mrp: '₹1,999.00',
      cgst: '₹107.09',
      sgst: '₹107.09',
      igst: '₹0.00',
      totalNote: '₹1,999.00',
      creditedWallet: '₹2,198.90',
      bonusNote: 'Includes 10% instant goodwill wallet credit.',
      rrn: 'EW-WAL-20240524-88420',
      hash: '7c9e0b2d4f6a8c1d3e5a7f9b0d2e4f6a8c1d3e5a7f9b0d2e4f6a8c1d3e5a7f9b',
      signatory: 'Ananya Sharma (DS-EVERWEAR-01)'
    },
    {
      id: '#CN-2024-001415',
      time: '24 May, 09:18',
      invoice: 'INV-2024-058342',
      orderId: 'EVR-983510-BLR',
      customer: 'Rohan Verma',
      reason: 'Return Window Exchange',
      taxableValue: '₹4,463.39',
      gstReversal: '₹535.61',
      gstType: 'CGST+SGST 12%',
      channel: 'UPI Instant (Rzp)',
      channelSub: 'UPI: rohan@axisbank',
      channelIcon: 'speed',
      channelColor: 'text-status-info',
      status: 'Reconciled',
      statusBadge: 'bg-status-success-bg text-status-success',
      irn: 'ACK-98199-2024',
      date: '10 May 2024',
      qcRef: 'QC-BLR1-PASS-39',
      sku: 'EVR-M-SHR-055-WHT',
      productName: 'French Linen Relaxed Resort Shirt',
      productMeta: 'Size: L • HSN: 62052000',
      defectReason: 'Size exchange opted into UPI refund on restock checkout.',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDddvD1tLKSfdNa4nje-8J9-ke0ibSlo46ART3K5np1u3bQV-UFySF5GLK9L93XFZDhs_A7mJXgFpu8cpH15Jlzquw2tfz-aUoBY34cCDNcF-3lePS0-Djo76i_zOMWVfrkEoMoo_vY5LN2SNmJiUDwRrPDfFe4_pWTQCBJrfTzD7QOj3Ty0kPLIORZ3ifZTD1WDEnBsdOYZ7t9fDHNe-HyeRhFdvLhsM70t6yvGcwc',
      mrp: '₹4,999.00',
      cgst: '₹267.80',
      sgst: '₹267.81',
      igst: '₹0.00',
      totalNote: '₹4,999.00',
      creditedWallet: '₹4,999.00',
      bonusNote: 'Immediate UPI settlement credited to customer VPA.',
      rrn: 'RZP-UPI-20240524-11082',
      hash: '1d3e5a7f9b0d2e4f6a8c1d3e5a7f9b0d2e4f6a8c1d3e5a7f9b0d2e4f6a8c1d3e',
      signatory: 'Sneha Kulkarni (FIN-EVERWEAR-02)'
    }
  ];
export const INITIAL_CREDIT_NOTES_REFUNDS = notesList;

// ==========================================
// CENTRALIZED USERS & RBAC OPERATOR IDENTITY
// ==========================================
export const usersList = [
    {
      key: 'vikram',
      name: 'Vikram Seth',
      email: 'vikram.s@everwear.in',
      isOnline: true,
      role: 'Fulfillment Operations Lead',
      roleBadge: 'text-primary-container bg-primary-fixed',
      hub: 'BLR-FC1',
      hubIcon: 'warehouse',
      scopeTitle: 'Manifest Sign-off',
      scopeDesc: 'Units limit: 500 max',
      securityState: '2FA Verified',
      securityIcon: 'verified_user',
      securityBadge: 'bg-status-success-bg text-status-success',
      lastActive: '2 mins ago',
      device: 'RF Gun #12',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQ9kt4Ro63W9ezePRo1kS6F9bf1jLDiyCKUodb8y2I3z9gdCKhD_RPumhqCiP0YjPepTBpyutd0kTJza9212zn84HCEh7f6_AyuaqcFEPlEzzV91K039bluC8lmY-ahvyQA0IMz9JFASXROeMtF4rC7LZ_YN2qszFZj__60_N1NqEycBbIFZO9MUkfdk5bF2h4H2yhL_PX3z9jg5Z0uE__u-qXTyN8ZXSUFmbE0gp',
      tier: 'Tier-2 Operational',
      tierBadge: 'bg-status-info-bg text-status-info',
      assignedHub: 'BLR-FC1',
      modules: [
        {
          name: 'Catalog & Merchandising',
          icon: 'checkroom',
          scopeTag: 'Scoped',
          scopeColor: 'bg-surface-container-highest text-text-secondary',
          perms: [
            { text: 'View & Edit Product Variants / Barcodes', allowed: true },
            { text: 'No Pricing or Markdown Override', allowed: false }
          ]
        },
        {
          name: 'Orders & Dispatch',
          icon: 'local_shipping',
          scopeTag: 'Full Access',
          scopeColor: 'bg-status-success-bg text-status-success',
          perms: [
            { text: 'Full Pick / Pack / Dispatch Workflow', allowed: true },
            { text: 'Sign-off & Lock Carrier Manifests', allowed: true }
          ]
        },
        {
          name: 'GST & Tax Finance',
          icon: 'account_balance_wallet',
          scopeTag: 'Read Only',
          scopeColor: 'bg-status-warning-bg text-status-warning',
          perms: [
            { text: 'Inspect B2C Tax Invoices & HSN Codes', allowed: true },
            { text: 'No Credit Note issuance approval', allowed: false }
          ]
        },
        {
          name: 'Inventory Stock Movements',
          icon: 'warehouse',
          scopeTag: 'Capped 500u',
          scopeColor: 'bg-primary-fixed text-primary',
          desc: 'Autonomous bin transfers permitted up to 500 units. Quantities > 500 escalate to VP Operations approval queue.'
        }
      ],
      ipWhitelist: '103.21.54.0/24 (BLR)',
      sessionLimit: '30 mins Hard Limit',
      auditEntries: [
        {
          title: 'Approved Carrier Manifest #MNF-2024-0482',
          sub: 'Today at 14:12 • Bluedart Logistics • 348 parcels',
          dotColor: 'bg-status-success'
        },
        {
          title: 'Adjusted bin allocation in Aisle C-12',
          sub: 'Today at 11:35 • 120 units Silk Georgette Dress',
          dotColor: 'bg-primary-container'
        }
      ]
    },
    {
      key: 'ananya',
      name: 'Ananya Sharma',
      email: 'ananya.sharma@everwear.in',
      isOnline: true,
      role: 'VP Operations',
      isExec: true,
      roleBadge: 'text-text-primary bg-surface-subtle',
      hub: 'All FC Nodes + HQ',
      hubIcon: 'hub',
      scopeTitle: 'Full Read/Write Tier-0',
      scopeDesc: 'Fin limit: ₹5.00 Cr',
      securityState: 'FIDO2 Token',
      securityIcon: 'key',
      securityBadge: 'bg-status-success-bg text-status-success',
      lastActive: 'Active Now',
      device: 'MacBook Pro',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3aVg7uhrl6tyMQJX_kXwRsXPVth7_kvlsAdTY05ZVcMC99yD97ekjATZRAU1TViEPLqREVAsM7djMPko3UG1jcDqe1IkmtAO204mzD7qoZk7kV34J_vwGjx7EIcA1AGePofXffHnu7u6s5Kt2DDaJe8UgDG_bv-T_w_PZfUc6GsOlzwh4Z4WkP0xUgjKReAkahdy43JNnj-yfKv-MF7KjsO4dQeq7cz0VcXGxE_wX',
      tier: 'Tier-0 Super Admin',
      tierBadge: 'bg-status-warning-bg text-status-warning',
      assignedHub: 'Central HQ & All Nodes',
      modules: [
        {
          name: 'Executive ERP Operations',
          icon: 'admin_panel_settings',
          scopeTag: 'Unrestricted',
          scopeColor: 'bg-status-success-bg text-status-success',
          perms: [
            { text: 'Global Financial Sign-off & Credit Release', allowed: true },
            { text: 'Manage Team RBAC & Node Secrets', allowed: true }
          ]
        }
      ],
      ipWhitelist: 'Corporate VPN + Hardware YubiKey',
      sessionLimit: '12 Hours Dual Auth',
      auditEntries: [
        {
          title: 'Issued statutory batch authorization',
          sub: 'Today at 12:00 • ClearTax GSTR-1 Batch',
          dotColor: 'bg-status-success'
        }
      ]
    },
    {
      key: 'rohan',
      name: 'Rohan Gupta',
      email: 'rohan.g@everwear.in',
      isOnline: false,
      role: 'Lead Merchandiser',
      roleBadge: 'text-text-primary bg-surface-subtle',
      hub: 'Central HQ',
      hubIcon: 'domain',
      scopeTitle: 'Catalog & Lookbooks',
      scopeDesc: 'No Inventory override',
      securityState: 'TOTP Active',
      securityIcon: 'phonelink_lock',
      securityBadge: 'bg-status-success-bg text-status-success',
      lastActive: '42 mins ago',
      device: 'Web Browser',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBE8PxSzSUy-izoHoJJKER-yDsgJZdru4N5RW631K6ZCKJgl6zxXgtePDrGMkTrJ73z3XFNqlKrCYCsR30B-ZMtpSK3Lo5gvZ-frEjGS1WPGjX8VRiZVX4ISaCiIJD-2KdtSEKRgGKYe8G9CkKhMTW_QWnqZd2C0dVZoDYLAuqaFpuBzQcr9Ty7erhVJi4G0t8NEimWWeGSu5oJ-AnyErZUB6E7DIpw7JYrrf3bJmv',
      tier: 'Tier-2 Catalog Editor',
      tierBadge: 'bg-status-info-bg text-status-info',
      assignedHub: 'Central HQ',
      modules: [
        {
          name: 'Catalog & Merchandising',
          icon: 'checkroom',
          scopeTag: 'Full Merch',
          scopeColor: 'bg-status-success-bg text-status-success',
          perms: [
            { text: 'Publish Collections & Lookbook Drops', allowed: true },
            { text: 'Reorder Merchandising Matrix Rules', allowed: true }
          ]
        }
      ],
      ipWhitelist: 'Office Static + Mobile SSO',
      sessionLimit: '8 Hours Limit',
      auditEntries: [
        {
          title: 'Pinned Velvet & Zari Hero Slot 1',
          sub: 'Today at 10:45 • Festive 2024 Collection',
          dotColor: 'bg-primary-container'
        }
      ]
    },
    {
      key: 'sneha',
      name: 'Sneha Kulkarni',
      email: 'sneha.k@everwear.in',
      isOnline: false,
      role: 'GST Finance Auditor',
      roleBadge: 'text-text-primary bg-surface-subtle',
      hub: 'BOM-FC2',
      hubIcon: 'warehouse',
      scopeTitle: 'Credit Notes & Invoices',
      scopeDesc: 'Sign-off ₹50,00,000',
      securityState: '2FA Verified',
      securityIcon: 'verified_user',
      securityBadge: 'bg-status-success-bg text-status-success',
      lastActive: 'Yesterday, 18:22',
      device: 'Finance Portal',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwsuNiZA9V1CzC2zK3znSBzfRU3JHSZrLyuXZjIeOHTG6TUUWaoHhDWaaFHw6OdPjV5hB0TadMxaeKH2jersmIqEe8p4KYbr4pyI4TKgEUsuaRKRbke-DNmxyYB527tJKyMSA4rJwuAl7tBgLTbYOkJNGS5x4Dl_EhXj3HkIKM4gOUGQuj0FlgwfMlBCb7TB0j4miADijSDJGqM5piPnIu5NKWUqPcLTmifb-q8CmJ',
      tier: 'Tier-1 Finance Signatory',
      tierBadge: 'bg-status-warning-bg text-status-warning',
      assignedHub: 'BOM-FC2 Finance Node',
      modules: [
        {
          name: 'Statutory GST Invoicing',
          icon: 'receipt_long',
          scopeTag: 'Signatory',
          scopeColor: 'bg-status-success-bg text-status-success',
          perms: [
            { text: 'Authorize Credit Note Issuance <= ₹50L', allowed: true },
            { text: 'File GSTR-1 and GSTR-3B registers', allowed: true }
          ]
        }
      ],
      ipWhitelist: '115.112.44.0/24 (BOM)',
      sessionLimit: '45 mins Timeout',
      auditEntries: [
        {
          title: 'Validated Credit Note #CN-2024-001420',
          sub: 'Yesterday at 17:15 • GSTR-1B Export Synced',
          dotColor: 'bg-status-success'
        }
      ]
    },
    {
      key: 'rajesh',
      name: 'Rajesh Mandanna',
      email: 'rajesh.m@everwear.in',
      isOnline: false,
      role: 'Inward Supervisor',
      roleBadge: 'text-text-primary bg-surface-subtle',
      hub: 'DEL-FC3',
      hubIcon: 'warehouse',
      scopeTitle: 'GRN & ASN Receiving',
      scopeDesc: 'Stock dock only',
      securityState: '2FA Verified',
      securityIcon: 'verified_user',
      securityBadge: 'bg-status-success-bg text-status-success',
      lastActive: '3 hours ago',
      device: 'Zebra Handheld',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxQVTSObNLv2SPui8UJX14dN6XbCkbhSvLKALuwjqPM2I6xS__HUEjnE7pTWb9OMOkfMkoC2gYZfTBmeeEjnrb6RagG7F_40AzyFP0OjrMVWCLUFZazxbmlYUGASc5A-WO2fFg-sDaZhBgBZUhM4Dwp8dSLGUz250y5eh32oEqYf_RaIv4RaDTBfQLn4pvo-NHyyEmQ7s_9vddgIyq2Ffyf0BAw-1zqOmtVcSfzQVh',
      tier: 'Tier-3 Field Operator',
      tierBadge: 'bg-surface-subtle text-text-secondary',
      assignedHub: 'DEL-FC3 Inward Dock',
      modules: [
        {
          name: 'GRN Inwarding & Discrepancies',
          icon: 'local_shipping',
          scopeTag: 'Dock Scoped',
          scopeColor: 'bg-status-info-bg text-status-info',
          perms: [
            { text: 'Barcode Scan Supplier Pallets', allowed: true },
            { text: 'Log Mill Inspection Discrepancies', allowed: true }
          ]
        }
      ],
      ipWhitelist: '10.42.0.0/16 (DEL Dock WiFi)',
      sessionLimit: '8 Hours Shift',
      auditEntries: [
        {
          title: 'Received GRN #GRN-DEL3-8821',
          sub: 'Today at 08:30 • Arvind Mills Pure Denim',
          dotColor: 'bg-status-info'
        }
      ]
    },
    {
      key: 'farhan',
      name: 'Farhan Qureshi',
      email: 'farhan.q@everwear.in',
      isOnline: false,
      isSuspended: true,
      role: 'Dock QC Inspector',
      roleBadge: 'text-text-secondary bg-surface-subtle',
      hub: 'HYD-FC4',
      hubIcon: 'warehouse',
      scopeTitle: 'QC Tagging & Rejection',
      scopeDesc: 'Revoked',
      securityState: 'Suspended',
      securityIcon: 'block',
      securityBadge: 'bg-status-danger-bg text-status-danger',
      lastActive: 'May 18, 2024',
      device: 'Admin Lockout',
      avatar: null,
      tier: 'Tier-3 Suspended',
      tierBadge: 'bg-status-danger-bg text-status-danger',
      assignedHub: 'HYD-FC4',
      modules: [],
      ipWhitelist: 'Blocked',
      sessionLimit: 'Locked Out',
      auditEntries: [
        {
          title: 'Administrative Security Suspension Enforced',
          sub: 'May 18 at 14:00 • Dual Sign-off Action',
          dotColor: 'bg-status-danger'
        }
      ]
    }
  ];
export const INITIAL_USERS = usersList;

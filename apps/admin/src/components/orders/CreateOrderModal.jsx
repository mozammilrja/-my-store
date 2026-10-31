import React, { useState } from 'react';
import { Icon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Select,
  Button,
  Checkbox,
  Separator,
} from '../ui';

export function CreateOrderModal({ isOpen, onClose, onCreateOrder, currentHub }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productType, setProductType] = useState('Everwear Artisan Silk Maxi Dress');
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Dusty Rose');
  const [price, setPrice] = useState(2799);
  const [paymentMode, setPaymentMode] = useState('Paid (Prepaid)');
  const [courier, setCourier] = useState('BlueDart Express');
  const [isExpress, setIsExpress] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !address) return;

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newOrderId = `EVR-${randomNum}-${currentHub.id.substring(0, 3)}`;

    const newOrder = {
      id: newOrderId,
      channel: 'Everwear Concierge Portal',
      orderDate: 'Just now (24 May 2024)',
      timeAgo: 'Just now',
      nodeFc: currentHub.id,
      status: 'Packed & Staged',
      stageBadge: 'READY TO HANDOVER',
      isExpress,
      expressLabel: isExpress ? '⚡ 24h Express' : undefined,
      customer: {
        name,
        shortName: name.split(' ')[0],
        email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: phone || '+91 98800•••••',
        fullPhone: phone || '+91 98800 12345',
        tier: 'VIP COUTURE',
        tierBadgeClass: 'bg-primary-fixed text-on-primary-fixed font-semibold',
        address,
        cityRegion: `${address.split(',')[0]}, India`,
        deliveryInstructions: 'Call before delivery'
      },
      items: [
        {
          id: `item-${Date.now()}`,
          name: productType,
          sku: `EVR-${size}-${color.substring(0, 3).toUpperCase()}`,
          hsn: 'HSN 6204',
          size,
          color,
          qty: 1,
          price: Number(price),
          mrp: Number(price) * 1.3,
          gstRate: '12%',
          gstAmount: (Number(price) * 0.12).toFixed(2),
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ'
        }
      ],
      itemsSummary: `1 Item (Size: ${size})`,
      totalWeight: '450g',
      boxType: 'Eco-Kraft Box with security tape',
      invoiceNumber: `EW-INV-2024-${randomNum.toString().slice(0, 5)}`,
      payment: {
        mode: paymentMode,
        status: paymentMode.includes('COD') ? 'COD Assigned' : 'Prepaid Verified',
        reference: `MANUAL::${randomNum}`,
        type: paymentMode.includes('COD') ? 'cod' : 'prepaid',
        taxableValue: (Number(price) / 1.12),
        cgst: (Number(price) * 0.06),
        sgst: (Number(price) * 0.06),
        shipping: 0,
        totalPaid: Number(price)
      },
      courier: {
        partner: courier,
        awb: `84920${Math.floor(10000 + Math.random() * 90000)}`,
        slaRemaining: '3h 30m remaining',
        slaHealthy: true,
        dock: 'Dock 4B'
      },
      currentTimelineStep: 2,
      timeline: [
        { step: 1, title: 'Order Placed & Verified', time: 'Just now', desc: 'Manual concierge order processed', done: true },
        { step: 2, title: `Allocated to ${currentHub.id}`, time: 'Just now', desc: 'Auto-staged in pick queue', isCurrent: true },
        { step: 3, title: 'Pick List Assignment', time: 'Pending', desc: 'Awaiting picker scan', done: false },
        { step: 4, title: 'QC Verification', time: 'Pending', desc: 'Garment tag RFID scan', done: false },
        { step: 5, title: 'Packing & Sealing', time: 'Pending', desc: 'Eco-mailer packaging', done: false },
        { step: 6, title: 'Carrier Manifest', time: 'Pending', desc: `${courier} staging`, done: false },
        { step: 7, title: 'In-Transit', time: 'Pending', desc: 'Hub dispatch', done: false },
        { step: 8, title: 'Out for Delivery', time: 'Pending', desc: 'Final leg routing', done: false },
        { step: 9, title: 'Delivered', time: 'Pending', desc: 'Customer doorstep handover', done: false }
      ]
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-subtle flex flex-row items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <Icon name="add_shopping_cart" className="material-symbols-outlined text-accent text-icon-lg" />
            <div>
              <DialogTitle>Create Manual Order</DialogTitle>
              <DialogDescription className="text-meta">
                Concierge expedited order routing for {currentHub.id}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            title="Close"
            aria-label="Close dialog"
          >
            <Icon name="close" className="material-symbols-outlined text-icon-md" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-space-lg space-y-4 overflow-y-auto">
          {/* Customer Information */}
          <div className="space-y-2">
            <span className="text-caption text-muted uppercase tracking-wider font-semibold">
              Consignee Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Customer Full Name *</label>
                <Input 
                  required
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shalini Roy"
                  className="h-9 text-meta"
                />
              </div>
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Mobile Contact Phone *</label>
                <Input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98800 12345"
                  className="h-9 text-meta"
                />
              </div>
            </div>
            <div>
              <label className="block text-meta font-medium text-muted mb-1">Email Address</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shalini.roy@example.com"
                className="h-9 text-meta"
              />
            </div>
            <div>
              <label className="block text-meta font-medium text-muted mb-1">Delivery Shipping Address *</label>
              <textarea 
                required
                rows="2"
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Apartment, Street name, City, State, PINCODE"
                className="w-full p-2.5 rounded-lg border border-subtle bg-surface-canvas text-meta focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <Separator />

          {/* Garment Item Selection */}
          <div className="space-y-2">
            <span className="text-caption text-muted uppercase tracking-wider font-semibold">
              Apparel Merchandising Item
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-meta font-medium text-muted mb-1">Garment Style</label>
                <Select 
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="h-9 text-meta"
                >
                  <option>Everwear Artisan Silk Maxi Dress</option>
                  <option>High-Rise Relaxed Tencel Pant</option>
                  <option>Luxe Embroidered Anarkali Kurta</option>
                  <option>Slim Tapered Raw Denim</option>
                  <option>Silk Blend Relaxed Overshirt</option>
                  <option>Pleated Emerald Midi Dress</option>
                </Select>
              </div>
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Size</label>
                <Select 
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="h-9 text-meta"
                >
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Colorway</label>
                <Input 
                  type="text" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 text-meta"
                />
              </div>
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Order Price (₹ INR)</label>
                <Input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-9 text-meta"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Fulfillment & Courier Allocation */}
          <div className="space-y-2">
            <span className="text-caption text-muted uppercase tracking-wider font-semibold">
              Logistics & Payment
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Payment Method</label>
                <Select 
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="h-9 text-meta"
                >
                  <option>Paid (Prepaid UPI)</option>
                  <option>Paid (Credit Card)</option>
                  <option>Cash on Delivery (COD)</option>
                </Select>
              </div>
              <div>
                <label className="block text-meta font-medium text-muted mb-1">3PL Courier Partner</label>
                <Select 
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="h-9 text-meta"
                >
                  <option>BlueDart Express</option>
                  <option>Delhivery Direct</option>
                  <option>Shadowfax Hyper</option>
                  <option>XpressBees Surface</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox 
                id="isExpressCheck"
                checked={isExpress}
                onChange={(e) => setIsExpress(e.target.checked)}
              />
              <label htmlFor="isExpressCheck" className="text-meta font-semibold text-primary cursor-pointer">
                ⚡ Prioritize 24h Express Dispatch from {currentHub.id}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-meta"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="gap-1.5 text-meta shadow-md"
            >
              <Icon name="check" className="material-symbols-outlined text-icon" />
              <span>Create & Dispatch Order</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

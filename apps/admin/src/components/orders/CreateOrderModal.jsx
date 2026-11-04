import React, { useState } from 'react';
import { formatDate } from '../../lib/format';
import {
  Icon,
  Button,
  Separator,
  AppDialog,
  FormField,
  FormGrid,
  Input,
  Select,
  Textarea,
} from '../ui';

const STYLES = [
  'Everwear Artisan Silk Maxi Dress',
  'High-Rise Relaxed Tencel Pant',
  'Luxe Embroidered Anarkali Kurta',
  'Slim Tapered Raw Denim',
  'Silk Blend Relaxed Overshirt',
  'Pleated Emerald Midi Dress',
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const PAYMENT_MODES = ['Paid (Prepaid UPI)', 'Paid (Credit Card)', 'Cash on Delivery (COD)'];

/**
 * A phone or walk-in order typed in by hand. There is no admin endpoint that
 * creates orders, so the result is listed in this session only; it carries
 * exactly what was entered and nothing invented (no AWB, no timeline).
 */
export function CreateOrderModal({ isOpen, onClose, onCreateOrder }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productType, setProductType] = useState(STYLES[0]);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !address) return;

    const ref = Math.floor(100000 + Math.random() * 900000);
    const priceMinor = Math.round((Number(price) || 0) * 100);
    const isCod = paymentMode.includes('COD');

    const newOrder = {
      id: `MAN-${ref}`,
      rawId: null,
      orderDate: formatDate(new Date()),
      status: 'Unfulfilled',
      customer: {
        name,
        email: email || '',
        phone: phone || null,
        address,
        city: address.split(',').map((p) => p.trim()).filter(Boolean).slice(-2, -1)[0] ?? null,
      },
      items: [
        {
          id: `item-${Date.now()}`,
          name: productType,
          variant: [size, color].filter(Boolean).join(' / ') || null,
          qty: 1,
          price: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(priceMinor / 100),
          sku: null,
          image: null,
        },
      ],
      shippingMethod: 'Manual order',
      shipment: null,
      payment: {
        type: isCod ? 'cod' : 'prepaid',
        method: isCod ? 'Cash on delivery' : 'Prepaid',
        itemSubtotal: priceMinor,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: priceMinor,
        currency: 'inr',
        paymentStatus: isCod ? 'awaiting' : 'paid',
        statusBadge: isCod ? 'Awaiting payment' : 'Paid',
        statusVariant: isCod ? 'warning' : 'success',
      },
      rawBackend: null,
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create manual order"
      description="For phone or in-store orders. Listed here for this session; it is not saved to the store."
      maxWidth="max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-order-form" variant="primary" size="sm">
            <Icon name="check" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            <span>Create order</span>
          </Button>
        </>
      }
    >
      <form id="create-order-form" onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
        <section className="flex flex-col gap-space-md">
          <h3 className="text-subheading text-primary">Customer</h3>
          <FormGrid columns={2}>
            <FormField label="Full name" required id="mo-name">
              <Input id="mo-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Shalini Roy" />
            </FormField>
            <FormField label="Phone" id="mo-phone">
              <Input id="mo-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
            </FormField>
          </FormGrid>
          <FormField label="Email" id="mo-email">
            <Input id="mo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </FormField>
          <FormField label="Delivery address" required id="mo-address">
            <Textarea
              id="mo-address"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat, street, city, state, PIN code"
            />
          </FormField>
        </section>

        <Separator />

        <section className="flex flex-col gap-space-md">
          <h3 className="text-subheading text-primary">Item</h3>
          <FormGrid columns={2}>
            <FormField label="Style" id="mo-style">
              <Select id="mo-style" value={productType} onChange={(e) => setProductType(e.target.value)}>
                {STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Size" id="mo-size">
              <Select id="mo-size" value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Colour" id="mo-colour">
              <Input id="mo-colour" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Dusty rose" />
            </FormField>
            <FormField label="Price (₹)" id="mo-price">
              <Input
                id="mo-price"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="tabular-nums"
              />
            </FormField>
          </FormGrid>
        </section>

        <Separator />

        <section className="flex flex-col gap-space-md">
          <h3 className="text-subheading text-primary">Payment</h3>
          <FormField label="Payment method" id="mo-payment">
            <Select id="mo-payment" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </FormField>
        </section>
      </form>
    </AppDialog>
  );
}

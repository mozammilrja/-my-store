/*
 * Labels for the notifications screen. The event list, which channels each
 * event uses and which provider can send come from the API; this file only
 * names them for people.
 */

export const EVENT_LABEL = {
  order_confirmed: 'Order confirmed',
  payment_received: 'Payment received',
  order_packed: 'Order packed',
  order_shipped: 'Order shipped',
  out_for_delivery: 'Out for delivery',
  delivery_otp: 'Delivery code',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  return_update: 'Return update',
  refund_processed: 'Refund processed',
  fulfilment_assigned: 'Order allocated to a warehouse',
  delivery_offered: 'Delivery offered to a rider',
  delivery_assigned: 'Delivery assigned to a rider',
  delivery_unassigned: 'Delivery taken off a rider',
};

export const CHANNEL_LABEL = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'Push' };

export const PROVIDER_LABEL = {
  smtp: 'SMTP',
  ses: 'Amazon SES',
  msg91: 'MSG91',
  twilio: 'Twilio',
  meta: 'Meta WhatsApp Cloud API',
  gupshup: 'Gupshup',
  webpush: 'Web push',
  fcm: 'Firebase Cloud Messaging',
};

export const STATUS = {
  queued: { label: 'Queued', variant: 'info' },
  sending: { label: 'Sending', variant: 'info' },
  sent: { label: 'Sent', variant: 'success' },
  skipped: { label: 'Skipped', variant: 'secondary' },
  dead: { label: 'Dead letter', variant: 'destructive' },
};

export const RECIPIENT_LABEL = { customer: 'Customer', guest: 'Guest', rider: 'Rider', warehouse: 'Warehouse staff' };

/**
 * SMS and WhatsApp template variables, in the order the API sends them
 * (lib/notify/templates.ts `params`; also in docs/NOTIFICATIONS.md). A
 * provider template has to be registered with its variables in this order.
 */
export const TEMPLATE_VARIABLES = {
  order_confirmed: ['first name', 'order number (#1042)', 'total (Rs 1,999.00)'],
  payment_received: ['order number', 'amount'],
  order_packed: ['order number'],
  order_shipped: ['order number', 'courier', 'AWB'],
  out_for_delivery: ['order number', 'rider first name or courier'],
  delivery_otp: ['delivery code', 'order number'],
  delivered: ['order number'],
  delivery_failed: ['order number', 'reason'],
  return_update: ['return code (RET-1042-1)', 'status'],
  refund_processed: ['amount', 'order number'],
  fulfilment_assigned: ['fulfilment code', 'warehouse code'],
  delivery_offered: ['area', 'cash to collect, or "prepaid"'],
  delivery_assigned: ['AWB'],
  delivery_unassigned: ['AWB'],
};

export const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

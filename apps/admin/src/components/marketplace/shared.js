import { formatMoney } from '../../lib/format';

export const SELLER_STATUS = {
  draft: { label: 'Filling in details', variant: 'secondary' },
  submitted: { label: 'Awaiting review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export const LEDGER_KIND = {
  sale: 'Sales',
  commission: 'Commission',
  commission_gst: 'GST on commission',
  fulfilment_fee: 'Fulfilment fee',
  fulfilment_fee_gst: 'GST on fulfilment fee',
  tcs: 'TCS (GST s.52)',
  tds: 'TDS (IT s.194-O)',
};

export const BUSINESS_TYPE = { individual: 'Individual', proprietorship: 'Proprietorship', partnership: 'Partnership', llp: 'LLP', company: 'Company' };

export const money = (minor, currency = 'inr') => formatMoney(minor ?? 0, currency);
export const when = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** What each admin role may do here, mirroring the API's role checks. */
export function marketplaceRights(role) {
  const owner = role === 'owner';
  return {
    review: owner || role === 'store_admin',
    verify: owner || role === 'store_admin' || role === 'finance_manager',
    listings: owner || role === 'store_admin' || role === 'catalog_manager',
    finance: owner || role === 'finance_manager',
    settings: owner,
  };
}

export const UTR = /^[A-Z0-9]{12,22}$/;

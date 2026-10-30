/**
 * Everwear formatting utilities
 * Handles integer minor units (paise/cents) to localized currency strings.
 */

export function formatMoney(amountMinor, currency = 'inr') {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) {
    return '₹0.00';
  }
  const major = amountMinor / 100;
  const curr = (currency || 'inr').toUpperCase();

  try {
    return new Intl.NumberFormat(curr === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${curr} ${major.toFixed(2)}`;
  }
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

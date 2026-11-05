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

/**
 * Axis ticks and chart labels need the shape of the number, not its paise.
 * `en-IN` compacts on the Indian scale (K, L, Cr), which is what an operator
 * reading an Indian P&L expects to see.
 */
export function formatMoneyCompact(amountMinor, currency = 'inr') {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) return '0';
  const major = amountMinor / 100;
  const curr = (currency || 'inr').toUpperCase();
  try {
    return new Intl.NumberFormat(curr === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: curr,
      notation: 'compact',
      maximumFractionDigits: major >= 1000 ? 1 : 0,
    }).format(major);
  } catch {
    return `${curr} ${Math.round(major)}`;
  }
}

export function formatCount(value) {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
}

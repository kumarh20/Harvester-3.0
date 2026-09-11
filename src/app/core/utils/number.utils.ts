/**
 * Shared Number and Currency Formatting Utilities (Indian Locale).
 */

export function formatIndianCurrency(amount?: number | null): string {
  return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
}

export function formatIndianNumber(val?: number | null): string {
  return (val || 0).toLocaleString('en-IN');
}

export function formatRate(rate?: number | null, unit = 'Ac'): string {
  return '₹' + Math.round(rate || 0).toLocaleString('en-IN') + '/' + unit;
}

/**
 * Shared String and Messaging Utilities.
 */

export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  return digits;
}

export function openWhatsAppChat(phone?: string | null, message?: string): void {
  const clean = cleanPhoneNumber(phone);
  const text = message ? encodeURIComponent(message) : '';
  if (clean) {
    window.open(`https://wa.me/${clean}${text ? '?text=' + text : ''}`, '_blank');
  } else if (text) {
    window.open(`https://wa.me/?text=${text}`, '_blank');
  } else {
    window.open('https://wa.me/', '_blank');
  }
}

/**
 * Indian Phone Number Normalization and Validation Utility
 * Accepts formats:
 * - 10 digits: 9876543210
 * - Country code with +: +91 98765 43210, +91-9876543210, +919876543210
 * - Country code without +: 919876543210
 * - Leading zero: 09876543210
 * - Internal spaces/dashes/brackets: +91 (987) 654-3210
 * Normalizes valid numbers to strictly: +91XXXXXXXXXX
 */
export const normalizeIndianPhone = (phone) => {
  if (typeof phone !== 'string') return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Extract all digits
  const digits = trimmed.replace(/\D/g, '');
  let subscriber = digits;

  if (digits.length === 12 && digits.startsWith('91')) {
    subscriber = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    subscriber = digits.slice(1);
  }

  // An Indian mobile phone number must be exactly 10 digits starting with 6, 7, 8, or 9
  if (subscriber.length === 10 && /^[6-9]/.test(subscriber)) {
    return `+91${subscriber}`;
  }

  return null;
};

export const isValidIndianPhone = (phone) => {
  return normalizeIndianPhone(phone) !== null;
};

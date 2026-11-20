import { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from 'libphonenumber-js';

/**
 * Numbers without a +country prefix are read as Australian (e.g. "0412 345 678").
 * International numbers must start with "+" (e.g. "+91 98765 43210").
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';

export const PHONE_ERROR = 'Enter a valid phone number, e.g. 0412 345 678 or +61 412 345 678';

/**
 * Checks the number against real numbering plans (country code, length and
 * prefix), not just the characters used, so "12345" or "0000000000" fail.
 */
export function isValidPhone(value: string): boolean {
  return isValidPhoneNumber(value, DEFAULT_PHONE_COUNTRY);
}

/** "0412345678" -> "+61 412 345 678" so the sales team can always dial it. */
export function formatPhoneInternational(value: string): string {
  return parsePhoneNumber(value, DEFAULT_PHONE_COUNTRY).formatInternational();
}

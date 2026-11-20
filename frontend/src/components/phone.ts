import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

// Same rule as the backend (backend/src/enquiry/phone.ts), which stays the
// authority: numbers without a "+" prefix are read as Australian.
const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';

export const PHONE_ERROR = 'Enter a valid phone number, e.g. 0412 345 678 or +61 412 345 678';

export function isValidPhone(value: string): boolean {
  return isValidPhoneNumber(value, DEFAULT_PHONE_COUNTRY);
}

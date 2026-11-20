import {
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

/** Used when the client doesn't send a country (Officeworks customers are mostly in Australia). */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';

export const PHONE_COUNTRY_ERROR = 'Choose a valid country code';
export const PHONE_ERROR = 'Enter a valid phone number for the selected country code';
export const PHONE_NO_PLUS_ERROR = 'Choose the country code from the list instead of typing "+"';

/** National number: digits plus common separators only. The country comes from the separate field. */
const NATIONAL_NUMBER_PATTERN = /^[\d\s().-]+$/;

export function isPhoneCountry(value: string): value is CountryCode {
  return isSupportedCountry(value);
}

export function hasOnlyNationalNumberChars(number: string): boolean {
  return NATIONAL_NUMBER_PATTERN.test(number);
}

/**
 * Checks the number against the selected country's real numbering plan
 * (length and prefixes), so "12345" or an Indian number under "Australia" fail.
 */
export function isValidPhone(number: string, country: CountryCode): boolean {
  return hasOnlyNationalNumberChars(number) && isValidPhoneNumber(number, country);
}

/** ("0412345678", "AU") -> "+61 412 345 678", so the sales team can always dial it. */
export function formatPhoneInternational(number: string, country: CountryCode): string {
  return parsePhoneNumber(number, country).formatInternational();
}

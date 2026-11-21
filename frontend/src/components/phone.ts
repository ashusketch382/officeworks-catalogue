import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

// Same rules as the backend (backend/src/enquiry/phone.ts), which stays the
// authority. The country comes from its own field; the number is national.

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';
export const PHONE_NO_PLUS_ERROR = 'Choose the country code from the list instead of typing "+"';

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** Every country libphonenumber knows, as "Australia +61", sorted by name. */
export const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({ code, name: regionNames.of(code) ?? code, dialCode: `+${getCountryCallingCode(code)}` }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function countryName(code: CountryCode): string {
  return regionNames.of(code) ?? code;
}

/** A realistic example in the country's own format, e.g. "0412 345 678" for Australia. */
export function examplePhone(code: CountryCode): string {
  return getExampleNumber(code, examples)?.formatNational() ?? '';
}

/** Returns an error message, or undefined when the number is valid (or empty). */
export function phoneError(number: string, country: CountryCode): string | undefined {
  const value = number.trim();
  if (!value) return undefined;
  if (value.startsWith('+')) return PHONE_NO_PLUS_ERROR;
  if (!/^[\d\s().-]+$/.test(value) || !isValidPhoneNumber(value, country)) {
    const example = examplePhone(country);
    return `Enter a valid phone number for ${countryName(country)}${example ? `, e.g. ${example}` : ''}`;
  }
  return undefined;
}

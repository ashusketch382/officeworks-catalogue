import { useState, type FormEvent } from 'react';
import { ApiError, api as defaultApi, type Api } from '../api/client';
import type { EnquiryRequest, FieldErrors } from '../api/types';
import type { CountryCode } from 'libphonenumber-js';
import { COUNTRY_OPTIONS, DEFAULT_PHONE_COUNTRY, examplePhone, phoneError } from './phone';

type Fields = Required<Omit<EnquiryRequest, 'productId' | 'phoneCountry'>> & { phoneCountry: CountryCode };

const EMPTY: Fields = { name: '', email: '', phoneCountry: DEFAULT_PHONE_COUNTRY, phone: '', message: '', website: '' };

/** Client-side checks for fast feedback. The server validates again. */
export function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = ['Name is required'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = ['Enter a valid email address'];
  const phone = phoneError(fields.phone, fields.phoneCountry);
  if (phone) errors.phone = [phone];
  return errors;
}

export function EnquiryForm({
  productId,
  productTitle,
  onCancel,
  api = defaultApi,
}: {
  productId: string;
  productTitle: string;
  onCancel: () => void;
  api?: Pick<Api, 'submitEnquiry'>;
}) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState<string>();

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const clientErrors = validate(fields);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await api.submitEnquiry({ productId, ...fields });
      setThankYou(res.message);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (thankYou) {
    return (
      <div className="thank-you" role="status">
        <h2>Thank you</h2>
        <p>{thankYou}</p>
      </div>
    );
  }

  const fieldError = (key: keyof Fields) =>
    errors[key]?.[0] ? (
      <span className="field-error" id={`${key}-error`}>
        {errors[key]?.[0]}
      </span>
    ) : null;

  return (
    <form className="enquiry" onSubmit={onSubmit} noValidate aria-label="Product enquiry">
      <h2>Enquire about {productTitle}</h2>

      <label>
        Name *
        <input
          value={fields.name}
          onChange={set('name')}
          autoComplete="name"
          maxLength={100}
          aria-invalid={!!errors.name}
          aria-describedby="name-error"
        />
        {fieldError('name')}
      </label>

      <label>
        Email *
        <input
          type="email"
          value={fields.email}
          onChange={set('email')}
          autoComplete="email"
          maxLength={254}
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
        />
        {fieldError('email')}
      </label>

      <fieldset className="phone">
        <legend>Phone</legend>
        <div className="phone-row">
          <label>
            <span className="visually-hidden">Country code</span>
            <select
              value={fields.phoneCountry}
              onChange={(e) => {
                const phoneCountry = e.target.value as CountryCode;
                setFields((f) => ({ ...f, phoneCountry }));
                setErrors(({ phone: _cleared, ...rest }) => rest);
              }}
              autoComplete="tel-country-code"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} {c.dialCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder={examplePhone(fields.phoneCountry)}
              value={fields.phone}
              onChange={set('phone')}
              autoComplete="tel-national"
              maxLength={30}
              aria-invalid={!!errors.phone}
              aria-describedby="phone-error"
            />
          </label>
        </div>
        {fieldError('phone')}
      </fieldset>

      <label>
        Message
        <textarea value={fields.message} onChange={set('message')} rows={4} maxLength={2000} />
      </label>

      {/* Honeypot: hidden from people and assistive tech, often filled by bots. */}
      <input
        className="visually-hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        name="website"
        value={fields.website}
        onChange={set('website')}
      />

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send enquiry'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import { EnquiryForm } from '../src/components/EnquiryForm';

function setup(submitEnquiry = vi.fn().mockResolvedValue({ message: 'Thank you! Our sales team will be in touch soon.' })) {
  render(<EnquiryForm productId="3" productTitle="Mens Cotton Jacket" onCancel={() => {}} api={{ submitEnquiry }} />);
  return { submitEnquiry, user: userEvent.setup() };
}

describe('EnquiryForm', () => {
  it('submits contact details and shows a thank-you message', async () => {
    const { submitEnquiry, user } = setup();

    await user.type(screen.getByLabelText(/name/i), 'Jane Citizen');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Is this in stock?');
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(submitEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ productId: '3', name: 'Jane Citizen', email: 'jane@example.com', message: 'Is this in stock?' }),
    );
    expect(await screen.findByRole('heading', { name: /thank you/i })).toBeInTheDocument();
  });

  it('shows validation errors and does not call the API for invalid input', async () => {
    const { submitEnquiry, user } = setup();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(submitEnquiry).not.toHaveBeenCalled();
  });

  describe('phone (country code + number)', () => {
    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, phone: string, country?: string) {
      await user.type(screen.getByLabelText(/name/i), 'Jane');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      if (country) await user.selectOptions(screen.getByLabelText('Country code'), country);
      await user.type(screen.getByLabelText('Phone number'), phone);
      await user.click(screen.getByRole('button', { name: /send enquiry/i }));
    }

    it('defaults the country code to Australia +61 with an Australian example', () => {
      setup();
      expect(screen.getByLabelText('Country code')).toHaveValue('AU');
      expect(screen.getByRole('option', { name: 'Australia +61' })).toBeInTheDocument();
      expect(screen.getByLabelText('Phone number')).toHaveAttribute('placeholder', '0412 345 678');
    });

    it.each(['12345', '0000000000', '98765 43210'])('rejects %j under Australia', async (phone) => {
      const { submitEnquiry, user } = setup();
      await fillAndSubmit(user, phone);

      expect(screen.getByText(/enter a valid phone number for australia, e\.g\. 0412 345 678/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true');
      expect(submitEnquiry).not.toHaveBeenCalled();
    });

    it('asks for the dropdown instead of a typed "+" country code', async () => {
      const { submitEnquiry, user } = setup();
      await fillAndSubmit(user, '+61 412 345 678');

      expect(screen.getByText(/choose the country code from the list/i)).toBeInTheDocument();
      expect(submitEnquiry).not.toHaveBeenCalled();
    });

    it('sends the country code and number for a real Australian mobile', async () => {
      const { submitEnquiry, user } = setup();
      await fillAndSubmit(user, '0412 345 678');

      expect(submitEnquiry).toHaveBeenCalledWith(expect.objectContaining({ phoneCountry: 'AU', phone: '0412 345 678' }));
    });

    it('validates against the selected country (India)', async () => {
      const { submitEnquiry, user } = setup();
      await fillAndSubmit(user, '98765 43210', 'IN');

      expect(submitEnquiry).toHaveBeenCalledWith(expect.objectContaining({ phoneCountry: 'IN', phone: '98765 43210' }));
    });

    it('rejects an Australian number when India is selected', async () => {
      const { submitEnquiry, user } = setup();
      await fillAndSubmit(user, '0412 345 678', 'IN');

      expect(screen.getByText(/enter a valid phone number for india/i)).toBeInTheDocument();
      expect(submitEnquiry).not.toHaveBeenCalled();
    });
  });

  it('shows server errors and keeps the form so the customer can retry', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new ApiError('Too many enquiries, please try again later.', 429)));

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many enquiries/i);
    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeEnabled();
  });
});

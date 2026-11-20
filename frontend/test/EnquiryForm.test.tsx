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

  it.each(['12345', '0000000000', '+1 555 0100'])('rejects the made-up phone number %j', async (phone) => {
    const { submitEnquiry, user } = setup();

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/phone/i), phone);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toHaveAttribute('aria-invalid', 'true');
    expect(submitEnquiry).not.toHaveBeenCalled();
  });

  it('accepts a real Australian mobile number', async () => {
    const { submitEnquiry, user } = setup();

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/phone/i), '0412 345 678');
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(submitEnquiry).toHaveBeenCalledWith(expect.objectContaining({ phone: '0412 345 678' }));
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

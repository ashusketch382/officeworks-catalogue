import { z } from 'zod';
import type { CatalogueService } from '../catalogue/catalogueService.js';
import type { EmailProvider } from './emailProvider.js';

/**
 * Enquiry input. Validated on the server regardless of client-side checks.
 * `website` is a honeypot: humans never see it, naive bots fill it in.
 */
export const enquirySchema = z.object({
  productId: z.string().trim().min(1, 'Product is required').max(64),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s()-]*$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  website: z.string().optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export interface EnquiryConfig {
  salesInbox: string;
  fromAddress: string;
}

/** Strip CR/LF so user input can never inject extra email headers. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export class EnquiryService {
  constructor(
    private readonly catalogue: CatalogueService,
    private readonly email: EmailProvider,
    private readonly config: EnquiryConfig,
  ) {}

  /**
   * Looks up the product server-side (so the email never trusts a
   * client-supplied title or price) and emails the sales inbox.
   */
  async submit(input: EnquiryInput): Promise<{ delivered: boolean }> {
    if (input.website) {
      // Honeypot tripped: pretend success so bots get no signal.
      return { delivered: false };
    }

    const product = await this.catalogue.getProduct(input.productId);
    const name = singleLine(input.name);

    await this.email.send({
      to: this.config.salesInbox,
      from: this.config.fromAddress,
      replyTo: singleLine(input.email),
      subject: singleLine(`New enquiry: ${product.title} (#${product.id})`),
      text: [
        'A customer has enquired about a product.',
        '',
        `Product: ${product.title}`,
        `Product ID: ${product.id}`,
        `Listed price: ${product.price.amount.toFixed(2)} ${product.price.currency}`,
        '',
        `Name: ${name}`,
        `Email: ${singleLine(input.email)}`,
        `Phone: ${input.phone ? singleLine(input.phone) : '(not provided)'}`,
        '',
        'Message:',
        input.message || '(none)',
      ].join('\n'),
    });

    return { delivered: true };
  }
}

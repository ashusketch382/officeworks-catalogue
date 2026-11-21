import { CatalogueService } from './catalogue/catalogueService.js';
import { FakeStoreSource } from './catalogue/fakeStoreSource.js';
import type { AppConfig } from './config/config.js';
import { ConsoleEmailProvider, SmtpEmailProvider, type EmailProvider } from './enquiry/emailProvider.js';
import { EnquiryService } from './enquiry/enquiryService.js';

/**
 * Composition root: the only place that knows which concrete adapters are
 * used. Changing the product source or email provider happens here + config.
 */
export function buildContainer(config: AppConfig) {
  const source = new FakeStoreSource({
    baseUrl: config.PRODUCT_SOURCE_URL,
    timeoutMs: config.PRODUCT_SOURCE_TIMEOUT_MS,
    cacheTtlMs: config.PRODUCT_CACHE_TTL_MS,
    currency: config.CURRENCY,
  });

  const catalogue = new CatalogueService(source, {
    featuredProductIds: config.FEATURED_PRODUCT_IDS,
    categoryTopRatedCount: config.CATEGORY_TOP_RATED_COUNT,
  });

  const email: EmailProvider =
    config.EMAIL_PROVIDER === 'smtp'
      ? new SmtpEmailProvider({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        })
      : new ConsoleEmailProvider();

  const enquiries = new EnquiryService(catalogue, email, {
    salesInbox: config.SALES_INBOX,
    fromAddress: config.EMAIL_FROM,
  });

  return { catalogue, enquiries, email };
}

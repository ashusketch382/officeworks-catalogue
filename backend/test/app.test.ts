import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogueService } from '../src/catalogue/catalogueService.js';
import { UpstreamError } from '../src/catalogue/fakeStoreSource.js';
import type { ProductSource } from '../src/catalogue/types.js';
import { EnquiryService } from '../src/enquiry/enquiryService.js';
import { createApp } from '../src/http/app.js';
import { InMemorySource, RecordingEmailProvider } from './fixtures.js';

const silentLogger = { info() {}, warn() {}, error() {} };

function buildApp(source: ProductSource = new InMemorySource(), rateLimit = 100) {
  const email = new RecordingEmailProvider();
  const catalogue = new CatalogueService(source, { featuredProductIds: ['5', '1', '3', '4', '2'], categoryTopRatedCount: 2 });
  const enquiries = new EnquiryService(catalogue, email, {
    salesInbox: 'sales@shop.test',
    fromAddress: 'no-reply@shop.test',
  });
  const app = createApp({
    catalogue,
    enquiries,
    corsOrigin: 'http://localhost:5173',
    enquiryRateLimitPer15Min: rateLimit,
    logger: silentLogger,
  });
  return { app, email };
}

const validEnquiry = {
  productId: '1',
  name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '0412 345 678',
  message: 'Is this in stock?',
};

describe('HTTP API', () => {
  let ctx: ReturnType<typeof buildApp>;
  beforeEach(() => {
    ctx = buildApp();
  });

  it('GET /api/products/featured returns the 5 chosen products', async () => {
    const res = await request(ctx.app).get('/api/products/featured').expect(200);
    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['5', '1', '3', '4', '2']);
  });

  it('GET /api/categories lists categories', async () => {
    const res = await request(ctx.app).get('/api/categories').expect(200);
    expect(res.body.categories.map((c: { slug: string }) => c.slug).sort()).toEqual(['electronics', 'jewelery']);
  });

  it('GET /api/categories/:slug returns top rated and other products', async () => {
    const res = await request(ctx.app).get('/api/categories/electronics').expect(200);
    expect(res.body.topRated).toHaveLength(2);
    expect(res.body.others).toHaveLength(2);
  });

  it('GET /api/categories/:slug 404s for unknown categories', async () => {
    await request(ctx.app).get('/api/categories/unknown').expect(404);
  });

  it('GET /api/products/search filters by search term', async () => {
    const res = await request(ctx.app).get('/api/products/search').query({ q: 'gold' }).expect(200);
    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['5']);
  });

  it('GET /api/products/search rejects a missing term', async () => {
    await request(ctx.app).get('/api/products/search').expect(400);
  });

  it('GET /api/products/:id returns product details or 404', async () => {
    const res = await request(ctx.app).get('/api/products/1').expect(200);
    expect(res.body.product.title).toBe('Portable SSD 1TB');
    await request(ctx.app).get('/api/products/999').expect(404);
  });

  it('returns 502 with a safe message when the product source is down', async () => {
    const failing: ProductSource = {
      listProducts: () => Promise.reject(new UpstreamError('boom')),
      getProduct: () => Promise.reject(new UpstreamError('boom')),
      listCategories: () => Promise.reject(new UpstreamError('boom')),
    };
    const res = await request(buildApp(failing).app).get('/api/products/featured').expect(502);
    expect(res.body.message).toBe('Products are temporarily unavailable.');
  });

  describe('POST /api/enquiries', () => {
    it('emails the sales inbox and returns a thank-you message', async () => {
      const res = await request(ctx.app).post('/api/enquiries').send(validEnquiry).expect(202);
      expect(res.body.message).toMatch(/thank you/i);

      expect(ctx.email.sent).toHaveLength(1);
      const [mail] = ctx.email.sent;
      expect(mail?.to).toBe('sales@shop.test');
      expect(mail?.replyTo).toBe('jane@example.com');
      expect(mail?.subject).toContain('Portable SSD 1TB');
      expect(mail?.text).toContain('Jane Citizen');
      expect(mail?.text).toContain('Is this in stock?');
    });

    it('rejects invalid contact details without sending email', async () => {
      const res = await request(ctx.app)
        .post('/api/enquiries')
        .send({ ...validEnquiry, email: 'not-an-email', name: '' })
        .expect(400);
      expect(res.body.details).toHaveProperty('email');
      expect(res.body.details).toHaveProperty('name');
      expect(ctx.email.sent).toHaveLength(0);
    });

    it.each(['12345', '0000000000', '1234567', '+1 555 0100', 'abc', '0412'])(
      'rejects the made-up phone number %j without sending email',
      async (phone) => {
        const res = await request(ctx.app).post('/api/enquiries').send({ ...validEnquiry, phone }).expect(400);
        expect(res.body.details.phone).toEqual([expect.stringMatching(/valid phone number/i)]);
        expect(ctx.email.sent).toHaveLength(0);
      },
    );

    it.each([
      ['0412 345 678', '+61 412 345 678'],
      ['(02) 9876 5432', '+61 2 9876 5432'],
      ['+91 98765 43210', '+91 98765 43210'],
    ])('accepts the real phone number %j and emails it as %j', async (phone, formatted) => {
      await request(ctx.app).post('/api/enquiries').send({ ...validEnquiry, phone }).expect(202);
      expect(ctx.email.sent[0]?.text).toContain(`Phone: ${formatted}`);
    });

    it('accepts an enquiry with no phone number (phone is optional)', async () => {
      const { phone: _omit, ...withoutPhone } = validEnquiry;
      await request(ctx.app).post('/api/enquiries').send({ ...withoutPhone, phone: '' }).expect(202);
      expect(ctx.email.sent[0]?.text).toContain('Phone: (not provided)');
    });

    it('404s for an unknown product without sending email', async () => {
      await request(ctx.app).post('/api/enquiries').send({ ...validEnquiry, productId: '999' }).expect(404);
      expect(ctx.email.sent).toHaveLength(0);
    });

    it('strips newlines so user input cannot inject email headers', async () => {
      await request(ctx.app)
        .post('/api/enquiries')
        .send({ ...validEnquiry, name: 'Jane\r\nBcc: victim@example.com' })
        .expect(202);
      expect(ctx.email.sent[0]?.text).toContain('Name: Jane Bcc: victim@example.com');
      expect(ctx.email.sent[0]?.subject).not.toMatch(/[\r\n]/);
    });

    it('silently drops honeypot submissions', async () => {
      await request(ctx.app).post('/api/enquiries').send({ ...validEnquiry, website: 'spam.example' }).expect(202);
      expect(ctx.email.sent).toHaveLength(0);
    });

    it('rate limits repeated submissions', async () => {
      const { app } = buildApp(new InMemorySource(), 2);
      await request(app).post('/api/enquiries').send(validEnquiry).expect(202);
      await request(app).post('/api/enquiries').send(validEnquiry).expect(202);
      await request(app).post('/api/enquiries').send(validEnquiry).expect(429);
    });

    it('rejects malformed JSON with 400', async () => {
      await request(ctx.app)
        .post('/api/enquiries')
        .set('content-type', 'application/json')
        .send('{"bad json')
        .expect(400);
    });
  });
});

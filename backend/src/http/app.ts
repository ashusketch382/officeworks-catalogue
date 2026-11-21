import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { NotFoundError, type CatalogueService } from '../catalogue/catalogueService.js';
import { UpstreamError } from '../catalogue/fakeStoreSource.js';
import { enquirySchema, type EnquiryService } from '../enquiry/enquiryService.js';

export interface AppDeps {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  corsOrigin: string;
  enquiryRateLimitPer15Min: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/** Wrap async handlers so rejected promises reach the error middleware. */
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search term is required').max(100),
});

export function createApp(deps: AppDeps) {
  const { catalogue, enquiries, logger = console } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigin.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  api.get(
    '/products/featured',
    asyncHandler(async (_req, res) => {
      const { products, missingIds } = await catalogue.getFeatured();
      if (missingIds.length > 0) {
        logger.warn(`Featured product IDs not found in source: ${missingIds.join(', ')}`);
      }
      res.json({ products });
    }),
  );

  api.get(
    '/products/search',
    asyncHandler(async (req, res) => {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'ValidationError', details: parsed.error.flatten().fieldErrors });
        return;
      }
      const products = await catalogue.search(parsed.data.q);
      res.json({ query: parsed.data.q, products });
    }),
  );

  api.get(
    '/products/:id',
    asyncHandler(async (req, res) => {
      const product = await catalogue.getProduct(String(req.params.id));
      res.json({ product });
    }),
  );

  api.get(
    '/categories',
    asyncHandler(async (_req, res) => {
      res.json({ categories: await catalogue.listCategories() });
    }),
  );

  api.get(
    '/categories/:slug',
    asyncHandler(async (req, res) => {
      res.json(await catalogue.getCategory(String(req.params.slug)));
    }),
  );

  const enquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: deps.enquiryRateLimitPer15Min,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'TooManyRequests', message: 'Too many enquiries, please try again later.' },
  });

  api.post(
    '/enquiries',
    enquiryLimiter,
    asyncHandler(async (req, res) => {
      const parsed = enquirySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'ValidationError', details: parsed.error.flatten().fieldErrors });
        return;
      }
      await enquiries.submit(parsed.data);
      res.status(202).json({ message: 'Thank you! Our sales team will be in touch soon.' });
    }),
  );

  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json({ error: 'NotFound', message: 'Route not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: 'NotFound', message: err.message });
      return;
    }
    if (err instanceof UpstreamError) {
      logger.error(err, err.cause);
      res.status(502).json({ error: 'UpstreamUnavailable', message: 'Products are temporarily unavailable.' });
      return;
    }
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      res.status(400).json({ error: 'BadRequest', message: 'Invalid request body' });
      return;
    }
    logger.error(err);
    res.status(500).json({ error: 'InternalError', message: 'Something went wrong.' });
  };
  app.use(errorHandler);

  return app;
}

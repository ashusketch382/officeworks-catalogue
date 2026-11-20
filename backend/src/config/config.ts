import { z } from 'zod';

/**
 * All runtime configuration comes from environment variables, validated once
 * at startup. Missing/invalid config fails fast with a clear message.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  PRODUCT_SOURCE_URL: z.string().url().default('https://fakestoreapi.com'),
  PRODUCT_SOURCE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  PRODUCT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(5 * 60 * 1000),
  CURRENCY: z.string().length(3).default('AUD'),

  FEATURED_PRODUCT_IDS: z
    .string()
    .default('3,5,11,12,18')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  CATEGORY_TOP_RATED_COUNT: z.coerce.number().int().positive().default(3),

  EMAIL_PROVIDER: z.enum(['smtp', 'console']).default('console'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SALES_INBOX: z.string().email().default('sales@example.com'),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),

  ENQUIRY_RATE_LIMIT_PER_15_MIN: z.coerce.number().int().positive().default(10),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}

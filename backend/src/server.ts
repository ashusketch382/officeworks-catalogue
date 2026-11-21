import 'dotenv/config';
import { loadConfig } from './config/config.js';
import { buildContainer } from './container.js';
import { createApp } from './http/app.js';

const config = loadConfig();
const { catalogue, enquiries, email } = buildContainer(config);

const app = createApp({
  catalogue,
  enquiries,
  corsOrigin: config.CORS_ORIGIN,
  enquiryRateLimitPer15Min: config.ENQUIRY_RATE_LIMIT_PER_15_MIN,
});

const server = app.listen(config.PORT, () => {
  console.info(
    `API listening on http://localhost:${config.PORT} (product source: ${config.PRODUCT_SOURCE_URL}, email: ${email.name})`,
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

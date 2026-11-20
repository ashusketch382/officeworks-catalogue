# Product Catalogue PoC

A small product catalogue where customers can browse featured products, browse by category, search, view product details and send an enquiry that emails the sales inbox.

- **Client:** React + TypeScript (Vite)
- **Backend:** Node.js + TypeScript (Express)
- **Product data:** [Fake Store API](https://fakestoreapi.com), reached **only through the backend**
- **Email:** SMTP via a swappable provider. Locally this is [Mailpit](https://mailpit.axllent.org/) (free, no account needed) or the console.

Also see [DECISIONS.md](DECISIONS.md) (assumptions, trade-offs, what's next) and [AI_USAGE.md](AI_USAGE.md) (how AI tools were used and reviewed).

## Run it

### Option A: Docker (one command)

Requires Docker Desktop.

```bash
docker compose up --build
```

| What | URL |
|---|---|
| App | http://localhost:8080 |
| Sales inbox (Mailpit) | http://localhost:8025 |
| API health | http://localhost:4000/api/health |

Submit an enquiry in the app, then open the Mailpit inbox to see the email.

### Option B: Node only (no Docker)

Requires Node.js 20+.

```bash
npm install
npm run dev
```

- App: http://localhost:5173 (Vite proxies `/api` to the backend on port 4000)
- With no SMTP server configured, enquiry emails are **printed in the terminal** (console email provider).

To send real SMTP mail without Docker, copy `backend/.env.example` to `backend/.env`, then set `EMAIL_PROVIDER=smtp` and point `SMTP_*` at any SMTP server.

## Test

```bash
npm test          # backend (Vitest + Supertest) and frontend (Vitest + Testing Library)
npm run typecheck
```

Tests don't call the real Fake Store API or send email. They use an in-memory product source and a recording email provider.

## Configuration

All configuration is environment variables, validated at startup (`backend/src/config/config.ts`). See [`backend/.env.example`](backend/.env.example). Every value has a safe default, so no `.env` is needed to run locally. No secrets are committed.

| Variable | Default | Purpose |
|---|---|---|
| `FEATURED_PRODUCT_IDS` | `3,5,11,12,18` | The 5 products the merchandiser chose as "top rated" for the home page, in display order |
| `CATEGORY_TOP_RATED_COUNT` | `3` | How many top-rated products to highlight on each category page |
| `PRODUCT_SOURCE_URL` | `https://fakestoreapi.com` | Upstream product source |
| `PRODUCT_CACHE_TTL_MS` | `300000` | In-memory product cache TTL |
| `EMAIL_PROVIDER` | `console` | `console` or `smtp` (docker compose sets `smtp` → Mailpit) |
| `SALES_INBOX` | `sales@example.com` | Where enquiries are sent |
| `ENQUIRY_RATE_LIMIT_PER_15_MIN` | `10` | Per-IP enquiry rate limit |

## Why this stack

- **React + TypeScript web**, not native mobile: it's the fastest thing for the entrepreneur to click around in, it runs anywhere with no emulator, and TypeScript is shared with the backend.
- **Node.js + TypeScript backend**, not Laravel: one language across the stack, and the domain types are mirrored in the client.

## Architecture

```
React client ──/api──▶ Express routes ──▶ CatalogueService ──▶ ProductSource (port)
                              │                                   └─ FakeStoreSource (adapter, cached, validated)
                              └────────▶ EnquiryService ───────▶ EmailProvider (port)
                                                                   ├─ SmtpEmailProvider (Mailpit / SES SMTP / …)
                                                                   └─ ConsoleEmailProvider (dev fallback)
```

```
backend/src/
  catalogue/      domain types, business rules, Fake Store adapter
  enquiry/        enquiry validation + email provider port/adapters
  http/app.ts     routes, validation, security middleware, error mapping
  config/         env parsing and validation
  container.ts    composition root: the one place adapters are chosen
frontend/src/
  api/            the only code that talks HTTP
  components/     layout, tiles, enquiry form
  pages/          home, category, search, product
```

### API

| Method | Path | Description |
|---|---|---|
| GET | `/api/products/featured` | The 5 chosen "top rated" products |
| GET | `/api/categories` | All categories |
| GET | `/api/categories/:slug` | `{ category, topRated, others }` |
| GET | `/api/products/search?q=` | Products matching every word of `q` |
| GET | `/api/products/:id` | Product details |
| POST | `/api/enquiries` | Validates, emails the sales inbox, returns a thank-you message |
| GET | `/api/health` | Liveness |

# Decisions and assumptions

## Assumptions (where the acceptance criteria left gaps)

| Gap | Assumption | Why |
|---|---|---|
| **"I have chosen 5 products to be top rated"**: who chooses, and how? | A merchandiser picks them via config (`FEATURED_PRODUCT_IDS`). They're shown in the chosen order. | "I have chosen" implies a human decision, not an algorithm. Config is the smallest thing that works today. It moves to a CMS/admin screen later without changing the API. |
| A chosen product no longer exists upstream | Skip it and log a warning. Don't break the home page. | A stale config shouldn't take the home page down. |
| **Category page "top rated"**: chosen or computed? | Computed: the top 3 by average rating (more reviews breaks ties), configurable via `CATEGORY_TOP_RATED_COUNT`. Everything else in the category is shown under "More in …". | Unlike the home page, this criterion doesn't say "I have chosen", and hand-picking per category doesn't scale. |
| **Search "text matching"** | Case-insensitive. Every word in the query must appear in the title, description or category name (AND, not OR). | AND matches "only see products that match" better than OR, which widens results with each word. |
| Empty search | The button does nothing on the client, and the API returns 400. | Nothing sensible to search for. |
| **Enquiry "contact details"** | Name and email required. Phone and message optional. | Email is needed to reply. Phone is common but not essential. |
| **What counts as a valid phone number?** | It must be a real number under the national numbering plan, checked with `libphonenumber-js`: correct length and prefix, not just digits. Numbers without `+` are read as **Australian** (`0412 345 678`, `(02) 9876 5432`). Other countries need the `+` prefix (`+91 98765 43210`). The email to sales shows it in international format. Same rule on client and server; the server is the authority. | Officeworks customers are mostly Australian. A character-only regex let made-up numbers like `12345` through, which wastes the sales team's time. |
| Enquiry about which product? | The client sends only the product ID. The backend looks up the title and price itself. | The email never trusts client-supplied product data. |
| **"Sales inbox"** | A configurable address (`SALES_INBOX`). Locally it's Mailpit, so the reviewer can see the email without any account. | The brief forbids paid services and reviewer accounts. |
| Currency | AUD for display (`CURRENCY` config). Fake Store prices are unit-less. | Officeworks is Australian. Real pricing comes with the real data source. |
| Look and feel | Plain, accessible styling. All visual choices are CSS tokens in `styles.css`. | The creative work is still in progress, so the theme should be easy to swap. |

## Dropped or simplified

- **No pagination or sorting on search and category pages.** Fake Store has 20 products. The API response shape (`{ products: [...] }`) leaves room to add `page`/`cursor` without breaking clients.
- **Search is done in our backend, in memory.** Fake Store has no search endpoint. This is behind the `ProductSource` port, so a real source with server-side search (or OpenSearch) would push the query down instead.
- **No persistence of enquiries.** The AC only requires the email. In production I'd store each enquiry before emailing (outbox pattern) so a mail outage doesn't lose leads.
- **Anti-spam is basic:** a per-IP rate limit plus a honeypot field. No CAPTCHA, because that needs a third-party account.
- **No auth or admin UI** for choosing featured products. Config is enough for the PoC.
- **No mobile app.** I chose web (see README).

## How the design grows beyond the PoC

The brief says the **data source, look and feel, and email provider will all change**. Each one has one place to change:

- **Data source:** `ProductSource` port (`backend/src/catalogue/types.ts`). Fake Store is one adapter that maps its shape into *our* domain model and validates it with zod. A new source (commerce platform, PIM, database) is a new adapter plus one line in `container.ts`. Routes, services and the client don't change. Tests already run the whole API against an in-memory source, which shows the boundary holds.
- **Email provider:** `EmailProvider` port. SMTP covers Mailpit locally and Amazon SES (SMTP interface) in AWS with only config. An SES-API or SendGrid adapter is about 20 lines.
- **Look and feel:** the client is split into an API layer, pages and components, and styling is token-based CSS. The creative team's design system can replace components without touching data fetching.
- **Our own API contract:** the client depends on our `/api` shapes, not Fake Store's (e.g. we expose `category.slug` + `name` and `rating.average`/`count`), so upstream changes stop at the adapter.
- **Config:** env-driven and validated at startup (fail fast). Compatible with ECS task definitions, SSM Parameter Store or Secrets Manager.
- **AWS path:** the backend is a stateless container (ECS/Fargate or App Runner) and the frontend is static (S3 + CloudFront). The in-memory cache would move to ElastiCache when running more than one instance.

## Trade-offs I'd call out

- **In-memory cache (5 min TTL)** keeps the PoC fast and shields Fake Store from repeated calls, but each instance has its own copy. That's fine for one container; use Redis when scaling out.
- **Express 4** rather than Fastify or Nest: the most familiar and least magic option for a PoC. The routing layer is thin, so moving later would be cheap.
- **A hand-rolled `useAsync` hook** instead of TanStack Query: one fewer dependency for 4 GET calls. It handles out-of-order responses. I'd switch to TanStack Query once caching or retries matter.

## Next, with another day

1. Persist enquiries (DB plus an outbox/queue) and send a confirmation email to the customer.
2. Pagination and sorting, then a real search index once the catalogue grows.
3. A Playwright end-to-end test of the enquiry flow against docker compose (asserting via Mailpit's API).
4. CI: GitHub Actions running typecheck, tests and the Docker builds on every PR.
5. Observability: structured JSON logs with request IDs, and metrics on upstream latency and errors.
6. A merchandising admin, or CMS integration, for featured products.
7. Infrastructure as code (CDK) for ECS/Fargate + CloudFront + SES.

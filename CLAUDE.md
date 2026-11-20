# Agent instructions (Claude Code)

Context for AI coding agents working in this repo. Keep it current. It's an input to every agent run.

## What this is
Product catalogue PoC: React + TypeScript client (`frontend/`), Node.js + TypeScript Express API (`backend/`), npm workspaces. Product data comes from the Fake Store API **through the backend only**.

## Architecture rules (do not break)
- The client must never call the product source directly. All data goes through `/api`.
- Business logic lives in services (`CatalogueService`, `EnquiryService`). They depend on ports (`ProductSource`, `EmailProvider`), never on Fake Store, nodemailer or HTTP.
- Upstream shapes are mapped to our domain types in the adapter (`fakeStoreSource.ts`) and validated with zod. Don't leak upstream field names (e.g. `rate`, `image`) past the adapter.
- Concrete adapters are chosen only in `backend/src/container.ts`.
- All config comes from env vars validated in `backend/src/config/config.ts`. Never hard-code secrets. Update `.env.example` when adding config.
- The frontend talks HTTP only from `frontend/src/api/client.ts`. Pages fetch data only through the TanStack Query hooks in `frontend/src/api/queries.ts`, never with `useEffect` + `fetch`. That avoids duplicate requests under StrictMode and gives caching.

## Coding standards
- TypeScript strict mode, no `any`. ESM with `.js` import suffixes in the backend.
- Validate every external input (request bodies, query strings, upstream payloads) with zod on the server.
- Errors: throw `NotFoundError` / `UpstreamError`. `http/app.ts` maps them to 404 / 502. Never leak stack traces or upstream details to clients.
- User input that goes into email must not be able to inject headers (strip CR/LF).
- Keep changes small and focused. Follow the existing patterns before adding new ones.

## Testing
- `npm test` must pass before committing. Add or adjust tests with every behaviour change.
- Backend: Vitest + Supertest against `createApp` with `InMemorySource` and `RecordingEmailProvider` (`backend/test/fixtures.ts`). No network in tests.
- Frontend: Vitest + Testing Library. Mock `api` from `src/api/client`. Query by role/label, not CSS classes.

## Don'ts
- Don't add paid services or anything a reviewer needs an account for.
- Don't modify `package-lock.json` by hand.
- Don't commit `.env` files.
